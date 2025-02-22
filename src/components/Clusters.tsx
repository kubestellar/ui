import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import LoadingFallback from './LoadingFallback';

interface ContextInfo {
  name: string;
  cluster: string;
}

const K8sInfo = () => {
  const [contexts, setContexts] = useState<ContextInfo[]>([]);
  const [clusters, setClusters] = useState<string[]>([]);
  const [currentContext, setCurrentContext] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Only show kubeflex contexts
        const response = await api.get('/api/clusters'); 
        const kubeflexContexts = response.data.contexts.filter(
          (ctx: ContextInfo) => ctx.name.endsWith("-kubeflex")
        );
        // Get clusters associated with kubeflex contexts
        const kubeflexClusters = response.data.clusters.filter(
          (cluster: string) =>
            kubeflexContexts.some((ctx: ContextInfo) => ctx.cluster === cluster)
        );
        setContexts(kubeflexContexts);
        setClusters(kubeflexClusters);
        setCurrentContext(response.data.currentContext);
      } catch (error) {
        console.error('Error fetching Kubernetes information:', error);
        setError('Failed to load cluster information. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <LoadingFallback message="Loading cluster information..." size="medium" />;
  if (error) return (
    <div className="text-center p-4 text-red-600 dark:text-red-400">
      <p>{error}</p>
      <button 
        onClick={() => window.location.reload()} 
        className="mt-4 px-4 py-2 bg-primary rounded-md text-white hover:bg-primary/90 transition-colors duration-200"
      >
        Retry
      </button>
    </div>
  );

  return (
    <div className="w-full max-w-full p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Clusters Card */}
        <div className="card bg-base-100 shadow-xl p-6 hover:shadow-2xl transition-shadow duration-300">
          <h2 className="text-2xl font-bold mb-6 flex items-center">
            <span className="text-primary">Kubernetes Clusters</span>
            <span className="ml-2 px-3 py-1 bg-primary/10 rounded-full text-sm">
              {clusters?.length}
            </span>
          </h2>
          <ul className="space-y-2">
            {clusters && clusters.map(cluster => (
              <li 
                key={cluster} 
                className="p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors duration-200 cursor-pointer"
              >
                {cluster}
              </li>
            ))}
          </ul>
        </div>

        {/* Contexts Card */}
        <div className="card bg-base-100 shadow-xl p-6 hover:shadow-2xl transition-shadow duration-300">
          <h2 className="text-2xl font-bold mb-6 flex items-center">
            <span className="text-primary">Kubernetes Contexts</span>
            <span className="ml-2 px-3 py-1 bg-primary/10 rounded-full text-sm">
              {contexts?.length}
            </span>
          </h2>
          <ul className="space-y-2">
            {contexts.map((ctx) => (
              <li 
                key={ctx.name} 
                className="p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors duration-200"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{ctx.name}</span>
                  {ctx.name === currentContext && (
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 rounded-full">
                      Current
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Cluster: {ctx.cluster}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Current Context Card */}
        <div className="card bg-base-100 shadow-xl p-6 hover:shadow-2xl transition-shadow duration-300">
          <h2 className="text-2xl font-bold mb-6 text-primary">Current Context</h2>
          <div className="p-4 bg-base-200 rounded-lg border-l-4 border-primary">
            <p className="font-mono text-sm break-all">{currentContext}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default K8sInfo;
