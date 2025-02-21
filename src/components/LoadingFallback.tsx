import React from 'react';

interface LoadingFallbackProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
}

const LoadingFallback: React.FC<LoadingFallbackProps> = ({ 
  message = 'Loading...', 
  size = 'medium' 
}) => {
  const spinnerSizes = {
    small: 'h-8 w-8',
    medium: 'h-12 w-12',
    large: 'h-16 w-16'
  };

  return (
    <div 
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center min-h-[200px] gap-4"
    >
      <div 
        className={`animate-spin rounded-full border-t-2 border-b-2 border-primary ${spinnerSizes[size]}`}
        aria-hidden="true"
      />
      {message && (
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {message}
        </p>
      )}
      <span className="sr-only">Loading content...</span>
    </div>
  );
};

export default LoadingFallback; 