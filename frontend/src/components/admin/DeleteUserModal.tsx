import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiAlertTriangle, FiTrash2, FiUser, FiLoader } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { DeleteUserModalProps } from './UserTypes';

const DeleteUserModal: React.FC<DeleteUserModalProps> = ({
  isOpen,
  onClose,
  onDelete,
  username,
  isDark,
  themeStyles,
  isDeleting = false,
}) => {
  const { t } = useTranslation();

  // Capture original overflow outside early return to prevent scroll lock issues
  const originalOverflow = document.body.style.overflow;

  // Lock body scroll while the modal is open and handle cleanup
  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, originalOverflow]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
          onClick={onClose}
        ></motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.25, type: 'spring', stiffness: 300, damping: 30 }}
          className="relative z-50 w-full max-w-md overflow-hidden rounded-xl shadow-2xl"
          style={{
            background: isDark ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            borderColor: isDark ? 'rgba(75, 85, 99, 0.3)' : 'rgba(226, 232, 240, 0.8)',
            boxShadow: isDark
              ? '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)'
              : '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          }}
        >
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{
              background: isDark
                ? 'linear-gradient(to right, rgba(220, 38, 38, 0.2), rgba(185, 28, 28, 0.15))'
                : 'linear-gradient(to right, rgba(254, 226, 226, 0.8), rgba(254, 202, 202, 0.6))',
              borderBottom: `1px solid ${isDark ? 'rgba(75, 85, 99, 0.3)' : 'rgba(226, 232, 240, 0.8)'}`,
            }}
          >
            <h3
              className="text-lg font-semibold tracking-tight"
              style={{ color: themeStyles.colors.text.primary }}
            >
              {t('admin.users.delete.title')}
            </h3>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="rounded-full p-1.5 transition-colors duration-200"
              style={{
                color: themeStyles.colors.text.secondary,
                background: isDark ? 'rgba(55, 65, 81, 0.5)' : 'rgba(243, 244, 246, 0.8)',
              }}
              disabled={isDeleting}
            >
              <FiX size={18} />
            </motion.button>
          </div>

          <div className="px-6 py-5">
            <div className="flex flex-col items-center gap-5 text-center">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full"
                style={{
                  background: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)',
                  color: isDark ? '#f87171' : '#ef4444',
                }}
              >
                <FiAlertTriangle size={32} />
              </div>

              <div className="space-y-2">
                <h4
                  className="text-xl font-medium"
                  style={{ color: themeStyles.colors.text.primary }}
                >
                  {t('admin.users.delete.confirmTitle')}
                </h4>

                <div
                  className="flex items-center justify-center gap-2 rounded-lg px-4 py-2.5"
                  style={{
                    background: isDark ? 'rgba(31, 41, 55, 0.4)' : 'rgba(243, 244, 246, 0.8)',
                  }}
                >
                  <FiUser size={16} className="text-blue-500" />
                  <span className="font-medium" style={{ color: themeStyles.colors.text.primary }}>
                    {username}
                  </span>
                </div>

                <p className="text-sm" style={{ color: themeStyles.colors.text.secondary }}>
                  {t('admin.users.delete.confirmMessage', { username })}
                </p>
              </div>
            </div>

            <div className="mt-7 flex justify-end gap-3 pt-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={onClose}
                className="rounded-lg border px-5 py-2.5 text-sm font-medium transition-colors duration-200"
                style={{
                  borderColor: isDark ? 'rgba(75, 85, 99, 0.5)' : 'rgba(226, 232, 240, 0.8)',
                  color: themeStyles.colors.text.secondary,
                  background: isDark ? 'rgba(31, 41, 55, 0.4)' : 'rgba(249, 250, 251, 0.8)',
                }}
                disabled={isDeleting}
              >
                {t('common.cancel')}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={onDelete}
                className="flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-all duration-200"
                style={{
                  background: isDark
                    ? 'linear-gradient(to bottom right, #ef4444, #dc2626)'
                    : 'linear-gradient(to bottom right, #ef4444, #b91c1c)',
                  boxShadow: `0 4px 12px ${isDark ? 'rgba(220, 38, 38, 0.3)' : 'rgba(239, 68, 68, 0.2)'}`,
                }}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <FiLoader className="animate-spin" size={16} />
                    <span>{t('common.deleting')}</span>
                  </>
                ) : (
                  <>
                    <FiTrash2 size={16} />
                    <span>{t('admin.users.delete.confirm')}</span>
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default DeleteUserModal;
