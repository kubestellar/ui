import { useState } from 'react';
import { useClusterQueries } from '../hooks/queries/useClusterQueries';
import ClustersTable from '../components/ClustersTable';
import LoadingFallback from '../components/LoadingFallback';
import Header from '../components/Header';

const ITS = () => {
  const { useClusters } = useClusterQueries();
  const [currentPage, setCurrentPage] = useState(1);
  const { data, error, isLoading } = useClusters(currentPage);

  if (isLoading) return (
    <div className="w-full max-w-7xl mx-auto p-4">
      <LoadingFallback message="Loading managed clusters..." size="medium" />
    </div>
  );

  if (error) return (
    <div className="w-full p-4">
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
          <p className="text-lg font-semibold">{error.message || 'Failed to load managed clusters. Please try again later.'}</p>
        </div>
        <button 
          onClick={() => window.location.reload()} 
          className="px-6 py-2 bg-primary rounded-md text-white hover:bg-primary/90 transition-colors duration-200 flex items-center gap-2 mx-auto"
        >
          Retry
        </button>
      </div>
    </div>
  );

  const clusters = data?.itsData || [];
  const totalPages = data?.totalPages || 1;

  return (
    <div className="w-full p-4">
      <Header isLoading={isLoading} />
      <div className="bg-base-100 shadow-xl rounded-lg overflow-hidden">        
        <div className="p-4">
          <ClustersTable
            clusters={clusters}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>
      </div>
    </div>
  );
};

export default ITS;