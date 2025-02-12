import { useState, useEffect, useRef } from "react";
import { FaCircle } from "react-icons/fa";
import { FiChevronDown, FiChevronUp, FiMoreVertical } from "react-icons/fi";
import Editor from "@monaco-editor/react";
import axios from "axios"; // Import axios for API calls
import { Info } from "lucide-react"; // Import the info icon from Lucide
import LogModal from "./LogModal";




interface Workload {
  name: string;
  kind: string;
  namespace: string;
  creationTime: string;
  image: string;
  label: string;
}

interface Props {
  title: string;
  workloads: Workload[];
  setSelectedDeployment: (workload: Workload | null) => void;
}

const DeploymentTable = ({ title, workloads, setSelectedDeployment }: Props) => {
     
  const [showDetails, setShowDetails] = useState(true);
  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [editYaml, setEditYaml] = useState(false);
  const [yamlData, setYamlData] = useState<string>("");
  const [selectedLog, setSelectedLog] = useState<{ namespace: string; deployment: string } | null>(null);


  // Scaling State
  const [scaleModalOpen, setScaleModalOpen] = useState(false);
  const [selectedWorkload, setSelectedWorkload] = useState<Workload | null>(null);
  const [replicaCount, setReplicaCount] = useState<number>(1);
  const [desiredReplicas, setDesiredReplicas] = useState<number>(1);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);


  // menu dropdown
  const handleMenuClick = (event: React.MouseEvent, index: number) => {
    event.stopPropagation();
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    
    const menuWidth = menuRef.current?.offsetWidth || 150;
    const menuHeight = menuRef.current?.offsetHeight || 150;
    const bottomSpace = window.innerHeight - rect.bottom;
    let topPosition = rect.bottom + 8; // Default: place below
    let leftPosition = rect.left - 100;
  
    if (bottomSpace < menuHeight) {
      // Not enough space below, place above
      topPosition = rect.top - menuHeight - 8;
    }
  
    // Prevent menu from overflowing off the right edge
    if (rect.left + menuWidth > window.innerWidth) {
      leftPosition = window.innerWidth - menuWidth - 10; // 10px padding
    }
  
    setMenuPosition({ top: topPosition, left: leftPosition });
    setMenuOpen(menuOpen === index ? null : index);
  };
  
  
  // edit .yaml file 
  const handleEditClick = async (workload: Workload) => {
    setMenuOpen(null);
    setSelectedWorkload(workload);

    // Simulate fetching YAML file (replace with real API call)
    const fetchedYaml = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${workload.name}
  namespace: ${workload.namespace}
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ${workload.label}
  template:
    metadata:
      labels:
        app: ${workload.label}
    spec:
      containers:
        - name: ${workload.name}
          image: ${workload.image}
          ports:
            - containerPort: 80`;

    setYamlData(fetchedYaml);
    setEditYaml(true);
  };

    // Handle Scaling
  const handleScaleClick = (workload: Workload) => {
      setMenuOpen(null);
      setSelectedWorkload(workload);
      setScaleModalOpen(true);
      // setReplicaCount(1); // Default replica count
    };
    
    const handleScaleSave = () => {
      if (selectedWorkload) {
        console.log(
          `kubectl scale -n ${selectedWorkload.namespace} deployment ${selectedWorkload.name} --replicas=${desiredReplicas}`
        );
      }
      setScaleModalOpen(false);
    };


    // handel delete button
    const handleDeleteClick = (workload: Workload) => {
      setSelectedWorkload(workload);
      setDeleteModalOpen(true);
      setMenuOpen(null);
    };
  
    const confirmDelete = () => {
      if (selectedWorkload) {
        console.log(`Deleting workload: ${selectedWorkload.name}`);
      }
      setDeleteModalOpen(false);
    };



    
    // save
  const handleSave = () => {
      console.log("Updated YAML:", yamlData);
      setEditYaml(false);
  };


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Function to fetch real-time replica count
const fetchReplicaCount = async (namespace: string, deploymentName: string) => {
  try {
    const response = await axios.get(
      `/apis/apps/v1/namespaces/${namespace}/deployments/${deploymentName}`
    );
    return response.data?.spec?.replicas || 1; // Default to 1 if not available
  } catch (error) {
    console.error("Error fetching replica count:", error);
    return 1; // Fallback in case of an error
  }
};

// Fetch replicas when workload is selected
useEffect(() => {
  if (selectedWorkload) {
    fetchReplicaCount(selectedWorkload.namespace, selectedWorkload.name).then(
      (replicas) => setReplicaCount(replicas)
    );
  }
}, [selectedWorkload]);

  return (
    <div className="mt-8 bg-gray-800 p-6 rounded-lg relative">


      {/* Header Section */}
      <div className="flex items-center justify-between relative mb-8">
        <h2 className="text-xl font-bold">{title}</h2>
        <span className="text-gray-400 font-semibold mr-24">Items: {workloads.length}</span>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="bg-gray-800 p-2 rounded-full border border-transparent hover:border-white"
          >
            {showDetails ? (
              <FiChevronUp className="transition-all duration-200" />
            ) : (
              <FiChevronDown className="transition-all duration-200 hover:scale-90" />
            )}
          </button>
        </div>
      </div>


      {/* Table Section */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border-gray-600">
          <thead className="border-b border-gray-600 w-full">
            <tr className="w-full">
              {showDetails && (
                <>
                  <th className="p-2 text-left border-b border-gray-600">Name</th>
                  <th className="p-2 text-left border-b border-gray-600">Kind</th>
                  <th className="p-2 text-left border-b border-gray-600">Namespace</th>
                  <th className="p-2 text-left border-b border-gray-600">Created</th>
                  <th className="p-2 text-left border-b border-gray-600"></th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {workloads.map((workload, index) => (
              <tr key={index} className="border-b border-gray-600 bg-gray-800 last:border-b-0">
                {showDetails && (
                  <>
                    <td
                      className="p-2 text-blue-400 underline cursor-pointer flex items-center gap-4"
                      onClick={() => setSelectedDeployment(workload)}
                    >
                      <FaCircle className="text-green-500 text-sm" />
                      {workload.name}
                    </td>
                    <td className="p-2">{workload.kind}</td>
                    <td className="p-2">{workload.namespace}</td>
                    <td className="p-2">{new Date(workload.creationTime).toLocaleString()}</td>
                    <td className="p-2 flex justify-end">
                      <button
                        onClick={(e) => handleMenuClick(e, index)}
                        className="p-2 rounded-full bg-gray-800 hover:bg-gray-700"
                      >
                        <FiMoreVertical className="text-gray-400 cursor-pointer" />
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>


      {/* Dropdown Menu */}
      {menuOpen !== null && (
        <div
          ref={menuRef}
          className="fixed bg-gray-800 shadow-sm rounded-lg text-white w-32 z-100"
          style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
        >
        <button
        onClick={() => setSelectedLog({   namespace: "namespace", deployment: "deployment"})}
        className="block w-full bg-gray-800 text-left px-4 py-2 hover:bg-gray-700"> 
          Logs
        </button>
        <button
            className="block w-full bg-gray-800 text-left px-4 py-2 hover:bg-gray-700"
            onClick={() => handleScaleClick(workloads[menuOpen!])}
          >
            Scale
          </button>
          <button
            className="block w-full bg-gray-800 text-left px-4 py-2 hover:bg-gray-700"
            onClick={() => handleEditClick(workloads[menuOpen!])}
          >
            Edit
          </button>
            <button className="block w-full bg-gray-800 text-left px-4 py-2 hover:bg-gray-700" 
            onClick={() => handleDeleteClick(workloads[menuOpen!])}>
            Delete
          </button>
        </div>
      )}
      

      {/* YAML Editor Modal */}
      {editYaml && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-gray-900 p-6 rounded-lg w-2/3">
            <h2 className="text-xl font-bold mb-4">Edit Resource</h2>
            <Editor
              height="400px"
              defaultLanguage="yaml"
              value={yamlData}
              onChange={(value) => setYamlData(value || "")}
              theme="vs-dark"
            />
            <div className="mt-4 flex justify gap-4">
              <button className="bg-blue-500 px-4 py-2 rounded text-white" onClick={handleSave}>
                Upload
              </button>
              <button className="bg-gray-600 px-4 py-2 rounded" onClick={() => setEditYaml(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Scaling Modal */}
      {scaleModalOpen && selectedWorkload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-gray-900 p-6 rounded-lg w-1/2">
            <h2 className="text-xl font-bold mb-10">Scale a resource</h2>
            <h3 className="text-lg font-semibold mb-4">
              deployment {selectedWorkload.name} will be updated to reflect the desired replica count.
            </h3>
            <div className="flex gap-4 w-full items-start">
              {/* Desired Replicas */}
              <div className="flex flex-col">
                <label htmlFor="desired-replicas" className="text-gray-400 font-semibold mb-1">
                  Desired Replicas*
                </label>
                <input
                  id="desired-replicas"
                  type="number"
                  value={desiredReplicas}
                  onChange={(e) => setDesiredReplicas(Number(e.target.value))}
                  className="bg-transparent text-white border-b-2 border-gray-400 focus:outline-none w-36 text-left"
                />
              </div>
              {/* Actual Replicas */}
              <div className="flex flex-col">
                <span className="text-gray-400 font-semibold mb-1">Actual Replicas</span>
                <span className="text-white border-b-2 border-gray-400 w-36 text-left">
                  {replicaCount}
                </span>
              </div>
            </div>

            <div className="bg-gray-800 flex items-center gap-2 p-2 mt-10 text-white">
              <Info size={18} className="text-blue-400" /> 
              <p>
                This action is equivalent to:kubectl scale -n deployment {selectedWorkload.name} --replicas={replicaCount}
              </p>
            </div>


            <div className="mt-6 flex gap-4">
              <button className="px-4 py-2 rounded text-blue-500" onClick={handleScaleSave}>
                Scale
              </button>
              <button className="px-4 py-2 rounded text-blue-500" onClick={() => setScaleModalOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

     {/* Deleting Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-gray-900 p-6 rounded-lg shadow-lg w-7xl">
            <h2 className="text-lg font-bold mb-4">Delete a resource</h2>
            <p>Are you sure you want to delete <strong>{selectedWorkload?.name} in namespace {selectedWorkload?.namespace}</strong>?</p>
            <div className="bg-gray-800 flex items-center gap-2 p-2 mt-10 text-white">
              <Info size={18} className="text-blue-400" /> 
              <p>
                This action is equivalent to: 
                <code className="bg-gray-700 px-1 py-0.5 rounded ml-1">
                  kubectl delete -n default pod {selectedWorkload?.name} --cascade=background
                </code>
              </p>
            </div>
            <div className="mt-4 flex justify gap-2">
              <button className="bg-gray-800 px-4 py-2 rounded text-blue-500" onClick={confirmDelete}>Delete</button>
              <button className="bg-gray-800 px-4 py-2 rounded text-blue-500" onClick={() => setDeleteModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Logs Modal  */}
      {selectedLog && (
        <LogModal
          namespace={selectedLog.namespace}
          deploymentName={selectedLog.deployment}
          onClose={() => setSelectedLog(null)}
        />
      )}


    </div>
  );
};

export default DeploymentTable;