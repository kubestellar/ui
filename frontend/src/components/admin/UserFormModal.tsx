import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiX,
  FiAlertCircle,
  FiUser,
  FiLock,
  FiShield,
  FiCheck,
  FiEye,
  FiEyeOff,
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { UserFormModalProps } from './UserTypes';

const UserFormModal: React.FC<UserFormModalProps> = ({
  title,
  isOpen,
  onClose,
  onSubmit,
  formError,
  username,
  setUsername,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  isAdmin,
  setIsAdmin,
  permissions,
  setPermissionChange,
  permissionComponents,
  permissionLevels,
  submitLabel,
  showPasswordFields = true,
  passwordOptional = false,
  isDark,
  themeStyles,
}) => {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const validateUsername = (value: string) => {
    if (!value.trim()) {
      return null; // Don't show error for empty field until form submission
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(value.trim())) {
      return 'Username can only contain letters, numbers, underscore, and hyphen';
    }
    return null;
  };

  useEffect(() => {
    const error = validateUsername(username);
    setUsernameError(error);
  }, [username]);

  useEffect(() => {
    if (isAdmin) {
      // Update all permissions at once
      permissionComponents.forEach(component => {
        setPermissionChange(component.id, 'write');
      });
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!isOpen) {
      setFormSubmitted(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (formError) {
      setFormSubmitted(false);
    }
  }, [formError]);

  const validateForm = () => {
    if (!username.trim()) {
      return { isValid: false, error: 'Username is required' };
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username.trim())) {
      return {
        isValid: false,
        error: 'Username can only contain letters, numbers, underscore, and hyphen',
      };
    }
    if (showPasswordFields) {
      // For Add User mode: password is required
      if (!passwordOptional) {
        if (!password) {
          return { isValid: false, error: 'Password is required' };
        }

        if (password !== confirmPassword) {
          return { isValid: false, error: 'Passwords do not match' };
        }
      }
      // For Edit User mode: password is optional, but if provided, must match
      else {
        // If user provides password in edit mode, both fields must match
        if (password || confirmPassword) {
          if (password !== confirmPassword) {
            return { isValid: false, error: 'Passwords do not match' };
          }
        }
      }
    }

    return { isValid: true, error: null };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateForm();

    if (!validation.isValid) {
      // Handle error (show message, set error state, etc.)
      console.error('Validation failed:', validation.error);
      return;
    }

    // Only execute if validation passes
    setFormSubmitted(true);
    onSubmit();
  };

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
          className="relative z-50 flex max-h-[90vh] w-full max-w-md flex-col rounded-xl shadow-2xl"
          style={{
            background: isDark ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            borderColor: isDark ? 'rgba(75, 85, 99, 0.3)' : 'rgba(226, 232, 240, 0.8)',
            boxShadow: isDark
              ? '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)'
              : '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          }}
        >
          {/* Header with gradient background - fixed at top */}
          <div
            className="sticky top-0 z-10 flex items-center justify-between rounded-t-xl px-6 py-4"
            style={{
              background: isDark
                ? 'linear-gradient(to right, rgba(30, 58, 138, 0.4), rgba(30, 64, 175, 0.3))'
                : 'linear-gradient(to right, rgba(219, 234, 254, 0.8), rgba(191, 219, 254, 0.6))',
              borderBottom: `1px solid ${isDark ? 'rgba(75, 85, 99, 0.3)' : 'rgba(226, 232, 240, 0.8)'}`,
            }}
          >
            <h3
              className="text-lg font-semibold tracking-tight"
              style={{ color: themeStyles.colors.text.primary }}
            >
              {title}
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
              aria-label="Close"
            >
              <FiX size={18} />
            </motion.button>
          </div>

          <div className="custom-scrollbar flex-1 overflow-y-auto px-6 py-5">
            {formError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 flex items-center gap-2.5 rounded-lg border px-4 py-3 text-sm"
                style={{
                  color: isDark ? '#f87171' : '#ef4444',
                  borderColor: isDark ? 'rgba(248, 113, 113, 0.2)' : 'rgba(239, 68, 68, 0.1)',
                  background: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(254, 226, 226, 0.5)',
                }}
              >
                <FiAlertCircle size={18} />
                <span>{formError}</span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username field */}
              <div>
                <label
                  htmlFor="username"
                  className="mb-1.5 flex items-center gap-1.5 text-sm font-medium"
                  style={{ color: themeStyles.colors.text.secondary }}
                >
                  <FiUser size={14} />
                  {t('admin.users.form.username')}
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className={`w-full rounded-lg border px-4 py-2.5 pr-10 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-opacity-50 ${
                      usernameError
                        ? 'border-red-500 focus:ring-red-500'
                        : username && !usernameError
                          ? 'border-green-500 focus:ring-green-500'
                          : 'focus:ring-blue-500'
                    }`}
                    style={{
                      background: isDark ? 'rgba(31, 41, 55, 0.5)' : 'rgba(255, 255, 255, 0.8)',
                      borderColor: usernameError
                        ? '#ef4444'
                        : username && !usernameError
                          ? '#10b981'
                          : isDark
                            ? 'rgba(75, 85, 99, 0.3)'
                            : 'rgba(226, 232, 240, 0.8)',
                      color: themeStyles.colors.text.primary,
                      boxShadow: isDark ? 'none' : 'inset 0 1px 2px rgba(0, 0, 0, 0.05)',
                    }}
                    placeholder={t('admin.users.form.usernamePlaceholder')}
                    required
                    autoFocus
                  />
                  {username && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute right-3 flex items-center justify-center"
                      style={{ pointerEvents: 'none' }}
                    >
                      {usernameError ? (
                        <FiAlertCircle className="text-red-500" size={16} />
                      ) : (
                        <FiCheck className="text-green-500" size={16} />
                      )}
                    </motion.div>
                  )}
                </div>

                {/* Add validation feedback below the input */}
                {username && usernameError && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-1 flex items-center gap-1 text-xs text-red-500"
                  >
                    <FiAlertCircle size={12} />
                    {usernameError}
                  </motion.p>
                )}
                {username && !usernameError && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-1 flex items-center gap-1 text-xs text-green-500"
                  >
                    <FiCheck size={12} />
                    Username format is valid
                  </motion.p>
                )}
              </div>

              {showPasswordFields && (
                <>
                  {/* Password field */}
                  <div>
                    <label
                      htmlFor="password"
                      className="mb-1.5 flex items-center gap-1.5 text-sm font-medium"
                      style={{ color: themeStyles.colors.text.secondary }}
                    >
                      <FiLock size={14} />
                      {t('admin.users.form.password')}
                      {passwordOptional && (
                        <span className="ml-1 text-xs opacity-70">
                          ({t('admin.users.form.optional')})
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full rounded-lg border px-4 py-2.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                        style={{
                          background: isDark ? 'rgba(31, 41, 55, 0.5)' : 'rgba(255, 255, 255, 0.8)',
                          borderColor: isDark
                            ? 'rgba(75, 85, 99, 0.3)'
                            : 'rgba(226, 232, 240, 0.8)',
                          color: themeStyles.colors.text.primary,
                          boxShadow: isDark ? 'none' : 'inset 0 1px 2px rgba(0, 0, 0, 0.05)',
                        }}
                        placeholder={
                          passwordOptional
                            ? t('admin.users.form.passwordOptionalPlaceholder')
                            : t('admin.users.form.passwordPlaceholder')
                        }
                        required={!passwordOptional}
                      />
                      <button
                        type="button"
                        className={`absolute right-3 top-1/2 -translate-y-1/2 transform rounded-full bg-transparent p-1.5 ${
                          isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                        } transition-colors duration-150`}
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <FiEyeOff className="text-gray-600 dark:text-gray-400" size={16} />
                        ) : (
                          <FiEye className="text-gray-600 dark:text-gray-400" size={16} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password field */}
                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="mb-1.5 flex items-center gap-1.5 text-sm font-medium"
                      style={{ color: themeStyles.colors.text.secondary }}
                    >
                      <FiLock size={14} />
                      {t('admin.users.form.confirmPassword')}
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className="w-full rounded-lg border px-4 py-2.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                        style={{
                          background: isDark ? 'rgba(31, 41, 55, 0.5)' : 'rgba(255, 255, 255, 0.8)',
                          borderColor: isDark
                            ? 'rgba(75, 85, 99, 0.3)'
                            : 'rgba(226, 232, 240, 0.8)',
                          color: themeStyles.colors.text.primary,
                          boxShadow: isDark ? 'none' : 'inset 0 1px 2px rgba(0, 0, 0, 0.05)',
                        }}
                        placeholder={t('admin.users.form.confirmPasswordPlaceholder')}
                        required={!passwordOptional}
                      />
                      <button
                        type="button"
                        className={`absolute right-3 top-1/2 -translate-y-1/2 transform rounded-full bg-transparent p-1.5 ${
                          isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                        } transition-colors duration-150`}
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        tabIndex={-1}
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? (
                          <FiEyeOff className="text-gray-600 dark:text-gray-400" size={16} />
                        ) : (
                          <FiEye className="text-gray-600 dark:text-gray-400" size={16} />
                        )}
                      </button>
                    </div>
                    {password && confirmPassword && password !== confirmPassword && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-1 flex items-center gap-1 text-xs text-red-500"
                      >
                        <FiAlertCircle size={12} />
                        {t('admin.users.errors.passwordMismatch')}
                      </motion.p>
                    )}
                    {password && confirmPassword && password === confirmPassword && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-1 flex items-center gap-1 text-xs text-green-500"
                      >
                        <FiCheck size={12} />
                        Passwords match
                      </motion.p>
                    )}
                  </div>
                </>
              )}

              {/* Admin checkbox with enhanced styling */}
              <motion.div
                whileHover={{ scale: 1.01 }}
                className="rounded-lg border p-3.5 transition-all duration-200"
                style={{
                  background: isAdmin
                    ? isDark
                      ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.1))'
                      : 'linear-gradient(135deg, rgba(219, 234, 254, 0.8), rgba(191, 219, 254, 0.6))'
                    : isDark
                      ? 'rgba(31, 41, 55, 0.3)'
                      : 'rgba(249, 250, 251, 0.8)',
                  borderColor: isAdmin
                    ? isDark
                      ? 'rgba(59, 130, 246, 0.3)'
                      : 'rgba(59, 130, 246, 0.2)'
                    : isDark
                      ? 'rgba(75, 85, 99, 0.3)'
                      : 'rgba(226, 232, 240, 0.8)',
                  boxShadow: isAdmin
                    ? isDark
                      ? '0 2px 8px rgba(37, 99, 235, 0.15)'
                      : '0 2px 8px rgba(37, 99, 235, 0.1)'
                    : 'none',
                }}
              >
                <div className="flex items-center">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      id="isAdmin"
                      checked={isAdmin}
                      onChange={e => setIsAdmin(e.target.checked)}
                      className="h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label
                      htmlFor="isAdmin"
                      className="ml-2 flex cursor-pointer items-center gap-1.5 text-sm font-medium"
                      style={{ color: themeStyles.colors.text.primary }}
                    >
                      <FiShield size={14} className={isAdmin ? 'text-blue-500' : ''} />
                      {t('admin.users.form.isAdmin')}
                    </label>
                  </div>
                </div>
                {isAdmin && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 text-xs"
                    style={{ color: themeStyles.colors.text.secondary }}
                  >
                    Administrator users automatically have write access to all components.
                  </motion.p>
                )}
              </motion.div>

              {/* Permissions section */}
              <div>
                <label
                  className="mb-2 flex items-center gap-1.5 text-sm font-medium"
                  style={{ color: themeStyles.colors.text.secondary }}
                >
                  {t('admin.users.form.permissions')}
                </label>

                <div className="custom-scrollbar max-h-[240px] space-y-3 overflow-y-auto pr-1">
                  {permissionComponents.map(component => (
                    <motion.div
                      key={component.id}
                      className="rounded-lg border p-3.5"
                      style={{
                        background: isDark ? 'rgba(31, 41, 55, 0.3)' : 'rgba(249, 250, 251, 0.8)',
                        borderColor: isDark ? 'rgba(75, 85, 99, 0.3)' : 'rgba(226, 232, 240, 0.8)',
                        opacity: isAdmin ? 0.7 : 1,
                        transition: 'all 0.2s ease',
                      }}
                      whileHover={{
                        boxShadow: !isAdmin
                          ? isDark
                            ? '0 2px 8px rgba(0, 0, 0, 0.25)'
                            : '0 2px 8px rgba(0, 0, 0, 0.05)'
                          : undefined,
                        transition: { duration: 0.2 },
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <p
                          className="text-sm font-medium"
                          style={{ color: themeStyles.colors.text.primary }}
                        >
                          {component.name}
                        </p>

                        {isAdmin && (
                          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            Write Access
                          </span>
                        )}
                      </div>

                      {!isAdmin && (
                        <div className="mt-2.5 flex flex-wrap gap-4">
                          {permissionLevels.map(level => (
                            <div key={level.id} className="flex items-center">
                              <input
                                type="radio"
                                id={`${component.id}-${level.id}`}
                                name={`permission-${component.id}`}
                                value={level.id}
                                checked={permissions[component.id] === level.id}
                                onChange={() => setPermissionChange(component.id, level.id)}
                                className="h-4 w-4 cursor-pointer border-gray-300 text-blue-600 focus:ring-blue-500"
                                disabled={isAdmin}
                              />
                              <label
                                htmlFor={`${component.id}-${level.id}`}
                                className="ml-2 block cursor-pointer text-sm"
                                style={{ color: themeStyles.colors.text.primary }}
                              >
                                {level.name}
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>

                {isAdmin && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-2 text-xs italic"
                    style={{ color: themeStyles.colors.text.tertiary }}
                  >
                    Permission settings are managed automatically for administrator accounts.
                  </motion.p>
                )}
              </div>

              <div
                className="sticky bottom-0 mt-6 flex justify-end gap-3 bg-opacity-80 pt-2 backdrop-blur-sm"
                style={{
                  background: isDark ? 'rgba(17, 24, 39, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                }}
              >
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
                >
                  {t('common.cancel')}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-all duration-200"
                  style={{
                    background: isDark
                      ? 'linear-gradient(to bottom right, #3b82f6, #2563eb)'
                      : 'linear-gradient(to bottom right, #3b82f6, #1d4ed8)',
                    boxShadow: `0 4px 12px ${isDark ? 'rgba(37, 99, 235, 0.3)' : 'rgba(59, 130, 246, 0.2)'}`,
                  }}
                  disabled={formSubmitted}
                >
                  {formSubmitted ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                      <span>Processing...</span>
                    </>
                  ) : (
                    submitLabel
                  )}
                </motion.button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default UserFormModal;
