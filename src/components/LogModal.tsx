import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
// Lazy load heavy terminal dependencies
const Terminal = typeof window !== 'undefined' ? (await import('xterm')).Terminal : null;
const FitAddon = typeof window !== 'undefined' ? (await import('xterm-addon-fit')).FitAddon : null;
if (typeof window !== 'undefined') {
  // Only import CSS on client
  import('xterm/css/xterm.css');
}
import useTheme from '../stores/themeStore';
import DownloadLogsButton from './DownloadLogsButton';
import { useTranslation } from 'react-i18next';

interface LogModalProps {
  namespace: string;
  deploymentName: string;
  onClose: () => void;
  cluster?: string; // Added cluster prop
}

const LogModal = ({ namespace, deploymentName, onClose, cluster = 'default' }: LogModalProps) => {
  const { t } = useTranslation();
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logContent, setLogContent] = useState<string>('');
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
      term.writeln(`\x1b[32m✔ ${t('logModal.connectedToStream')}\x1b[0m`);
      setLoading(false);
      setError(null);
    };

    socket.onmessage = event => {
      // Add the log line to the terminal
      term.writeln(event.data);
      // Also append to our captured log content
      setLogContent(prev => prev + event.data + '\n');
      setError(null);
    };

    socket.onerror = event => {
      console.error('WebSocket encountered an issue:', event);
    };

    socket.onclose = () => {
      term.writeln(`\x1b[31m⚠ ${t('logModal.connectionClosed')}\x1b[0m`);
      if (socket.readyState !== WebSocket.OPEN) {
        setError(t('logModal.retryConnection'));
      }
    };

    return () => {
      socket.close();
      term.dispose();
    };
  }, [namespace, deploymentName, theme, t]); // Add t to dependencies

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
            {t('logModal.logs')}: <span className="text-2xl text-blue-400">{deploymentName}</span>
          </h2>
          <div className="flex items-center space-x-2">
            <DownloadLogsButton
              cluster={cluster}
              namespace={namespace}
              podName={deploymentName}
              className="mr-2"
              logContent={logContent}
            />
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
        </div>

        {/* Terminal Section */}
        <div
          className={`mt-4 h-full rounded-lg border p-3 ${
            theme === 'dark'
              ? 'border-gray-700 bg-black text-white'
              : 'border-gray-300 bg-gray-100 text-black'
          }`}
        >
          {loading && <p className="text-green-400">🔄 {t('logModal.loadingLogs')}</p>}
          {error && <p className="text-red-400">{error}</p>}
          <div ref={terminalRef} className="h-full w-full overflow-auto"></div>
        </div>
      </div>
    </div>
  );
};

export default LogModal;
