import { useK8sQueries } from '../hooks/queries/useK8sQueries';
import ClusterSkeleton from './ui/ClusterSkeleton.tsx';

const K8sInfo = () => {
  const { useK8sInfo } = useK8sQueries();
  const { data, error, isLoading } = useK8sInfo();

  if (isLoading) return <ClusterSkeleton />;
  if (error) return <div>Error loading contexts: {error.message}</div>;

  const contexts = data?.contexts.filter(ctx => ctx.name.endsWith('-kubeflex')) || [];
  const clusters =
    data?.clusters.filter(cluster => contexts.some(ctx => ctx.cluster === cluster)) || [];
  const currentContext = data?.currentContext || '';

  return (
    <div className="w-full max-w-full p-4">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Clusters Card */}
        <div className="card bg-base-100 p-6 shadow-xl transition-shadow duration-300 hover:shadow-2xl">
          <h2 className="mb-6 flex items-center text-2xl font-bold">
            <span className="text-kubeprimary">Kubernetes Clusters</span>
            <span className="ml-2 rounded-full bg-primary/10 px-3 py-1 text-sm">
              {clusters.length}
            </span>
          </h2>
          <ul className="space-y-2">
            {clusters.map(cluster => (
              <li
                key={cluster}
                className="cursor-pointer rounded-lg bg-base-200 p-3 transition-colors duration-200 hover:bg-base-300"
              >
                {cluster}
              </li>
            ))}
          </ul>
        </div>

        {/* Contexts Card */}
        <div className="card bg-base-100 p-6 shadow-xl transition-shadow duration-300 hover:shadow-2xl">
          <h2 className="mb-6 flex items-center text-2xl font-bold">
            <span className="text-[#4498FF]">Kubernetes Contexts</span>
            <span className="ml-2 rounded-full bg-primary/10 px-3 py-1 text-sm">
              {contexts.length}
            </span>
          </h2>
          <ul className="space-y-2">
            {contexts.map(ctx => (
              <li
                key={ctx.name}
                className="rounded-lg bg-base-200 p-3 transition-colors duration-200 hover:bg-base-300"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{ctx.name}</span>
                  {ctx.name === currentContext && (
                    <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-800 dark:bg-green-800 dark:text-green-100">
                      Current
                    </span>
                  )}
                </div>
                <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Cluster: {ctx.cluster}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Current Context Card */}
        <div className="card bg-base-100 p-6 shadow-xl transition-shadow duration-300 hover:shadow-2xl">
          <h2 className="mb-6 text-2xl font-bold text-kubeprimary">Current Context</h2>
          <div className="rounded-lg border-l-4 border-kubeprimary bg-base-200 p-4">
            <p className="break-all font-mono text-sm">{currentContext}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default K8sInfo;
