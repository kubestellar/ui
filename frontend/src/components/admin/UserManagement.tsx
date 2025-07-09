import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useTheme from '../../stores/themeStore';
import getThemeStyles from '../../lib/theme-utils';
import { useAdminCheck } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import {
  FiUsers,
  FiUserPlus,
  FiCheckCircle,
  FiSearch,
  FiFilter,
  FiRefreshCw,
  FiX,
  FiAlertCircle,
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';

// Import modular components and types
import { User, PermissionComponent, PermissionLevel } from './UserTypes';
import UserFormModal from './UserFormModal';
import DeleteUserModal from './DeleteUserModal';
import UserList from './UserList';
import UserService from './UserService';

const UserManagement = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const themeStyles = getThemeStyles(isDark);
  const { isAdmin, isLoading: isCheckingAdmin } = useAdminCheck();
  const navigate = useNavigate();

  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [userPermissions, setUserPermissions] = useState<Record<string, string>>({});

  // Permissions components that can be managed
  const permissionComponents: PermissionComponent[] = [
    { id: 'users', name: t('admin.users.permissions.users') },
    { id: 'resources', name: t('admin.users.permissions.resources') },
    { id: 'system', name: t('admin.users.permissions.system') },
    { id: 'dashboard', name: t('admin.users.permissions.dashboard') },
  ];

  // Available permission levels
  const permissionLevels: PermissionLevel[] = [
    { id: 'read', name: t('admin.users.permissions.levels.read') },
    { id: 'write', name: t('admin.users.permissions.levels.write') },
  ];

  // Function to fetch users wrapped in useCallback
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedUsers = await UserService.fetchUsers();
      setUsers(fetchedUsers);
      setFilteredUsers(fetchedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      setFormError(t('admin.users.errors.fetchFailed'));
      setUsers([]); // Set to empty array on error
      setFilteredUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [t]); // t is from useTranslation

  // Check if user is admin, otherwise redirect
  useEffect(() => {
    if (!isCheckingAdmin && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, isCheckingAdmin, navigate]);

  // Fetch users when component loads
  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin, fetchUsers]);

  // Filter users based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredUsers(users);
    } else {
      const lowerSearchTerm = searchTerm.toLowerCase();
      setFilteredUsers(
        users.filter(
          user =>
            user.username.toLowerCase().includes(lowerSearchTerm) ||
            (user.is_admin && 'admin'.includes(lowerSearchTerm)) ||
            (!user.is_admin && 'user'.includes(lowerSearchTerm)) ||
            Object.keys(user.permissions || {}).some(
              key =>
                key.toLowerCase().includes(lowerSearchTerm) ||
                user.permissions[key].toLowerCase().includes(lowerSearchTerm)
            )
        )
      );
    }
  }, [searchTerm, users]);

  const refreshUsers = async () => {
    setIsRefreshing(true);
    try {
      const fetchedUsers = await UserService.fetchUsers();
      setUsers(fetchedUsers);
      setFilteredUsers(searchTerm.trim() === '' ? fetchedUsers : filteredUsers);
    } catch (error) {
      console.error('Error refreshing users:', error);
      setFormError(t('admin.users.errors.fetchFailed'));
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAddUser = async () => {
    if (!username || (!passwordOptional && !password)) {
      setFormError(t('admin.users.errors.missingFields'));
      return;
    }

    if (password && password !== confirmPassword) {
      setFormError(t('admin.users.errors.passwordMismatch'));
      return;
    }

    try {
      // If user is admin, set all permissions to write
      const finalPermissions = { ...userPermissions };
      if (isUserAdmin) {
        permissionComponents.forEach(component => {
          finalPermissions[component.id] = 'write';
        });
      }

      await UserService.createUser(username, password, isUserAdmin, finalPermissions);

      // Reset form and show success message
      resetForm();
      setShowAddModal(false);
      setSuccessMessage(t('admin.users.success.userAdded'));
      fetchUsers();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error adding user:', error);
      setFormError(t('admin.users.errors.addFailed'));
    }
  };

  const handleEditUser = async () => {
    if (!currentUser || !username) {
      setFormError(t('admin.users.errors.missingFields'));
      return;
    }

    if (password && password !== confirmPassword) {
      setFormError(t('admin.users.errors.passwordMismatch'));
      return;
    }

    try {
      // If user is admin, set all permissions to write
      const finalPermissions = { ...userPermissions };
      if (isUserAdmin) {
        permissionComponents.forEach(component => {
          finalPermissions[component.id] = 'write';
        });
      }

      // Update user details
      await UserService.updateUser(currentUser.username, {
        password: password || undefined, // Only send password if it's changed
        is_admin: isUserAdmin,
      });

      // Update permissions separately
      await UserService.updateUserPermissions(currentUser.username, finalPermissions);

      // Reset form and show success message
      resetForm();
      setShowEditModal(false);
      setSuccessMessage(t('admin.users.success.userUpdated'));
      fetchUsers();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error updating user:', error);
      setFormError(t('admin.users.errors.updateFailed'));
    }
  };

  const handleDeleteUser = async () => {
    if (!currentUser) {
      return;
    }

    try {
      setIsDeleting(true);
      setFormError(''); // Clear any previous errors
      await UserService.deleteUser(currentUser.username);

      // Reset form and show success message
      setShowDeleteModal(false);
      setCurrentUser(null);
      setSuccessMessage(t('admin.users.success.userDeleted'));

      // Update the users list by removing the deleted user
      setUsers(prevUsers => prevUsers.filter(user => user.username !== currentUser.username));
      setFilteredUsers(prevUsers =>
        prevUsers.filter(user => user.username !== currentUser.username)
      );

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error deleting user:', error);
      setFormError(t('admin.users.errors.deleteFailed'));
    } finally {
      setIsDeleting(false);
    }
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (user: User) => {
    setCurrentUser(user);
    setUsername(user.username);
    setIsUserAdmin(user.is_admin);
    setUserPermissions(user.permissions || {});
    setPassword('');
    setConfirmPassword('');
    setFormError('');
    setShowEditModal(true);
  };

  const openDeleteModal = (user: User) => {
    setCurrentUser(user);
    setFormError('');
    setShowDeleteModal(true);
  };

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setIsUserAdmin(false);
    setUserPermissions({});
    setFormError('');
    setCurrentUser(null);
  };

  const closeModals = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    resetForm();
  };

  const handlePermissionChange = (component: string, permission: string) => {
    setUserPermissions(prev => ({
      ...prev,
      [component]: permission,
    }));
  };

  // For password optional in edit mode
  const passwordOptional = showEditModal;

  if (isCheckingAdmin) {
    return (
      <div className="flex min-h-[300px] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div
            className="h-12 w-12 animate-spin rounded-full border-4 border-current border-t-transparent"
            style={{ color: themeStyles.colors.brand.primary }}
          ></div>
          <span className="mt-2 text-sm" style={{ color: themeStyles.colors.text.secondary }}>
            {t('common.loading')}
          </span>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Will be redirected by the useEffect
  }

  return (
    <div className="container mx-auto p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="rounded-lg p-2.5"
              style={{
                background: isDark
                  ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.1))'
                  : 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.05))',
                boxShadow: isDark
                  ? '0 4px 12px rgba(37, 99, 235, 0.2)'
                  : '0 4px 12px rgba(59, 130, 246, 0.1)',
              }}
            >
              <FiUsers
                size={28}
                style={{
                  color: isDark ? '#60a5fa' : '#3b82f6',
                }}
              />
            </motion.div>
            <div>
              <h1
                className="text-2xl font-bold tracking-tight"
                style={{ color: themeStyles.colors.text.primary }}
              >
                {t('admin.users.title')}
              </h1>
              <p className="text-sm" style={{ color: themeStyles.colors.text.secondary }}>
                {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}{' '}
                {searchTerm && 'found'}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <FiSearch size={16} style={{ color: themeStyles.colors.text.tertiary }} />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search users..."
                className="w-full rounded-lg border px-4 py-2.5 pl-10 pr-4 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                style={{
                  background: isDark ? 'rgba(31, 41, 55, 0.5)' : 'rgba(255, 255, 255, 0.8)',
                  borderColor: isDark ? 'rgba(75, 85, 99, 0.3)' : 'rgba(226, 232, 240, 0.8)',
                  color: themeStyles.colors.text.primary,
                  boxShadow: isDark ? 'none' : 'inset 0 1px 2px rgba(0, 0, 0, 0.05)',
                }}
              />
              {searchTerm && (
                <button
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                  onClick={() => setSearchTerm('')}
                >
                  <FiX size={16} style={{ color: themeStyles.colors.text.tertiary }} />
                </button>
              )}
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center justify-center gap-1.5 rounded-lg border px-4 py-2.5 transition-all duration-200"
              style={{
                borderColor: isDark ? 'rgba(75, 85, 99, 0.5)' : 'rgba(226, 232, 240, 0.8)',
                color: themeStyles.colors.text.secondary,
                background: isDark ? 'rgba(31, 41, 55, 0.4)' : 'rgba(249, 250, 251, 0.8)',
              }}
              onClick={refreshUsers}
              disabled={isRefreshing}
            >
              <FiRefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
              <span>{t('common.refresh')}</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-all duration-200"
              style={{
                background: isDark
                  ? 'linear-gradient(to bottom right, #3b82f6, #2563eb)'
                  : 'linear-gradient(to bottom right, #3b82f6, #1d4ed8)',
                boxShadow: `0 4px 12px ${isDark ? 'rgba(37, 99, 235, 0.3)' : 'rgba(59, 130, 246, 0.2)'}`,
              }}
              onClick={openAddModal}
            >
              <FiUserPlus size={18} />
              <span>{t('admin.users.actions.addUser')}</span>
            </motion.button>
          </div>
        </div>

        {/* Success message */}
        <AnimatePresence>
          {successMessage && (
            <motion.div
              className="flex items-center gap-2.5 rounded-lg border px-5 py-3"
              style={{
                background: isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)',
                borderColor: isDark ? 'rgba(52, 211, 153, 0.2)' : 'rgba(16, 185, 129, 0.1)',
                color: isDark ? 'rgb(110, 231, 183)' : 'rgb(16, 185, 129)',
              }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full"
                style={{
                  background: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)',
                }}
              >
                <FiCheckCircle size={18} />
              </div>
              <span className="font-medium">{successMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error message */}
        <AnimatePresence>
          {formError && (
            <motion.div
              className="flex items-center gap-2.5 rounded-lg border px-5 py-3"
              style={{
                background: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(254, 226, 226, 0.5)',
                borderColor: isDark ? 'rgba(248, 113, 113, 0.2)' : 'rgba(239, 68, 68, 0.1)',
                color: isDark ? '#f87171' : '#ef4444',
              }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <FiAlertCircle size={18} />
              <span className="font-medium">{formError}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Users table */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="overflow-hidden rounded-xl border shadow-sm"
          style={{
            borderColor: isDark ? 'rgba(75, 85, 99, 0.3)' : 'rgba(226, 232, 240, 0.8)',
            background: isDark ? 'rgba(31, 41, 55, 0.3)' : 'rgba(255, 255, 255, 0.8)',
            boxShadow: isDark
              ? '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.05)'
              : '0 4px 12px rgba(0, 0, 0, 0.03), 0 0 0 1px rgba(0, 0, 0, 0.02)',
          }}
        >
          <div
            className="border-b px-6 py-4"
            style={{
              borderColor: isDark ? 'rgba(75, 85, 99, 0.3)' : 'rgba(226, 232, 240, 0.8)',
              background: isDark ? 'rgba(17, 24, 39, 0.4)' : 'rgba(249, 250, 251, 0.8)',
            }}
          >
            <div className="flex items-center justify-between">
              <h2
                className="text-lg font-semibold"
                style={{ color: themeStyles.colors.text.primary }}
              >
                {t('admin.users.subtitle')}
              </h2>
              {searchTerm && (
                <div className="flex items-center gap-2 rounded-full bg-blue-500 bg-opacity-10 px-3 py-1 text-xs">
                  <FiFilter size={12} className="text-blue-500" />
                  <span className="text-blue-500">Filtering: "{searchTerm}"</span>
                </div>
              )}
            </div>
          </div>

          {/* User list component */}
          <UserList
            users={filteredUsers}
            isLoading={isLoading}
            onEditUser={openEditModal}
            onDeleteUser={openDeleteModal}
            isDark={isDark}
            themeStyles={themeStyles}
          />
        </motion.div>
      </motion.div>

      {/* User form modal for adding users */}
      <UserFormModal
        title={t('admin.users.actions.addUser')}
        isOpen={showAddModal}
        onClose={closeModals}
        onSubmit={handleAddUser}
        formError={formError}
        username={username}
        setUsername={setUsername}
        password={password}
        setPassword={setPassword}
        confirmPassword={confirmPassword}
        setConfirmPassword={setConfirmPassword}
        isAdmin={isUserAdmin}
        setIsAdmin={setIsUserAdmin}
        permissions={userPermissions}
        setPermissionChange={handlePermissionChange}
        permissionComponents={permissionComponents}
        permissionLevels={permissionLevels}
        submitLabel={t('admin.users.actions.add')}
        isDark={isDark}
        themeStyles={themeStyles}
      />

      {/* User form modal for editing users */}
      <UserFormModal
        title={t('admin.users.actions.editUser')}
        isOpen={showEditModal}
        onClose={closeModals}
        onSubmit={handleEditUser}
        formError={formError}
        username={username}
        setUsername={setUsername}
        password={password}
        setPassword={setPassword}
        confirmPassword={confirmPassword}
        setConfirmPassword={setConfirmPassword}
        isAdmin={isUserAdmin}
        setIsAdmin={setIsUserAdmin}
        permissions={userPermissions}
        setPermissionChange={handlePermissionChange}
        permissionComponents={permissionComponents}
        permissionLevels={permissionLevels}
        submitLabel={t('admin.users.actions.update')}
        showPasswordFields={true}
        passwordOptional={passwordOptional}
        isDark={isDark}
        themeStyles={themeStyles}
      />

      {/* Delete user confirmation modal */}
      <DeleteUserModal
        isOpen={showDeleteModal}
        onClose={closeModals}
        onDelete={handleDeleteUser}
        username={currentUser?.username || ''}
        isDark={isDark}
        themeStyles={themeStyles}
        isDeleting={isDeleting}
      />
    </div>
  );
};

export default UserManagement;
