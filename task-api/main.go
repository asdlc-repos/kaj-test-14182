package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	_ "github.com/mattn/go-sqlite3"
)

// Task represents a task in the system.
type Task struct {
	ID        string  `json:"id"`
	Title     string  `json:"title"`
	Completed bool    `json:"completed"`
	DueDate   *string `json:"dueDate"`
	Category  *string `json:"category"`
	CreatedAt string  `json:"createdAt"`
	UpdatedAt string  `json:"updatedAt"`
}

// TaskInput is the request body for creating/updating a task.
type TaskInput struct {
	Title    string  `json:"title"`
	DueDate  *string `json:"dueDate"`
	Category *string `json:"category"`
}

// CompleteInput is the request body for toggling task completion.
type CompleteInput struct {
	Completed bool `json:"completed"`
}

var db *sql.DB

func main() {
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "/data/tasks.db"
	}
	port := os.Getenv("PORT")
	if port == "" {
		port = "9090"
	}

	// Ensure the data directory exists.
	if err := os.MkdirAll(strings.TrimSuffix(dbPath, "/tasks.db"), 0755); err != nil {
		// Best effort; SQLite will error if the path is invalid.
		_ = err
	}

	var err error
	db, err = sql.Open("sqlite3", dbPath+"?_journal_mode=WAL&_busy_timeout=5000")
	if err != nil {
		log.Fatalf("Failed to open database: %v", err)
	}
	defer db.Close()

	// Single connection to avoid "database is locked" errors.
	db.SetMaxOpenConns(1)

	if err := migrate(); err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/health", handleHealth)
	mux.HandleFunc("/tasks", handleTasks)
	mux.HandleFunc("/tasks/", handleTaskByID)
	mux.HandleFunc("/categories", handleCategories)

	handler := corsMiddleware(mux)

	log.Printf("task-api listening on :%s", port)
	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}

// migrate creates the tasks table if it does not exist.
func migrate() error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS tasks (
			id TEXT PRIMARY KEY,
			title TEXT NOT NULL,
			completed INTEGER NOT NULL DEFAULT 0,
			due_date TEXT,
			category TEXT,
			created_at DATETIME NOT NULL,
			updated_at DATETIME NOT NULL
		);
	`)
	return err
}

// corsMiddleware adds CORS headers and handles OPTIONS preflight requests.
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// writeJSON writes a JSON response with the given status code.
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// writeError writes a JSON error response.
func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

// now returns the current UTC time formatted as ISO 8601.
func nowUTC() string {
	return time.Now().UTC().Format(time.RFC3339)
}

// scanTask scans a row into a Task struct.
func scanTask(row *sql.Row) (*Task, error) {
	var t Task
	var completed int
	var dueDate sql.NullString
	var category sql.NullString

	if err := row.Scan(&t.ID, &t.Title, &completed, &dueDate, &category, &t.CreatedAt, &t.UpdatedAt); err != nil {
		return nil, err
	}
	t.Completed = completed == 1
	if dueDate.Valid && dueDate.String != "" {
		t.DueDate = &dueDate.String
	}
	if category.Valid && category.String != "" {
		t.Category = &category.String
	}
	return &t, nil
}

// scanTaskFromRows scans a row from sql.Rows into a Task struct.
func scanTaskFromRows(rows *sql.Rows) (*Task, error) {
	var t Task
	var completed int
	var dueDate sql.NullString
	var category sql.NullString

	if err := rows.Scan(&t.ID, &t.Title, &completed, &dueDate, &category, &t.CreatedAt, &t.UpdatedAt); err != nil {
		return nil, err
	}
	t.Completed = completed == 1
	if dueDate.Valid && dueDate.String != "" {
		t.DueDate = &dueDate.String
	}
	if category.Valid && category.String != "" {
		t.Category = &category.String
	}
	return &t, nil
}

// --- Handlers ---

// handleHealth returns {"status":"ok"}.
func handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// handleTasks dispatches GET /tasks and POST /tasks.
func handleTasks(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		listTasks(w, r)
	case http.MethodPost:
		createTask(w, r)
	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

// handleTaskByID dispatches requests to /tasks/{id} and /tasks/{id}/complete.
func handleTaskByID(w http.ResponseWriter, r *http.Request) {
	// Strip the "/tasks/" prefix.
	path := strings.TrimPrefix(r.URL.Path, "/tasks/")
	if path == "" {
		writeError(w, http.StatusNotFound, "not found")
		return
	}

	if strings.HasSuffix(path, "/complete") {
		id := strings.TrimSuffix(path, "/complete")
		if r.Method == http.MethodPatch {
			toggleComplete(w, r, id)
		} else {
			writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		}
		return
	}

	// No further slashes — it's /tasks/{id}.
	if strings.Contains(path, "/") {
		writeError(w, http.StatusNotFound, "not found")
		return
	}

	id := path
	switch r.Method {
	case http.MethodGet:
		getTask(w, r, id)
	case http.MethodPut:
		updateTask(w, r, id)
	case http.MethodDelete:
		deleteTask(w, r, id)
	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

// handleCategories returns distinct sorted categories.
func handleCategories(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	rows, err := db.Query(`SELECT DISTINCT category FROM tasks WHERE category IS NOT NULL AND category != '' ORDER BY category ASC`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list categories")
		return
	}
	defer rows.Close()

	categories := []string{}
	for rows.Next() {
		var c string
		if err := rows.Scan(&c); err != nil {
			continue
		}
		categories = append(categories, c)
	}
	sort.Strings(categories)
	writeJSON(w, http.StatusOK, categories)
}

// listTasks handles GET /tasks with optional ?category= and ?completed= filters.
func listTasks(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()

	query := `SELECT id, title, completed, due_date, category, created_at, updated_at FROM tasks WHERE 1=1`
	args := []any{}

	if cat := q.Get("category"); cat != "" {
		query += " AND category = ?"
		args = append(args, cat)
	}
	if comp := q.Get("completed"); comp != "" {
		switch comp {
		case "true", "1":
			query += " AND completed = 1"
		case "false", "0":
			query += " AND completed = 0"
		default:
			writeError(w, http.StatusBadRequest, "invalid value for 'completed' filter")
			return
		}
	}
	query += " ORDER BY created_at ASC"

	rows, err := db.Query(query, args...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list tasks")
		return
	}
	defer rows.Close()

	tasks := []Task{}
	for rows.Next() {
		t, err := scanTaskFromRows(rows)
		if err != nil {
			continue
		}
		tasks = append(tasks, *t)
	}
	writeJSON(w, http.StatusOK, tasks)
}

// createTask handles POST /tasks.
func createTask(w http.ResponseWriter, r *http.Request) {
	var input TaskInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}

	title := strings.TrimSpace(input.Title)
	if title == "" {
		writeError(w, http.StatusBadRequest, "title is required")
		return
	}
	if len(title) > 255 {
		writeError(w, http.StatusBadRequest, "title must be 255 characters or fewer")
		return
	}

	id := uuid.New().String()
	now := nowUTC()

	var dueDateVal interface{} = nil
	if input.DueDate != nil && *input.DueDate != "" {
		dueDateVal = *input.DueDate
	}
	var categoryVal interface{} = nil
	if input.Category != nil && *input.Category != "" {
		categoryVal = *input.Category
	}

	_, err := db.Exec(
		`INSERT INTO tasks (id, title, completed, due_date, category, created_at, updated_at) VALUES (?, ?, 0, ?, ?, ?, ?)`,
		id, title, dueDateVal, categoryVal, now, now,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create task")
		return
	}

	row := db.QueryRow(`SELECT id, title, completed, due_date, category, created_at, updated_at FROM tasks WHERE id = ?`, id)
	task, err := scanTask(row)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to retrieve created task")
		return
	}
	writeJSON(w, http.StatusCreated, task)
}

// getTask handles GET /tasks/{id}.
func getTask(w http.ResponseWriter, r *http.Request, id string) {
	row := db.QueryRow(`SELECT id, title, completed, due_date, category, created_at, updated_at FROM tasks WHERE id = ?`, id)
	task, err := scanTask(row)
	if err == sql.ErrNoRows {
		writeError(w, http.StatusNotFound, "task not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to retrieve task")
		return
	}
	writeJSON(w, http.StatusOK, task)
}

// updateTask handles PUT /tasks/{id}.
func updateTask(w http.ResponseWriter, r *http.Request, id string) {
	// Check existence first.
	var exists int
	err := db.QueryRow(`SELECT 1 FROM tasks WHERE id = ?`, id).Scan(&exists)
	if err == sql.ErrNoRows {
		writeError(w, http.StatusNotFound, "task not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to retrieve task")
		return
	}

	var input TaskInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}

	title := strings.TrimSpace(input.Title)
	if title == "" {
		writeError(w, http.StatusBadRequest, "title is required")
		return
	}
	if len(title) > 255 {
		writeError(w, http.StatusBadRequest, "title must be 255 characters or fewer")
		return
	}

	now := nowUTC()
	var dueDateVal interface{} = nil
	if input.DueDate != nil && *input.DueDate != "" {
		dueDateVal = *input.DueDate
	}
	var categoryVal interface{} = nil
	if input.Category != nil && *input.Category != "" {
		categoryVal = *input.Category
	}

	_, err = db.Exec(
		`UPDATE tasks SET title = ?, due_date = ?, category = ?, updated_at = ? WHERE id = ?`,
		title, dueDateVal, categoryVal, now, id,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update task")
		return
	}

	row := db.QueryRow(`SELECT id, title, completed, due_date, category, created_at, updated_at FROM tasks WHERE id = ?`, id)
	task, err := scanTask(row)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to retrieve updated task")
		return
	}
	writeJSON(w, http.StatusOK, task)
}

// deleteTask handles DELETE /tasks/{id}.
func deleteTask(w http.ResponseWriter, r *http.Request, id string) {
	result, err := db.Exec(`DELETE FROM tasks WHERE id = ?`, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete task")
		return
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		writeError(w, http.StatusNotFound, "task not found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// toggleComplete handles PATCH /tasks/{id}/complete.
func toggleComplete(w http.ResponseWriter, r *http.Request, id string) {
	// Check existence.
	var exists int
	err := db.QueryRow(`SELECT 1 FROM tasks WHERE id = ?`, id).Scan(&exists)
	if err == sql.ErrNoRows {
		writeError(w, http.StatusNotFound, "task not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to retrieve task")
		return
	}

	var input CompleteInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}

	completedVal := 0
	if input.Completed {
		completedVal = 1
	}

	now := nowUTC()
	_, err = db.Exec(`UPDATE tasks SET completed = ?, updated_at = ? WHERE id = ?`, completedVal, now, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update task")
		return
	}

	row := db.QueryRow(`SELECT id, title, completed, due_date, category, created_at, updated_at FROM tasks WHERE id = ?`, id)
	task, err := scanTask(row)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to retrieve updated task")
		return
	}
	writeJSON(w, http.StatusOK, task)
}
