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
        background: "#181818",
        foreground: "#D1D5DB",
        cursor: "#00FF00",
      },
      cursorBlink: true,
      fontSize: 14,
      fontFamily: "monospace",
      scrollback: 1000,
      disableStdin: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);

    setTimeout(() => {
      fitAddon.fit();
    }, 100);

    terminalInstance.current = term;

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const socket = new WebSocket(
      `${protocol}://localhost:4000/ws?namespace=${namespace}&deployment=${deploymentName}`
    );

    socket.onopen = () => {
      term.writeln("\x1b[32m✔ Connected to log stream...\x1b[0m");
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
      term.writeln("\x1b[31m⚠ Complete Logs. Connection closed.\x1b[0m");
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
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-md">
      <div className="bg-white rounded-sm p-6 shadow-xl w-3/4 h-3/4 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center pb-3">
          <h2 className="text-2xl font-semibold text-black">
            Logs: <span className="text-blue-400">{deploymentName}</span>
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-red-600 border none transition duration-200"
          >
            <X size={22} />
          </button>
        </div>

        {/* Terminal Section */}
        <div className="mt-4 bg-black p-4 rounded-sm h-full border border-gray-700 shadow-inner">
          {loading && <p className="text-green-400 animate-pulse">🔄 Loading logs...</p>}
          {error && <p className="text-red-400">{error}</p>}
          <div
            ref={terminalRef}
            className="h-full w-full overflow-auto rounded-md"
          ></div>
        </div>
      </div>
    </div>
  );
};

export default LogModal;
