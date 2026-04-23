import React from 'react';
import type { CompletionFilter } from '../types';

interface FilterBarProps {
  categories: string[];
  selectedCategory: string;
  completionFilter: CompletionFilter;
  onCategoryChange: (category: string) => void;
  onCompletionChange: (filter: CompletionFilter) => void;
}

const FilterBar: React.FC<FilterBarProps> = ({
  categories,
  selectedCategory,
  completionFilter,
  onCategoryChange,
  onCompletionChange,
}) => {
  const completionOptions: { label: string; value: CompletionFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Incomplete', value: 'incomplete' },
    { label: 'Complete', value: 'complete' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      <div>
        <label htmlFor="category-filter" className="text-sm font-medium text-gray-600 mr-2">
          Category:
        </label>
        <select
          id="category-filter"
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1">
        <span className="text-sm font-medium text-gray-600 mr-1">Status:</span>
        {completionOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onCompletionChange(opt.value)}
            className={`px-3 py-1.5 text-sm rounded-md border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              completionFilter === opt.value
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default FilterBar;
