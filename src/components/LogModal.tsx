import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import axios from "axios";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";

interface LogModalProps {
  namespace: string;
  deploymentName: string;
  onClose: () => void;
}

const LogModal = ({ namespace, deploymentName, onClose }: LogModalProps) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (terminalRef.current) {
      const term = new Terminal({
        theme: { background: "#1E1E1E", foreground: "#00FF00" },
        cursorBlink: true,
        fontSize: 14,
      });
      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(terminalRef.current);
      fitAddon.fit();
      terminalInstance.current = term;

      const fetchLogs = async () => {
        try {
          const response = await axios.get(
            `/api/logs?namespace=${namespace}&deployment=${deploymentName}`
          );
          response.data.forEach((log: string) => term.writeln(log));
          setLoading(false);
        } catch (error) {
          term.writeln("Error fetching logs...");
          setLoading(false);
          console.log(error);
          
        }
      };

      fetchLogs();
      const interval = setInterval(fetchLogs, 3000);

      return () => {
        clearInterval(interval);
        term.dispose();
      };
    }
  }, [namespace, deploymentName]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-gray-800 p-4 rounded-lg w-3/4 h-3/4 flex flex-col">
        <div className="flex justify-between items-center border-b pb-2">
          <h2 className="text-lg font-bold">Logs: {deploymentName}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <div className="mt-4 bg-black p-2 rounded-lg h-full">
          {loading && <p className="text-green-400">Loading logs...</p>}
          <div ref={terminalRef} className="h-full w-full"></div>
        </div>
      </div>
    </div>
  );
};

export default LogModal;
