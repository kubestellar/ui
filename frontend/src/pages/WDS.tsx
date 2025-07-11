import { useWDSQueries } from '../hooks/queries/useWDSQueries';
import TreeView from '../components/TreeViewComponent'; // Replace with your TreeView component path
// import useTheme from "../stores/themeStore";
import WDSSkeleton from '../components/ui/WDSSkeleton';

const WDS = () => {
  // const theme = useTheme((state) => state.theme);

  const { useWorkloads } = useWDSQueries();
  const { isLoading, isError } = useWorkloads();

  if (isLoading) return <WDSSkeleton />;
  if (isError) {
    return (
      <div className="p-4 text-center text-red-600 dark:text-red-400">
        <p>Failed to fetch WDS workloads. Please try again.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-white transition-colors duration-200 hover:bg-primary/90"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`w-full`}>
      <TreeView />
    </div>
  );
};

export default WDS;
