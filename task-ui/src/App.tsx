import React, { useState, useEffect, useCallback } from 'react';
import type { Task, TaskInput, CompletionFilter } from './types';
import {
  fetchTasks,
  createTask,
  updateTask,
  deleteTask,
  toggleTaskComplete,
  fetchCategories,
} from './api';
import FilterBar from './components/FilterBar';
import AddTaskForm from './components/AddTaskForm';
import TaskCard from './components/TaskCard';
import EditModal from './components/EditModal';
import ErrorBanner from './components/ErrorBanner';

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [completionFilter, setCompletionFilter] = useState<CompletionFilter>('all');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadCategories = useCallback(async () => {
    try {
      const cats = await fetchCategories();
      setCategories(cats);
    } catch {
      // Non-critical; don't surface category fetch errors separately
    }
  }, []);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params: { category?: string; completed?: boolean } = {};
      if (selectedCategory) params.category = selectedCategory;
      if (completionFilter === 'complete') params.completed = true;
      if (completionFilter === 'incomplete') params.completed = false;
      const data = await fetchTasks(params);
      setTasks(data);
    } catch (err) {
      setError('Failed to load tasks. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, completionFilter]);

  // Initial load
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleAddTask = async (input: TaskInput) => {
    try {
      await createTask(input);
      await Promise.all([loadTasks(), loadCategories()]);
    } catch (err) {
      setError('Failed to create task. Please try again.');
      throw err; // Re-throw so AddTaskForm can reset its submitting state
    }
  };

  const handleToggleComplete = async (id: string, completed: boolean) => {
    try {
      await toggleTaskComplete(id, completed);
      await loadTasks();
    } catch {
      setError('Failed to update task completion. Please try again.');
    }
  };

  const handleEditSave = async (id: string, input: TaskInput) => {
    try {
      await updateTask(id, input);
      setEditingTask(null);
      await Promise.all([loadTasks(), loadCategories()]);
    } catch (err) {
      setError('Failed to update task. Please try again.');
      throw err;
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTask(id);
      await loadTasks();
    } catch {
      setError('Failed to delete task. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-600 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-white tracking-tight">My Tasks</h1>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Error banner */}
        {error && (
          <ErrorBanner message={error} onDismiss={() => setError(null)} />
        )}

        {/* Add Task Form */}
        <AddTaskForm onAdd={handleAddTask} />

        {/* Filter Bar */}
        <FilterBar
          categories={categories}
          selectedCategory={selectedCategory}
          completionFilter={completionFilter}
          onCategoryChange={setSelectedCategory}
          onCompletionChange={setCompletionFilter}
        />

        {/* Task List */}
        {loading ? (
          <div className="text-center py-12 text-gray-500 text-sm">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg font-medium">No tasks found</p>
            <p className="text-sm mt-1">
              {selectedCategory || completionFilter !== 'all'
                ? 'Try adjusting your filters.'
                : 'Add a task above to get started.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggleComplete={handleToggleComplete}
                onEdit={setEditingTask}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>

      {/* Edit Modal */}
      {editingTask && (
        <EditModal
          task={editingTask}
          onSave={handleEditSave}
          onCancel={() => setEditingTask(null)}
        />
      )}
    </div>
  );
};

export default App;
