interface Workload {
    name: string;
    kind: string;
    namespace: string;
    creationTime: string;
  }
  
  interface Props {
    title: string;
    workloads: Workload[];
    baseUrl: string;
  }
  
  const DeploymentTable = ({ title, workloads, baseUrl }: Props) => {
    const handleOpenInfo = (workload: Workload) => {
      if (!baseUrl) {
        console.error("Base URL is not provided");
        return;
      }
      const url = `${baseUrl}/api/wds/${encodeURIComponent(workload.name)}?namespace=${encodeURIComponent(workload.namespace || 'default')}`;
      window.open(url, "_blank", "noopener,noreferrer");
    };
  
    return (
      <div className="mt-8 bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-700 border-b border-gray-600">
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Kind</th>
              <th className="p-2 text-left">Namespace</th>
              <th className="p-2 text-left">Created</th>
            </tr>
          </thead>
          <tbody>
            {workloads.map((workload, index) => (
              <tr key={index} className="bg-gray-800 hover:bg-gray-700">
                <td
                  className="p-2 text-blue-400 underline cursor-pointer"
                  onClick={() => handleOpenInfo(workload)}
                >
                  {workload.name}
                </td>
                <td className="p-2">{workload.kind}</td>
                <td className="p-2">{workload.namespace}</td>
                <td className="p-2">{new Date(workload.creationTime).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };
  
  export default DeploymentTable;
  