import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  HiXMark,
  HiCloudArrowUp,
  HiDocumentArrowUp,
  HiCheckCircle,
  HiExclamationTriangle,
  HiOutlineArrowPath,
  HiInformationCircle,
} from 'react-icons/hi2';
import useTheme from '../../stores/themeStore';
import getThemeStyles from '../../lib/theme-utils';
import { useMarketplaceQueries } from '../../hooks/queries/useMarketplaceQueries';
import toast from 'react-hot-toast';

interface PluginUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PluginUploadModal: React.FC<PluginUploadModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const themeStyles = getThemeStyles(isDark);

  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStep, setUploadStep] = useState<
    'select' | 'preview' | 'uploading' | 'success' | 'error'
  >('select');
  const [errorMessage, setErrorMessage] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { useUploadPlugin } = useMarketplaceQueries();
  const uploadMutation = useUploadPlugin();

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setUploadStep('select');
      setSelectedFile(null);
      setErrorMessage('');
      setDragActive(false);
    }
  }, [isOpen]);

  // Close on Escape and lock body scroll while open
  React.useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && uploadStep !== 'uploading') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, uploadStep, onClose]);

  const handleFile = useCallback(
    (file: File) => {
      // Validate file inline to avoid dependency issues
      const validateFile = (file: File): string | null => {
        // Check file type
        if (!file.name.endsWith('.tar.gz')) {
          return t(
            'marketplace.upload.invalidFileType',
            'Invalid file type. Please upload a .tar.gz file.'
          );
        }

        // Check file size (50MB limit)
        const maxSize = 50 * 1024 * 1024; // 50MB
        if (file.size > maxSize) {
          return t('marketplace.upload.fileTooLarge', 'File size too large. Maximum size is 50MB.');
        }

        return null;
      };

      const validationError = validateFile(file);

      if (validationError) {
        setErrorMessage(validationError);
        setUploadStep('error');
        toast.error(validationError);
        return;
      }

      setSelectedFile(file);
      setUploadStep('preview');
      setErrorMessage('');
    },
    [t]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleUpload = useCallback(() => {
    if (!selectedFile) return;

    setUploadStep('uploading');

    uploadMutation.mutate(selectedFile, {
      onSuccess: () => {
        setUploadStep('success');
        toast.success(t('marketplace.upload.success'));
        setTimeout(() => {
          onClose();
        }, 2000);
      },
      onError: (error: Error & { response?: { data?: { error?: string } } }) => {
        console.error('Upload error:', error);
        setUploadStep('error');
        setErrorMessage(error.response?.data?.error || t('marketplace.upload.error'));
      },
    });
  }, [selectedFile, uploadMutation, onClose, t]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleReset = () => {
    setSelectedFile(null);
    setUploadStep('select');
    setErrorMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const renderContent = () => {
    switch (uploadStep) {
      case 'select':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center"
          >
            <div
              className={`relative rounded-xl border-2 border-dashed p-6 transition-all duration-300 sm:p-8 ${
                dragActive
                  ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg shadow-blue-500/20 dark:from-blue-900/30 dark:to-blue-800/20'
                  : 'border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <motion.div
                className="mb-4 flex justify-center"
                animate={{
                  scale: dragActive ? 1.1 : 1,
                  rotate: dragActive ? 5 : 0,
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <div
                  className={`rounded-full p-2 sm:p-3 ${dragActive ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-gray-100 dark:bg-gray-800'}`}
                >
                  <HiCloudArrowUp
                    className="h-12 w-12 sm:h-14 sm:w-14"
                    style={{
                      color: dragActive
                        ? themeStyles.colors.brand.primary
                        : themeStyles.colors.text.secondary,
                    }}
                  />
                </div>
              </motion.div>

              <h3
                className="mb-2 text-lg font-bold sm:text-xl"
                style={{ color: themeStyles.colors.text.primary }}
              >
                {t('marketplace.upload.dragDrop', 'Drag and drop your plugin here')}
              </h3>

              <p
                className="mb-4 px-2 text-sm sm:text-base"
                style={{ color: themeStyles.colors.text.secondary }}
              >
                {t(
                  'marketplace.upload.supportedFormat',
                  'or click to browse. Supported format: .tar.gz'
                )}
              </p>

              <motion.button
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg px-5 py-2 text-sm font-semibold shadow-md transition-all hover:shadow-lg sm:px-6 sm:py-2.5 sm:text-base"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  background: `linear-gradient(135deg, ${themeStyles.colors.brand.primary} 0%, #1d4ed8 100%)`,
                  color: '#ffffff',
                }}
              >
                {t('marketplace.upload.browseFiles', 'Browse Files')}
              </motion.button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".tar.gz"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            <div
              className="mt-5 rounded-lg p-4 shadow-sm sm:mt-6 sm:p-5"
              style={{
                background: isDark
                  ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.05) 100%)'
                  : 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(147, 197, 253, 0.05) 100%)',
                border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)'}`,
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="rounded-full p-1.5 sm:p-2"
                  style={{ background: themeStyles.colors.brand.primary + '20' }}
                >
                  <HiInformationCircle
                    className="h-4 w-4 flex-shrink-0 sm:h-5 sm:w-5"
                    style={{ color: themeStyles.colors.brand.primary }}
                  />
                </div>
                <div className="flex-1 text-left">
                  <p
                    className="mb-2 text-sm font-semibold sm:text-base"
                    style={{ color: themeStyles.colors.text.primary }}
                  >
                    {t('marketplace.upload.requirements', 'Upload Requirements:')}
                  </p>
                  <ul
                    className="space-y-1.5 text-xs sm:text-sm"
                    style={{ color: themeStyles.colors.text.secondary }}
                  >
                    <li className="flex items-start gap-2">
                      <span
                        className="mt-1 h-1 w-1 flex-shrink-0 rounded-full sm:h-1.5 sm:w-1.5"
                        style={{ background: themeStyles.colors.brand.primary }}
                      ></span>
                      <span>{t('marketplace.documentation.fileFormat')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span
                        className="mt-1 h-1 w-1 flex-shrink-0 rounded-full sm:h-1.5 sm:w-1.5"
                        style={{ background: themeStyles.colors.brand.primary }}
                      ></span>
                      <span>{t('marketplace.documentation.maxFileSize')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span
                        className="mt-1 h-1 w-1 flex-shrink-0 rounded-full sm:h-1.5 sm:w-1.5"
                        style={{ background: themeStyles.colors.brand.primary }}
                      ></span>
                      <span>{t('marketplace.documentation.mustContain')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span
                        className="mt-1 h-1 w-1 flex-shrink-0 rounded-full sm:h-1.5 sm:w-1.5"
                        style={{ background: themeStyles.colors.brand.primary }}
                      ></span>
                      <span>{t('marketplace.documentation.validStructure')}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        );

      case 'preview':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-5 sm:space-y-6"
          >
            <div className="text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                <div
                  className="mx-auto mb-4 w-fit rounded-full p-2 sm:p-3"
                  style={{ background: themeStyles.colors.brand.primary + '15' }}
                >
                  <HiDocumentArrowUp
                    className="h-12 w-12 sm:h-14 sm:w-14"
                    style={{ color: themeStyles.colors.brand.primary }}
                  />
                </div>
              </motion.div>
              <h3
                className="mb-2 px-2 text-lg font-bold sm:text-xl"
                style={{ color: themeStyles.colors.text.primary }}
              >
                {t('marketplace.upload.reviewFile', 'Review Your Plugin')}
              </h3>
              <p
                className="px-4 text-sm sm:text-base"
                style={{ color: themeStyles.colors.text.secondary }}
              >
                {t(
                  'marketplace.upload.confirmUpload',
                  'Please confirm the details below before uploading'
                )}
              </p>
            </div>

            <div
              className="rounded-xl p-4 shadow-md transition-all hover:shadow-lg sm:p-5"
              style={{
                background: isDark
                  ? 'linear-gradient(135deg, rgba(31, 41, 55, 0.6) 0%, rgba(17, 24, 39, 0.4) 100%)'
                  : 'linear-gradient(135deg, rgba(249, 250, 251, 0.9) 0%, rgba(255, 255, 255, 0.8) 100%)',
                border: `2px solid ${isDark ? 'rgba(55, 65, 81, 0.4)' : 'rgba(226, 232, 240, 0.8)'}`,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div
                    className="flex-shrink-0 rounded-lg p-2 shadow-sm sm:p-2.5"
                    style={{ background: themeStyles.colors.brand.primary + '20' }}
                  >
                    <HiDocumentArrowUp
                      className="h-5 w-5 sm:h-6 sm:w-6"
                      style={{ color: themeStyles.colors.brand.primary }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className="mb-0.5 truncate text-sm font-semibold sm:text-base"
                      style={{ color: themeStyles.colors.text.primary }}
                    >
                      {selectedFile?.name}
                    </p>
                    <p
                      className="text-xs font-medium sm:text-sm"
                      style={{ color: themeStyles.colors.text.secondary }}
                    >
                      {selectedFile && formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                </div>
                <motion.button
                  onClick={handleReset}
                  className="flex-shrink-0 rounded-lg p-1.5 transition-all sm:p-2"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  style={{
                    background: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
                  }}
                >
                  <HiXMark
                    className="h-4 w-4 sm:h-5 sm:w-5"
                    style={{ color: isDark ? '#fca5a5' : '#dc2626' }}
                  />
                </motion.button>
              </div>
            </div>

            <div className="flex gap-3">
              <motion.button
                onClick={handleReset}
                className="flex-1 rounded-lg px-4 py-2 text-sm font-semibold shadow-md transition-all hover:shadow-lg sm:px-5 sm:py-2.5 sm:text-base"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  background: isDark ? 'rgba(55, 65, 81, 0.6)' : 'rgba(249, 250, 251, 0.9)',
                  color: themeStyles.colors.text.primary,
                  border: `2px solid ${isDark ? 'rgba(75, 85, 99, 0.5)' : 'rgba(209, 213, 219, 0.8)'}`,
                }}
              >
                {t('common.cancel', 'Cancel')}
              </motion.button>

              <motion.button
                onClick={handleUpload}
                className="flex-1 rounded-lg px-4 py-2 text-sm font-semibold shadow-md transition-all hover:shadow-xl sm:px-5 sm:py-2.5 sm:text-base"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  background: `linear-gradient(135deg, ${themeStyles.colors.brand.primary} 0%, #1d4ed8 100%)`,
                  color: '#ffffff',
                }}
              >
                {t('marketplace.upload.uploadPlugin', 'Upload Plugin')}
              </motion.button>
            </div>
          </motion.div>
        );

      case 'uploading':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-6 text-center sm:py-8"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="mb-5 flex justify-center sm:mb-6"
            >
              <div
                className="rounded-full p-2 sm:p-3"
                style={{ background: themeStyles.colors.brand.primary + '15' }}
              >
                <HiOutlineArrowPath
                  className="h-12 w-12 sm:h-14 sm:w-14"
                  style={{ color: themeStyles.colors.brand.primary }}
                />
              </div>
            </motion.div>

            <h3
              className="mb-2 px-2 text-lg font-bold sm:text-xl"
              style={{ color: themeStyles.colors.text.primary }}
            >
              {t('marketplace.upload.uploading', 'Uploading Plugin...')}
            </h3>

            <p
              className="mb-5 px-4 text-sm sm:mb-6 sm:text-base"
              style={{ color: themeStyles.colors.text.secondary }}
            >
              {t(
                'marketplace.upload.processingFile',
                'Processing your plugin file. This may take a moment.'
              )}
            </p>

            <div className="mx-auto mt-6 max-w-md px-4">
              <div
                className="h-2 w-full rounded-full shadow-inner sm:h-2.5"
                style={{
                  background: isDark ? 'rgba(55, 65, 81, 0.4)' : 'rgba(226, 232, 240, 0.6)',
                }}
              >
                <motion.div
                  className="h-2 rounded-full shadow-lg sm:h-2.5"
                  style={{
                    background: `linear-gradient(90deg, ${themeStyles.colors.brand.primary} 0%, #60a5fa 100%)`,
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 3, ease: 'easeInOut' }}
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
            className="py-6 text-center sm:py-8"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, delay: 0.2 }}
              className="mb-5 flex justify-center sm:mb-6"
            >
              <div className="rounded-full bg-green-100 p-2 shadow-lg shadow-green-500/20 dark:bg-green-900/30 sm:p-3">
                <HiCheckCircle className="h-14 w-14 text-green-500 sm:h-16 sm:w-16" />
              </div>
            </motion.div>

            <h3
              className="mb-2 px-2 text-lg font-bold sm:text-xl"
              style={{ color: themeStyles.colors.text.primary }}
            >
              {t('marketplace.upload.success', 'Plugin Uploaded Successfully!')}
            </h3>

            <p
              className="mx-auto max-w-md px-4 text-sm sm:text-base"
              style={{ color: themeStyles.colors.text.secondary }}
            >
              {t(
                'marketplace.upload.successMessage',
                'Your plugin has been uploaded and is now available in the marketplace.'
              )}
            </p>
          </motion.div>
        );

      case 'error':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-12 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, delay: 0.2 }}
              className="mb-8 flex justify-center"
            >
              <div
                className="rounded-full p-4 shadow-lg"
                style={{
                  background: isDark ? 'rgba(252, 165, 165, 0.15)' : 'rgba(220, 38, 38, 0.1)',
                  boxShadow: isDark
                    ? '0 0 40px rgba(252, 165, 165, 0.2)'
                    : '0 0 40px rgba(220, 38, 38, 0.15)',
                }}
              >
                <HiExclamationTriangle
                  className="h-24 w-24"
                  style={{ color: isDark ? '#fca5a5' : '#dc2626' }}
                />
              </div>
            </motion.div>

            <h3
              className="mb-3 text-2xl font-bold"
              style={{ color: themeStyles.colors.text.primary }}
            >
              {t('marketplace.upload.error', 'Upload Failed')}
            </h3>

            <p
              className="mx-auto mb-8 max-w-md text-base"
              style={{ color: themeStyles.colors.text.secondary }}
            >
              {errorMessage ||
                t(
                  'marketplace.upload.errorMessage',
                  'Something went wrong while uploading your plugin.'
                )}
            </p>

            <motion.button
              onClick={handleReset}
              className="rounded-xl px-8 py-3 text-base font-semibold shadow-lg transition-all hover:shadow-xl"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                background: `linear-gradient(135deg, ${themeStyles.colors.brand.primary} 0%, #1d4ed8 100%)`,
                color: '#ffffff',
              }}
            >
              {t('marketplace.upload.tryAgain', 'Try Again')}
            </motion.button>
          </motion.div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0, 0, 0, 0.5)' }}
        onClick={e => {
          if (e.target === e.currentTarget && uploadStep !== 'uploading') {
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
              {t('marketplace.upload.title', 'Upload Plugin')}
            </h2>

            {uploadStep !== 'uploading' && (
              <button
                onClick={onClose}
                className="rounded-lg bg-white p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
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
