import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Terminal({
      theme: {
        background: "#181818", // Darker background
        foreground: "#D1D5DB", // Light gray text
        cursor: "#00FF00", // Green cursor
        // selection: "#44475a", // Highlighted text color
      },
      cursorBlink: true,
      fontSize: 14,
      fontFamily: "monospace",
      scrollback: 1000, // Allows more scroll history
      disableStdin: true, // Prevent user input
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);

    setTimeout(() => {
      fitAddon.fit();
    }, 100);

    terminalInstance.current = term;

    // Dynamically determine the WebSocket protocol
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const socket = new WebSocket(
      `${protocol}://localhost:4000/ws?namespace=${namespace}&deployment=${deploymentName}`
    );

    socket.onopen = () => {
      term.writeln("\x1b[32m✔ Connected to log stream...\x1b[0m"); // Green text
      setLoading(false);
      setError(null);
    };

    socket.onmessage = (event) => {
      term.writeln(event.data);
      setError(null);
    };

    socket.onerror = (event) => {
      console.error("WebSocket encountered an issue:", event);
    };

    socket.onclose = () => {
      term.writeln("\x1b[31m⚠ Complete Logs. Connection closed.\x1b[0m"); // Red text
      if (socket.readyState !== WebSocket.OPEN) {
        setError(" Connection closed. Please retry.");
      }
    };

    return () => {
      socket.close();
      term.dispose();
    };
  }, [namespace, deploymentName]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
      <div className="bg-gray-900 p-5 rounded-xl shadow-lg w-3/4 h-3/4 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-700 pb-3">
          <h2 className="text-2xl font-bold text-white">
            Logs: <span className="text-blue-400 text-2xl">{deploymentName}</span>
          </h2>
          <button
            onClick={onClose}
            className="bg-gray-900 hover:text-red-400 transition duration-200"
          >
            <X size={22} />
          </button>
        </div>

        {/* Terminal Section */}
        <div className="mt-4 bg-black p-3 rounded-lg h-full border border-gray-700">
          {loading && <p className="text-green-400">🔄 Loading logs...</p>}
          {error && <p className="text-red-400">{error}</p>}
          <div ref={terminalRef} className="h-full w-full overflow-auto"></div>
        </div>
      </div>
    </div>
  );
};

export default LogModal;
