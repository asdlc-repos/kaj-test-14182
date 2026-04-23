import React from 'react';
import type { Task } from '../types';

interface TaskCardProps {
  task: Task;
  onToggleComplete: (id: string, completed: boolean) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  // Compare date strings directly (YYYY-MM-DD) to avoid timezone issues.
  // Get local today as YYYY-MM-DD.
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const today = `${year}-${month}-${day}`;
  return dueDate < today;
}

function formatDate(dateStr: string): string {
  // Display date in local locale using date-only parsing (no timezone shift).
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onToggleComplete, onEdit, onDelete }) => {
  const overdue = !task.completed && isOverdue(task.dueDate);

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${task.title}"?`)) {
      onDelete(task.id);
    }
  };

  return (
    <div className="flex items-start gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm hover:shadow-md transition-shadow">
      {/* Completion checkbox */}
      <input
        type="checkbox"
        checked={task.completed}
        onChange={(e) => onToggleComplete(task.id, e.target.checked)}
        className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer flex-shrink-0"
        aria-label={`Mark "${task.title}" as ${task.completed ? 'incomplete' : 'complete'}`}
      />

      {/* Task details */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium break-words ${
            task.completed ? 'line-through text-gray-400' : 'text-gray-800'
          }`}
        >
          {task.title}
        </p>

        <div className="flex flex-wrap items-center gap-2 mt-1">
          {/* Category badge */}
          {task.category && (
            <span className="inline-block bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">
              {task.category}
            </span>
          )}

          {/* Due date */}
          {task.dueDate && (
            <span
              className={`text-xs ${
                overdue ? 'text-red-600 font-semibold' : 'text-gray-500'
              }`}
            >
              {overdue ? '⚠ Overdue: ' : 'Due: '}
              {formatDate(task.dueDate)}
            </span>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => onEdit(task)}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium focus:outline-none focus:underline"
          aria-label={`Edit "${task.title}"`}
        >
          Edit
        </button>
        <button
          onClick={handleDelete}
          className="text-xs text-red-500 hover:text-red-700 font-medium focus:outline-none focus:underline"
          aria-label={`Delete "${task.title}"`}
        >
          Delete
        </button>
      </div>
    </div>
  );
};

export default TaskCard;
