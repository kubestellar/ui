import { useState } from 'react';
import ClustersTable from '../components/ClustersTable';
import LoadingFallback from '../components/LoadingFallback';
import { useClusterQueries } from '../hooks/queries/useClusterQueries';

const ITS = () => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const { useClusters } = useClusterQueries();
  
  const { 
    data, 
    isLoading, 
    isError, 
    error 
  } = useClusters(currentPage);

  const handleFetchCluster = (page: number) => {
    setCurrentPage(page);
  };

  if (isLoading) return (
    <div className="w-full max-w-7xl mx-auto p-4">
      <LoadingFallback message="Loading managed clusters..." size="medium" />
    </div>
  );

  if (isError) return (
    <div className="w-full max-w-7xl mx-auto p-4">
      <div className="bg-base-100 shadow-xl rounded-lg p-8 text-center">
        <div className="text-red-600 dark:text-red-400 mb-4">
          <svg 
            className="w-16 h-16 mx-auto mb-4" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
            />
          </svg>
          <p className="text-lg font-semibold">
            {error instanceof Error ? error.message : 'Failed to load managed clusters'}
          </p>
        </div>
        <button 
          onClick={() => handleFetchCluster(currentPage)} 
          className="px-6 py-2 bg-primary rounded-md text-white hover:bg-primary/90 transition-colors duration-200 flex items-center gap-2 mx-auto"
        >
          <svg 
            className="w-4 h-4" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
            />
          </svg>
          Retry
        </button>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-7xl mx-auto p-4">
      <div className="bg-base-100 shadow-xl rounded-lg overflow-hidden">
        <div className="p-6 border-b border-base-200">
          <h1 className="text-2xl font-bold flex items-center justify-center gap-3">
            <span className="text-primary">Managed Clusters</span>
            <span className="px-3 py-1 bg-primary/10 rounded-full text-sm">
              {data?.itsData.length || 0}
            </span>
          </h1>
        </div>
        
        <div className="p-4">
          <ClustersTable
            clusters={data?.itsData || []}
            currentPage={currentPage}
            totalPages={data?.totalPages || 1}
            onPageChange={handleFetchCluster}
          />
        </div>
      </div>
    </div>
  );
};

export default ITS;