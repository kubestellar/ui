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
              className={`relative rounded-xl border-2 border-dashed p-8 transition-all duration-300 ${
                dragActive
                  ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600'
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
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <HiCloudArrowUp
                  className="h-16 w-16"
                  style={{
                    color: dragActive
                      ? themeStyles.colors.brand.primary
                      : themeStyles.colors.text.secondary,
                  }}
                />
              </motion.div>

              <h3
                className="mb-2 text-lg font-medium"
                style={{ color: themeStyles.colors.text.primary }}
              >
                {t('marketplace.upload.dragDrop', 'Drag and drop your plugin here')}
              </h3>

              <p className="mb-4 text-sm" style={{ color: themeStyles.colors.text.secondary }}>
                {t(
                  'marketplace.upload.supportedFormat',
                  'or click to browse. Supported format: .tar.gz'
                )}
              </p>

              <motion.button
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg px-6 py-2 text-sm font-medium transition-transform hover:scale-105"
                whileTap={{ scale: 0.95 }}
                style={{
                  background: themeStyles.colors.brand.primary,
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
              className="mt-6 rounded-lg p-4"
              style={{
                background: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
              }}
            >
              <div className="flex items-start gap-3">
                <HiInformationCircle
                  className="mt-0.5 h-5 w-5 flex-shrink-0"
                  style={{ color: themeStyles.colors.brand.primary }}
                />
                <div className="text-sm" style={{ color: themeStyles.colors.text.secondary }}>
                  <p
                    className="mb-1 font-medium"
                    style={{ color: themeStyles.colors.text.primary }}
                  >
                    {t('marketplace.upload.requirements', 'Upload Requirements:')}
                  </p>
                  <ul className="list-inside list-disc space-y-1">
                    <li>{t('marketplace.documentation.fileFormat')}</li>
                    <li>{t('marketplace.documentation.maxFileSize')}</li>
                    <li>{t('marketplace.documentation.mustContain')}</li>
                    <li>{t('marketplace.documentation.validStructure')}</li>
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
            className="space-y-6"
          >
            <div className="text-center">
              <HiDocumentArrowUp
                className="mx-auto mb-4 h-16 w-16"
                style={{ color: themeStyles.colors.brand.primary }}
              />
              <h3
                className="mb-2 text-lg font-medium"
                style={{ color: themeStyles.colors.text.primary }}
              >
                {t('marketplace.upload.reviewFile', 'Review Your Plugin')}
              </h3>
              <p className="text-sm" style={{ color: themeStyles.colors.text.secondary }}>
                {t(
                  'marketplace.upload.confirmUpload',
                  'Please confirm the details below before uploading'
                )}
              </p>
            </div>

            <div
              className="rounded-xl p-4"
              style={{
                background: isDark ? 'rgba(31, 41, 55, 0.5)' : 'rgba(249, 250, 251, 0.8)',
                border: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(226, 232, 240, 0.7)'}`,
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="rounded-lg p-2"
                    style={{ background: themeStyles.colors.brand.primary + '20' }}
                  >
                    <HiDocumentArrowUp
                      className="h-5 w-5"
                      style={{ color: themeStyles.colors.brand.primary }}
                    />
                  </div>
                  <div>
                    <p className="font-medium" style={{ color: themeStyles.colors.text.primary }}>
                      {selectedFile?.name}
                    </p>
                    <p className="text-sm" style={{ color: themeStyles.colors.text.secondary }}>
                      {selectedFile && formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <HiXMark
                    className="h-4 w-4"
                    style={{ color: themeStyles.colors.text.secondary }}
                  />
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <motion.button
                onClick={handleReset}
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
                onClick={handleUpload}
                className="flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-transform hover:scale-105"
                whileTap={{ scale: 0.95 }}
                style={{
                  background: themeStyles.colors.brand.primary,
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
            className="py-8 text-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="mb-4 flex justify-center"
            >
              <HiOutlineArrowPath
                className="h-16 w-16"
                style={{ color: themeStyles.colors.brand.primary }}
              />
            </motion.div>

            <h3
              className="mb-2 text-lg font-medium"
              style={{ color: themeStyles.colors.text.primary }}
            >
              {t('marketplace.upload.uploading', 'Uploading Plugin...')}
            </h3>

            <p className="text-sm" style={{ color: themeStyles.colors.text.secondary }}>
              {t(
                'marketplace.upload.processingFile',
                'Processing your plugin file. This may take a moment.'
              )}
            </p>

            <div className="mt-6">
              <div
                className="h-2 w-full rounded-full"
                style={{
                  background: isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(226, 232, 240, 0.5)',
                }}
              >
                <motion.div
                  className="h-2 rounded-full"
                  style={{ background: themeStyles.colors.brand.primary }}
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
              {t('marketplace.upload.success', 'Plugin Uploaded Successfully!')}
            </h3>

            <p className="text-sm" style={{ color: themeStyles.colors.text.secondary }}>
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
              {t('marketplace.upload.error', 'Upload Failed')}
            </h3>

            <p className="mb-6 text-sm" style={{ color: themeStyles.colors.text.secondary }}>
              {errorMessage ||
                t(
                  'marketplace.upload.errorMessage',
                  'Something went wrong while uploading your plugin.'
                )}
            </p>

            <motion.button
              onClick={handleReset}
              className="rounded-lg px-6 py-2 text-sm font-medium transition-transform hover:scale-105"
              whileTap={{ scale: 0.95 }}
              style={{
                background: themeStyles.colors.brand.primary,
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
