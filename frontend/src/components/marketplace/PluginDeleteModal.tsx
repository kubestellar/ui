import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  HiExclamationTriangle,
  HiTrash,
  HiXMark,
  HiCheckCircle,
  HiOutlineArrowPath,
} from 'react-icons/hi2';
import useTheme from '../../stores/themeStore';
import getThemeStyles from '../../lib/theme-utils';
import { useMarketplaceQueries } from '../../hooks/queries/useMarketplaceQueries';
type PluginData = {
  id: number;
  name: string;
  description: string;
  version: string;
  icon?: string;
  downloads?: number;
};
import toast from 'react-hot-toast';

interface PluginDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  plugin: PluginData | null;
  onDeleteSuccess?: () => void;
}

export const PluginDeleteModal: React.FC<PluginDeleteModalProps> = ({
  isOpen,
  onClose,
  plugin,
  onDeleteSuccess,
}) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const themeStyles = getThemeStyles(isDark);

  const [deleteStep, setDeleteStep] = useState<'confirm' | 'deleting' | 'success' | 'error'>(
    'confirm'
  );
  const [confirmText, setConfirmText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const { useDeletePlugin } = useMarketplaceQueries();
  const deleteMutation = useDeletePlugin();

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setDeleteStep('confirm');
      setConfirmText('');
      setErrorMessage('');
    }
  }, [isOpen]);

  // Close on Escape and lock body scroll while open
  React.useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && deleteStep !== 'deleting') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, deleteStep, onClose]);

  const handleDelete = () => {
    if (!plugin || confirmText !== plugin.name) return;

    setDeleteStep('deleting');

    deleteMutation.mutate(plugin.id, {
      onSuccess: () => {
        setDeleteStep('success');
        toast.success(`Plugin "${plugin.name}" deleted successfully!`);
        onDeleteSuccess?.();
        setTimeout(() => {
          onClose();
        }, 2000);
      },
      onError: (error: Error & { response?: { data?: { error?: string } } }) => {
        console.error('Delete error:', error);
        setDeleteStep('error');
        setErrorMessage(
          error.response?.data?.error || 'Failed to delete plugin. Please try again.'
        );
        toast.error('Failed to delete plugin');
      },
    });
  };

  const isConfirmValid = confirmText === plugin?.name;

  const renderContent = () => {
    switch (deleteStep) {
      case 'confirm':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Warning Icon */}
            <div className="text-center">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
                className="mb-4 flex justify-center"
              >
                <div
                  className="rounded-full p-3"
                  style={{
                    background: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)',
                    border: `2px solid ${isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)'}`,
                  }}
                >
                  <HiExclamationTriangle
                    className="h-12 w-12"
                    style={{ color: isDark ? '#fca5a5' : '#dc2626' }}
                  />
                </div>
              </motion.div>

              <h3
                className="mb-2 text-lg font-bold"
                style={{ color: themeStyles.colors.text.primary }}
              >
                {t('marketplace.delete.confirmTitle', 'Delete Plugin')}
              </h3>

              <p className="text-sm" style={{ color: themeStyles.colors.text.secondary }}>
                {t(
                  'marketplace.delete.warning',
                  'This action cannot be undone. This will permanently delete the plugin.'
                )}
              </p>
            </div>

            {/* Plugin Info */}
            {plugin && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-xl p-4"
                style={{
                  background: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(254, 242, 242, 0.8)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {plugin.icon ? (
                      <img
                        src={plugin.icon}
                        alt={plugin.name}
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-lg text-xl font-bold"
                        style={{
                          background: themeStyles.colors.brand.primary,
                          color: '#ffffff',
                        }}
                      >
                        {plugin.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate font-semibold"
                      style={{ color: themeStyles.colors.text.primary }}
                    >
                      {plugin.name}
                    </p>
                    <p
                      className="truncate text-sm"
                      style={{ color: themeStyles.colors.text.secondary }}
                    >
                      {plugin.description}
                    </p>
                    <div className="mt-1 flex items-center gap-4">
                      <span
                        className="text-xs"
                        style={{ color: themeStyles.colors.text.secondary }}
                      >
                        v{plugin.version}
                      </span>
                      <span
                        className="text-xs"
                        style={{ color: themeStyles.colors.text.secondary }}
                      >
                        {plugin.downloads?.toLocaleString()} downloads
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Confirmation Input */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-2"
            >
              <label
                className="block text-sm font-medium"
                style={{ color: themeStyles.colors.text.primary }}
              >
                {t('marketplace.delete.confirmLabel', 'Type the plugin name to confirm:')}
              </label>

              <div className="space-y-1">
                <div
                  className="rounded-lg px-3 py-2 font-mono text-sm"
                  style={{
                    background: isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(249, 250, 251, 0.8)',
                    border: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(226, 232, 240, 0.7)'}`,
                    color: themeStyles.colors.text.primary,
                  }}
                >
                  {plugin?.name}
                </div>

                <input
                  type="text"
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  placeholder={t('marketplace.delete.confirmPlaceholder', 'Enter plugin name here')}
                  className="w-full rounded-lg px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2"
                  style={{
                    background: isDark ? 'rgba(31, 41, 55, 0.5)' : 'rgba(255, 255, 255, 0.8)',
                    border: `1px solid ${isConfirmValid ? 'rgba(34, 197, 94, 0.5)' : isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(226, 232, 240, 0.7)'}`,
                    color: themeStyles.colors.text.primary,
                  }}
                  onFocus={e => {
                    e.target.style.outline = 'none';
                    e.target.style.boxShadow = `0 0 0 2px ${isConfirmValid ? 'rgba(34, 197, 94, 0.5)' : themeStyles.colors.brand.primary}`;
                  }}
                  onBlur={e => {
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {confirmText && !isConfirmValid && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs"
                  style={{ color: isDark ? '#fca5a5' : '#dc2626' }}
                >
                  {t('marketplace.delete.mismatch', 'Plugin name does not match')}
                </motion.p>
              )}

              {isConfirmValid && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-1 text-xs"
                  style={{ color: isDark ? '#86efac' : '#16a34a' }}
                >
                  <HiCheckCircle className="h-3 w-3" />
                  {t('marketplace.delete.confirmed', 'Plugin name confirmed')}
                </motion.p>
              )}
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex gap-3"
            >
              <motion.button
                onClick={onClose}
                className="flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-transform hover:scale-105"
                whileTap={{ scale: 0.95 }}
                style={{
                  background: isDark ? 'rgba(55, 65, 81, 0.5)' : 'rgba(249, 250, 251, 0.8)',
                  color: themeStyles.colors.text.primary,
                  border: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(226, 232, 240, 0.7)'}`,
                }}
              >
                {t('common.cancel', 'Cancel')}
              </motion.button>

              <motion.button
                onClick={handleDelete}
                disabled={!isConfirmValid}
                className="flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50"
                whileTap={{ scale: isConfirmValid ? 0.95 : 1 }}
                whileHover={{ scale: isConfirmValid ? 1.05 : 1 }}
                style={{
                  background: isConfirmValid ? '#dc2626' : 'rgba(156, 163, 175, 0.5)',
                  color: '#ffffff',
                }}
              >
                <div className="flex items-center justify-center gap-2">
                  <HiTrash className="h-4 w-4" />
                  {t('marketplace.delete.deleteButton', 'Delete Plugin')}
                </div>
              </motion.button>
            </motion.div>
          </motion.div>
        );

      case 'deleting':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-8 text-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="mb-4 flex justify-center"
            >
              <HiOutlineArrowPath
                className="h-16 w-16"
                style={{ color: isDark ? '#fca5a5' : '#dc2626' }}
              />
            </motion.div>

            <h3
              className="mb-2 text-lg font-medium"
              style={{ color: themeStyles.colors.text.primary }}
            >
              {t('marketplace.delete.deleting', 'Deleting Plugin...')}
            </h3>

            <p className="text-sm" style={{ color: themeStyles.colors.text.secondary }}>
              {t('marketplace.delete.deletingMessage', 'Please wait while we remove your plugin.')}
            </p>

            <div className="mt-6">
              <div
                className="h-2 w-full rounded-full"
                style={{
                  background: isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(226, 232, 240, 0.5)',
                }}
              >
                <motion.div
                  className="h-2 rounded-full bg-red-500"
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 2, ease: 'easeInOut' }}
                />
              </div>
            </div>
          </motion.div>
        );

      case 'success':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-8 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, delay: 0.2 }}
              className="mb-4 flex justify-center"
            >
              <HiCheckCircle className="h-16 w-16 text-green-500" />
            </motion.div>

            <h3
              className="mb-2 text-lg font-medium"
              style={{ color: themeStyles.colors.text.primary }}
            >
              {t('marketplace.delete.success', 'Plugin Deleted Successfully!')}
            </h3>

            <p className="text-sm" style={{ color: themeStyles.colors.text.secondary }}>
              {t(
                'marketplace.delete.successMessage',
                'The plugin has been permanently removed from the marketplace.'
              )}
            </p>
          </motion.div>
        );

      case 'error':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-8 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, delay: 0.2 }}
              className="mb-4 flex justify-center"
            >
              <HiExclamationTriangle
                className="h-16 w-16"
                style={{ color: isDark ? '#fca5a5' : '#dc2626' }}
              />
            </motion.div>

            <h3
              className="mb-2 text-lg font-medium"
              style={{ color: themeStyles.colors.text.primary }}
            >
              {t('marketplace.delete.error', 'Delete Failed')}
            </h3>

            <p className="mb-6 text-sm" style={{ color: themeStyles.colors.text.secondary }}>
              {errorMessage ||
                t(
                  'marketplace.delete.errorMessage',
                  'Something went wrong while deleting the plugin.'
                )}
            </p>

            <div className="flex gap-3">
              <motion.button
                onClick={onClose}
                className="flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-transform hover:scale-105"
                whileTap={{ scale: 0.95 }}
                style={{
                  background: isDark ? 'rgba(55, 65, 81, 0.5)' : 'rgba(249, 250, 251, 0.8)',
                  color: themeStyles.colors.text.primary,
                  border: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(226, 232, 240, 0.7)'}`,
                }}
              >
                {t('common.close', 'Close')}
              </motion.button>

              <motion.button
                onClick={() => setDeleteStep('confirm')}
                className="flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-transform hover:scale-105"
                whileTap={{ scale: 0.95 }}
                style={{
                  background: themeStyles.colors.brand.primary,
                  color: '#ffffff',
                }}
              >
                {t('marketplace.delete.tryAgain', 'Try Again')}
              </motion.button>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  if (!isOpen || !plugin) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0, 0, 0, 0.5)' }}
        onClick={e => {
          if (e.target === e.currentTarget && deleteStep !== 'deleting') {
            onClose();
          }
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="w-full max-w-md rounded-xl p-6 shadow-2xl"
          style={{
            background: isDark ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            border: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(226, 232, 240, 0.7)'}`,
          }}
        >
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold" style={{ color: themeStyles.colors.text.primary }}>
              {t('marketplace.delete.title', 'Delete Plugin')}
            </h2>

            {deleteStep !== 'deleting' && (
              <button
                onClick={onClose}
                className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <HiXMark className="h-5 w-5" style={{ color: themeStyles.colors.text.secondary }} />
              </button>
            )}
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">{renderContent()}</AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
