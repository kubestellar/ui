import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'react-hot-toast';
import DownloadLogsModal from './DownloadLogsModal';
import useTheme from '../stores/themeStore';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
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
        content =
          t('downloadLogsButton.placeholder.header', { podName, namespace, cluster }) +
          '\n' +
          t('downloadLogsButton.placeholder.generated', { date: new Date().toLocaleString() }) +
          '\n\n' +
          t('downloadLogsButton.placeholder.noContent');
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
      toast.success(t('downloadLogsButton.toast.success', { podName }), {
        duration: 3000,
      });
    } catch (error) {
      console.error('Error downloading logs:', error);
      toast.error(t('downloadLogsButton.toast.error'), {
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to calculate the size of the log content
  const calculateSize = () => {
    const contentSize = new Blob([logContent], { type: 'text/plain' }).size;
    setShowModal(true);
    return contentSize;
  };

  return (
    <>
      <button
        onClick={() => calculateSize()}
        disabled={isLoading}
        className={`${
          theme === 'dark'
            ? 'bg-gray-700 text-white hover:bg-gray-600'
            : 'bg-gray-300 text-gray-800 hover:bg-gray-200'
        } rounded px-2 py-1 transition-colors ${className}`}
        title={t('downloadLogsButton.title')}
      >
        {isLoading ? <span className="inline-block animate-spin">⟳</span> : <Download size={16} />}
      </button>

      {showModal && (
        <DownloadLogsModal
          size={new Blob([logContent], { type: 'text/plain' }).size}
          onClose={() => setShowModal(false)}
          onSave={downloadLogs}
        />
      )}
    </>
  );
};

export default DownloadLogsButton;
