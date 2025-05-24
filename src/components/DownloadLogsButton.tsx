import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'react-hot-toast';
import useTheme from '../stores/themeStore';

interface DownloadLogsButtonProps {
  cluster: string;
  namespace: string;
  podName: string;
  className?: string;
  previous?: boolean;
  logContent?: string; // Added prop to receive current log content
}

const DownloadLogsButton: React.FC<DownloadLogsButtonProps> = ({
  cluster,
  namespace,
  podName,
  className = '',
  logContent = '', // Default to empty string if not provided
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const theme = useTheme(state => state.theme);

  // Function to download logs directly from the browser
  const downloadLogs = async () => {
    try {
      setIsLoading(true);
      
      // Create filename with timestamp to avoid duplicates
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `logs-${cluster}-${podName}-${timestamp}.log`;
      
      // Use the log content directly or fetch it if not provided
      let content = logContent;
      
      // If no content was provided, create a placeholder message
      if (!content || content.trim() === '') {
        content = `Logs for pod ${podName} in namespace ${namespace} on cluster ${cluster}\n` +
                 `Generated at: ${new Date().toLocaleString()}\n\n` +
                 `Log content not available directly. Please use the streaming logs feature.`;
      }
      
      // Create a blob with the content
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      
      // Create object URL from blob
      const url = URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      
      // Append to document, click, then remove
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
      
      // Show success notification
      toast.success('Logs downloaded', {
        duration: 3000,
        position: 'top-center',
        icon: '✅',
        style: {
          borderRadius: '10px',
          background: theme === 'dark' ? '#1e293b' : '#fff',
          color: theme === 'dark' ? '#fff' : '#334155',
        },
      });
      
    } catch (error) {
      console.error('Error downloading logs:', error);
      toast.error('Failed to download logs', {
        duration: 3000,
        position: 'top-center',
        icon: '⚠️',
        style: {
          borderRadius: '10px',
          background: theme === 'dark' ? '#1e293b' : '#fff',
          color: theme === 'dark' ? '#fff' : '#334155',
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={downloadLogs}
      disabled={isLoading}
      className={`${
        theme === 'dark'
          ? 'bg-gray-700 hover:bg-gray-600 text-white'
          : 'bg-gray-300 hover:bg-gray-200 text-gray-800'
      } px-2 py-1 rounded transition-colors ${className}`}
      title="Download logs"
    >
      {isLoading ? (
        <span className="inline-block animate-spin">⟳</span>
      ) : (
        <Download size={20} />
      )}
    </button>
  );
};

export default DownloadLogsButton;
