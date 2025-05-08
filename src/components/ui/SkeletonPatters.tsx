import React from 'react';
import Skeleton from './Skeleton';

/**
 * Card skeleton for showing loading state of card components
 */
export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`flex flex-col rounded-md overflow-hidden border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Card header/image area */}
      <Skeleton 
        variant="rectangular" 
        className="w-full" 
        height={140} 
      />
      
      <div className="p-4 space-y-3">
        {/* Title */}
        <Skeleton 
          variant="text" 
          className="w-3/4" 
          height={20} 
        />
        
        {/* Description lines */}
        <Skeleton 
          variant="text" 
          className="w-full" 
          height={14} 
        />
        <Skeleton 
          variant="text" 
          className="w-5/6" 
          height={14} 
        />
        
        {/* Action row */}
        <div className="flex justify-between items-center pt-2">
          <Skeleton 
            variant="text" 
            className="w-1/4" 
            height={14} 
          />
          <Skeleton 
            variant="circular" 
            width={32} 
            height={32} 
          />
        </div>
      </div>
    </div>
  );
};

/**
 * List item skeleton for showing loading state of list items
 */
export const ListItemSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`flex items-center p-3 border-b border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Avatar or icon */}
      <Skeleton 
        variant="circular" 
        width={40} 
        height={40} 
        className="flex-shrink-0" 
      />
      
      {/* Content */}
      <div className="ml-3 flex-grow space-y-2">
        <Skeleton 
          variant="text" 
          className="w-1/2" 
          height={16} 
        />
        <Skeleton 
          variant="text" 
          className="w-3/4" 
          height={14} 
        />
      </div>
      
      {/* Action */}
      <Skeleton 
        variant="rectangular" 
        className="rounded-md flex-shrink-0" 
        width={64} 
        height={24} 
      />
    </div>
  );
};

/**
 * Table row skeleton for showing loading state of table rows
 */
export const TableRowSkeleton: React.FC<{ 
  columns?: number; 
  className?: string 
}> = ({ 
  columns = 3, 
  className = '' 
}) => {
  return (
    <div className={`flex border-b border-gray-200 dark:border-gray-700 py-3 ${className}`}>
      {Array(columns).fill(null).map((_, index) => (
        <div key={index} className="flex-1 px-2">
          <Skeleton 
            variant="text" 
            className="w-full" 
            height={16} 
          />
        </div>
      ))}
    </div>
  );
};

/**
 * Detail panel skeleton for showing loading state of detail panels
 */
export const DetailPanelSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`p-4 space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center mb-6">
        <Skeleton 
          variant="circular" 
          width={64} 
          height={64} 
          className="flex-shrink-0" 
        />
        <div className="ml-4 flex-grow space-y-2">
          <Skeleton 
            variant="text" 
            className="w-1/2" 
            height={20} 
          />
          <Skeleton 
            variant="text" 
            className="w-3/4" 
            height={16} 
          />
        </div>
      </div>
      
      {/* Content sections */}
      <div className="space-y-6">
        {/* Section 1 */}
        <div className="space-y-2">
          <Skeleton 
            variant="text" 
            className="w-1/4" 
            height={18} 
          />
          <Skeleton 
            variant="rectangular" 
            className="w-full rounded-md" 
            height={80} 
          />
        </div>
        
        {/* Section 2 */}
        <div className="space-y-2">
          <Skeleton 
            variant="text" 
            className="w-1/3" 
            height={18} 
          />
          <div className="space-y-2">
            <Skeleton variant="text" className="w-full" height={14} />
            <Skeleton variant="text" className="w-full" height={14} />
            <Skeleton variant="text" className="w-5/6" height={14} />
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex justify-end space-x-2 pt-4">
          <Skeleton 
            variant="rectangular" 
            className="rounded-md" 
            width={80} 
            height={32} 
          />
          <Skeleton 
            variant="rectangular" 
            className="rounded-md" 
            width={80} 
            height={32} 
          />
        </div>
      </div>
    </div>
  );
};

/**
 * Grid of card skeletons
 */
export const CardGridSkeleton: React.FC<{
  count?: number;
  columns?: number;
  className?: string;
}> = ({ count = 6, columns = 3, className = '' }) => {
  return (
    <div 
      className={`grid gap-4 ${className}`} 
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {Array(count).fill(null).map((_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  );
};

/**
 * List of skeleton items
 */
export const ListSkeleton: React.FC<{
  count?: number;
  className?: string;
}> = ({ count = 5, className = '' }) => {
  return (
    <div className={`divide-y divide-gray-200 dark:divide-gray-700 ${className}`}>
      {Array(count).fill(null).map((_, index) => (
        <ListItemSkeleton key={index} />
      ))}
    </div>
  );
};

/**
 * Table skeleton with header and rows
 */
export const TableSkeleton: React.FC<{
  rows?: number;
  columns?: number;
  className?: string;
}> = ({ rows = 5, columns = 4, className = '' }) => {
  return (
    <div className={`border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden ${className}`}>
      {/* Table header */}
      <div className="bg-gray-50 dark:bg-gray-800 py-3 px-4 flex">
        {Array(columns).fill(null).map((_, index) => (
          <div key={index} className="flex-1 px-2">
            <Skeleton 
              variant="text" 
              className="w-3/4" 
              height={18} 
            />
          </div>
        ))}
      </div>
      
      {/* Table rows */}
      <div>
        {Array(rows).fill(null).map((_, index) => (
          <TableRowSkeleton 
            key={index} 
            columns={columns} 
            className="px-4" 
          />
        ))}
      </div>
    </div>
  );
};