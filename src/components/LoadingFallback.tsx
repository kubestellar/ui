import React from 'react';
import { CardSkeleton, ListSkeleton, TableSkeleton, DetailPanelSkeleton } from './ui/SkeletonPatters';

type LoadingVariant = 'spinner' | 'card' | 'list' | 'table' | 'detail';

interface LoadingFallbackProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: LoadingVariant;
  count?: number;
  columns?: number;
}

/**
 * Enhanced LoadingFallback component that supports both spinner and skeleton loading states
 */
const LoadingFallback: React.FC<LoadingFallbackProps> = ({
  message = 'Loading...',
  size = 'medium',
  variant = 'spinner',
  count = 4,
  columns = 3
}) => {
  const spinnerSizes = {
    small: 'h-8 w-8',
    medium: 'h-12 w-12',
    large: 'h-16 w-16'
  };

  // If using the spinner variant, display the original spinner
  if (variant === 'spinner') {
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
  }

  // Skeleton loading states based on variant
  return (
    <div role="status" aria-live="polite" className="w-full">
      {message && (
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 text-center">
          {message}
        </p>
      )}
      
      {variant === 'card' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(count).fill(null).map((_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      )}
      
      {variant === 'list' && (
        <ListSkeleton count={count} />
      )}
      
      {variant === 'table' && (
        <TableSkeleton rows={count} columns={columns} />
      )}
      
      {variant === 'detail' && (
        <DetailPanelSkeleton />
      )}
      
      <span className="sr-only">Loading content...</span>
    </div>
  );
};

export default LoadingFallback;