import React from 'react';

interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
}

const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onDismiss }) => {
  return (
    <div className="flex items-center justify-between bg-red-100 border border-red-400 text-red-800 px-4 py-3 rounded mb-4" role="alert">
      <span className="text-sm font-medium">{message}</span>
      <button
        onClick={onDismiss}
        className="ml-4 text-red-600 hover:text-red-800 font-bold text-lg leading-none focus:outline-none"
        aria-label="Dismiss error"
      >
        &times;
      </button>
    </div>
  );
};

export default ErrorBanner;
