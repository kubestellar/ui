import { useWDSQueries } from "../hooks/queries/useWDSQueries";
import TreeView from "../components/TreeViewComponent"; // Replace with your TreeView component path
// import useTheme from "../stores/themeStore";
import LoadingFallback from "../components/LoadingFallback";

const WDS = () => {
  // const theme = useTheme((state) => state.theme);
  
  const { useWorkloads } = useWDSQueries();
  const { isLoading, isError } = useWorkloads();


  if (isLoading) return <LoadingFallback message="Loading WDS Workloads..." size="medium" />;
  if (isError) {
    return (
      <div className="text-center p-4 text-red-600 dark:text-red-400">
        <p>Failed to fetch WDS workloads. Please try again.</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-primary rounded-md text-white hover:bg-primary/90 transition-colors duration-200"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`w-full p-4`}>
        <TreeView />
    </div>
  );
};

export default WDS;