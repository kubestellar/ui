import { useState, useEffect } from 'react';
import { useClusterQueries } from '../hooks/queries/useClusterQueries';
import ClustersTable from '../components/ClustersTable';
import Header from '../components/Header';
import { useLocation } from 'react-router-dom';

const ITS = () => {
  const { useClusters } = useClusterQueries();
  const [currentPage, setCurrentPage] = useState(1);
  const { data, error, isLoading } = useClusters(currentPage);
  const [openImportDialog, setOpenImportDialog] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Check if the URL has the import=true parameter
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('import') === 'true') {
      setOpenImportDialog(true);
    }
  }, [location.search]);

  if (error)
    return (
      <div className="w-full p-4">
        <div className="rounded-lg bg-base-100 p-8 text-center shadow-xl">
          <div className="mb-4 text-red-600 dark:text-red-400">
            <svg
              className="mx-auto mb-4 h-16 w-16"
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
              {error.message || 'Failed to load managed clusters. Please try again later.'}
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mx-auto flex items-center gap-2 rounded-md bg-primary px-6 py-2 text-white transition-colors duration-200 hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );

  const clusters = data?.clusters || [];
  const totalPages = Math.ceil((data?.count || 0) / 10);

  const formattedClusters = clusters.map(cluster => ({
    ...cluster,
    context: cluster.context || 'its1',
  }));

  return (
    <div className="w-full p-4">
      <Header isLoading={isLoading} />
      <div className="overflow-hidden rounded-lg bg-base-100 shadow-xl">
        <div className="p-4">
          <ClustersTable
            clusters={formattedClusters}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={page => setCurrentPage(page)}
            isLoading={isLoading}
            initialShowCreateOptions={openImportDialog}
            initialActiveOption="kubeconfig"
          />
        </div>
      </div>
    </div>
  );
};

export default ITS;
