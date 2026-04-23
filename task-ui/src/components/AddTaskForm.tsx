import React, { useState } from 'react';
import type { TaskInput } from '../types';

interface AddTaskFormProps {
  onAdd: (input: TaskInput) => Promise<void>;
}

const AddTaskForm: React.FC<AddTaskFormProps> = ({ onAdd }) => {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [category, setCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [titleError, setTitleError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setTitleError('Title is required.');
      return;
    }

    setTitleError('');
    setSubmitting(true);
    try {
      await onAdd({
        title: title.trim(),
        dueDate: dueDate || null,
        category: category.trim() || null,
      });
      setTitle('');
      setDueDate('');
      setCategory('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm"
    >
      <h2 className="text-base font-semibold text-gray-800 mb-3">Add New Task</h2>
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[180px]">
          <input
            type="text"
            placeholder="Task title *"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (e.target.value.trim()) setTitleError('');
            }}
            className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              titleError ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={submitting}
          />
          {titleError && (
            <p className="text-red-500 text-xs mt-1">{titleError}</p>
          )}
        </div>
        <div>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={submitting}
            title="Due date (optional)"
          />
        </div>
        <div>
          <input
            type="text"
            placeholder="Category (optional)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={submitting}
          />
        </div>
        <div>
          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {submitting ? 'Adding...' : 'Add Task'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default AddTaskForm;
