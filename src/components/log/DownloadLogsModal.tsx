import React from 'react';
import { X } from 'lucide-react';
import useTheme from '../stores/themeStore';

interface DownloadLogsModalProps {
  size: number;
  onClose: () => void;
  onSave: () => void;
}

const DownloadLogsModal: React.FC<DownloadLogsModalProps> = ({ size, onClose, onSave }) => {
  const theme = useTheme(state => state.theme);

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));

    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
      <div
        className={`w-80 rounded-lg p-5 shadow-xl ${
          theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
        }`}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium">Download Logs</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-4">
          <p className="mb-2 text-sm">File size: {formatSize(size)}</p>
          <div className="h-1 w-full rounded-full bg-gray-200 dark:bg-gray-700">
            <div className="h-1 rounded-full bg-blue-500" style={{ width: '100%' }}></div>
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className={`rounded px-3 py-1.5 text-sm ${
              theme === 'dark'
                ? 'bg-gray-700 text-white hover:bg-gray-600'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="rounded bg-blue-500 px-3 py-1.5 text-sm text-white hover:bg-blue-600"
          >
            Download
          </button>
        </div>
      </div>
    </div>
  );
};

export default DownloadLogsModal;
