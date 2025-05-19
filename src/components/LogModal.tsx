import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import useTheme from '../stores/themeStore';

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
  const theme = useTheme(state => state.theme);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Terminal({
      theme: {
        background: theme === 'dark' ? '#181818' : '#F5F5F5', // Dark or light background
        foreground: theme === 'dark' ? '#D1D5DB' : '#222222', // Light gray or dark text
        cursor: '#00FF00', // Green cursor
      },
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'monospace',
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

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const socket = new WebSocket(
      `${protocol}://${process.env.VITE_BASE_URL?.replace(/^http?:\/\//, '')}/ws?namespace=${namespace}&deployment=${deploymentName}`
    );

    socket.onopen = () => {
      term.writeln('\x1b[32m✔ Connected to log stream...\x1b[0m');
      setLoading(false);
      setError(null);
    };

    socket.onmessage = event => {
      term.writeln(event.data);
      setError(null);
    };

    socket.onerror = event => {
      console.error('WebSocket encountered an issue:', event);
    };

    socket.onclose = () => {
      term.writeln('\x1b[31m⚠ Complete Logs. Connection closed.\x1b[0m');
      if (socket.readyState !== WebSocket.OPEN) {
        setError(' Connection closed. Please retry.');
      }
    };

    return () => {
      socket.close();
      term.dispose();
    };
  }, [namespace, deploymentName, theme]); // Re-run effect when theme changes

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
      <div
        className={`flex h-3/4 w-3/4 flex-col p-5 shadow-lg ${
          theme === 'dark' ? 'border-gray-700 bg-gray-900' : 'border-gray-300 bg-white'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between border-b pb-3 ${
            theme === 'dark' ? 'border-gray-700 text-white' : 'border-gray-300 text-black'
          }`}
        >
          <h2 className="text-2xl font-bold">
            Logs: <span className="text-2xl text-blue-400">{deploymentName}</span>
          </h2>
          <button
            onClick={onClose}
            className={`transition duration-200 ${
              theme === 'dark'
                ? 'bg-gray-900 hover:text-red-600'
                : 'border-none bg-white hover:text-red-600'
            }`}
          >
            <X size={22} />
          </button>
        </div>

        {/* Terminal Section */}
        <div
          className={`mt-4 h-full rounded-lg border p-3 ${
            theme === 'dark'
              ? 'border-gray-700 bg-black text-white'
              : 'border-gray-300 bg-gray-100 text-black'
          }`}
        >
          {loading && <p className="text-green-400">🔄 Loading logs...</p>}
          {error && <p className="text-red-400">{error}</p>}
          <div ref={terminalRef} className="h-full w-full overflow-auto"></div>
        </div>
      </div>
    </div>
  );
};

export default LogModal;
