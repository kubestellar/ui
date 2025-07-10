import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useTheme from '../../stores/themeStore';
import getThemeStyles from '../../lib/theme-utils';
import { useAdminCheck } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import {
  FiUsers,
  FiUserPlus,
  FiSearch,
  FiFilter,
  FiRefreshCw,
  FiX,
  FiChevronDown,
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

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

  // Filter states
  const [roleFilter, setRoleFilter] = useState<string>('all'); // 'all', 'admin', 'user'
  const [permissionFilter, setPermissionFilter] = useState<string>('all'); // 'all', specific permission
  const [permissionLevelFilter, setPermissionLevelFilter] = useState<string>('all'); // 'all', 'read', 'write'
  const [showFilters, setShowFilters] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
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
      toast.error(t('admin.users.errors.fetchFailed'));
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

  // Enhanced filter logic
  useEffect(() => {
    let filtered = [...users];

    // Search filter
    if (searchTerm.trim() !== '') {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(user => {
        const matchesUsername = user.username.toLowerCase().includes(lowerSearchTerm);
        const matchesRole =
          (user.is_admin && t('admin.users.roles.admin').toLowerCase().includes(lowerSearchTerm)) ||
          (!user.is_admin && t('admin.users.roles.user').toLowerCase().includes(lowerSearchTerm));
        const matchesPermissions = Object.keys(user.permissions || {}).some(
          key =>
            key.toLowerCase().includes(lowerSearchTerm) ||
            user.permissions[key].toLowerCase().includes(lowerSearchTerm)
        );

        return matchesUsername || matchesRole || matchesPermissions;
      });
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => {
        if (roleFilter === 'admin') return user.is_admin;
        if (roleFilter === 'user') return !user.is_admin;
        return true;
      });
    }

    // Permission component filter
    if (permissionFilter !== 'all') {
      filtered = filtered.filter(user => {
        const userPermissions = user.permissions || {};
        return Object.keys(userPermissions).includes(permissionFilter);
      });
    }

    // Permission level filter
    if (permissionLevelFilter !== 'all') {
      filtered = filtered.filter(user => {
        const userPermissions = user.permissions || {};
        return Object.values(userPermissions).includes(permissionLevelFilter);
      });
    }

    setFilteredUsers(filtered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, users, roleFilter, permissionFilter, permissionLevelFilter]);

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setRoleFilter('all');
    setPermissionFilter('all');
    setPermissionLevelFilter('all');
  };

  // Check if any filters are active
  const hasActiveFilters =
    searchTerm !== '' ||
    roleFilter !== 'all' ||
    permissionFilter !== 'all' ||
    permissionLevelFilter !== 'all';

  // Count active filters
  const activeFilterCount = [
    searchTerm !== '',
    roleFilter !== 'all',
    permissionFilter !== 'all',
    permissionLevelFilter !== 'all',
  ].filter(Boolean).length;

  const refreshUsers = async () => {
    setIsRefreshing(true);
    try {
      const fetchedUsers = await UserService.fetchUsers();
      setUsers(fetchedUsers);
    } catch (error) {
      console.error('Error refreshing users:', error);
      toast.error(t('admin.users.errors.fetchFailed'));
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAddUser = async () => {
    if (!username || (!passwordOptional && !password)) {
      toast.error(t('admin.users.errors.missingFields'));
      return;
    }

    if (password && password !== confirmPassword) {
      toast.error(t('admin.users.errors.passwordMismatch'));
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
      toast.success(t('admin.users.success.userAdded'));
      fetchUsers();
    } catch (error) {
      console.error('Error adding user:', error);
      toast.error(t('admin.users.errors.addFailed'));
    }
  };

  const handleEditUser = async () => {
    if (!currentUser || !username) {
      toast.error(t('admin.users.errors.missingFields'));
      return;
    }

    if (password && password !== confirmPassword) {
      toast.error(t('admin.users.errors.passwordMismatch'));
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

      // Update user details including username
      await UserService.updateUser(currentUser.username, {
        username: username, // Send the new username
        password: password || undefined, // Only send password if it's changed
        is_admin: isUserAdmin,
      });

      // Update permissions separately
      await UserService.updateUserPermissions(username, finalPermissions); // Use new username for permissions

      // Reset form and show success message
      resetForm();
      setShowEditModal(false);
      toast.success(t('admin.users.success.userUpdated'));
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error(t('admin.users.errors.updateFailed'));
    }
  };

  const handleDeleteUser = async () => {
    if (!currentUser) {
      return;
    }

    try {
      setIsDeleting(true);
      await UserService.deleteUser(currentUser.username);

      // Reset form and show success message
      setShowDeleteModal(false);
      setCurrentUser(null);
      toast.success(t('admin.users.success.userDeleted'));

      // Update the users list by removing the deleted user
      setUsers(prevUsers => prevUsers.filter(user => user.username !== currentUser.username));
      setFilteredUsers(prevUsers =>
        prevUsers.filter(user => user.username !== currentUser.username)
      );
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(t('admin.users.errors.deleteFailed'));
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
    setShowEditModal(true);
  };

  const openDeleteModal = (user: User) => {
    setCurrentUser(user);
    setShowDeleteModal(true);
  };

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setIsUserAdmin(false);
    setUserPermissions({});
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
                {t('admin.users.stats.usersShown', {
                  filtered: filteredUsers.length,
                  count: users.length,
                })}{' '}
                {hasActiveFilters && t('admin.users.stats.shown')}
              </p>
            </div>
          </div>

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

        {/* Enhanced Search and Filter Section */}
        <div className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            {/* Search Bar */}
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <FiSearch size={16} style={{ color: themeStyles.colors.text.tertiary }} />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={t('admin.users.search.placeholder')}
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

            {/* Filter Toggle Button */}
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="relative flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 transition-all duration-200"
                style={{
                  borderColor: showFilters
                    ? themeStyles.colors.brand.primary
                    : isDark
                      ? 'rgba(75, 85, 99, 0.5)'
                      : 'rgba(226, 232, 240, 0.8)',
                  color: showFilters
                    ? themeStyles.colors.brand.primary
                    : themeStyles.colors.text.secondary,
                  background: showFilters
                    ? isDark
                      ? 'rgba(59, 130, 246, 0.1)'
                      : 'rgba(59, 130, 246, 0.05)'
                    : isDark
                      ? 'rgba(31, 41, 55, 0.4)'
                      : 'rgba(249, 250, 251, 0.8)',
                }}
                onClick={() => setShowFilters(!showFilters)}
              >
                <FiFilter size={16} />
                <span>{t('admin.users.filters.title')}</span>
                {activeFilterCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-xs font-medium text-white">
                    {activeFilterCount}
                  </span>
                )}
                <FiChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`}
                />
              </motion.button>

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
            </div>
          </div>

          {/* Filter Options */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden rounded-lg border p-4"
                style={{
                  borderColor: isDark ? 'rgba(75, 85, 99, 0.3)' : 'rgba(226, 232, 240, 0.8)',
                  background: isDark ? 'rgba(31, 41, 55, 0.3)' : 'rgba(255, 255, 255, 0.8)',
                }}
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {/* Role Filter */}
                  <div className="space-y-2">
                    <label
                      className="text-sm font-medium"
                      style={{ color: themeStyles.colors.text.primary }}
                    >
                      {t('admin.users.filters.role.label')}
                    </label>
                    <select
                      value={roleFilter}
                      onChange={e => setRoleFilter(e.target.value)}
                      className="w-full rounded-lg border px-3 py-2 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                      style={{
                        background: isDark ? 'rgba(17, 24, 39, 0.5)' : 'rgba(255, 255, 255, 0.9)',
                        borderColor: isDark ? 'rgba(75, 85, 99, 0.3)' : 'rgba(226, 232, 240, 0.8)',
                        color: themeStyles.colors.text.primary,
                      }}
                    >
                      <option value="all">{t('admin.users.filters.role.all')}</option>
                      <option value="admin">{t('admin.users.filters.role.admin')}</option>
                      <option value="user">{t('admin.users.filters.role.user')}</option>
                    </select>
                  </div>

                  {/* Permission Component Filter */}
                  <div className="space-y-2">
                    <label
                      className="text-sm font-medium"
                      style={{ color: themeStyles.colors.text.primary }}
                    >
                      {t('admin.users.filters.permission.label')}
                    </label>
                    <select
                      value={permissionFilter}
                      onChange={e => setPermissionFilter(e.target.value)}
                      className="w-full rounded-lg border px-3 py-2 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                      style={{
                        background: isDark ? 'rgba(17, 24, 39, 0.5)' : 'rgba(255, 255, 255, 0.9)',
                        borderColor: isDark ? 'rgba(75, 85, 99, 0.3)' : 'rgba(226, 232, 240, 0.8)',
                        color: themeStyles.colors.text.primary,
                      }}
                    >
                      <option value="all">{t('admin.users.filters.permission.all')}</option>
                      {permissionComponents.map(component => (
                        <option key={component.id} value={component.id}>
                          {component.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Permission Level Filter */}
                  <div className="space-y-2">
                    <label
                      className="text-sm font-medium"
                      style={{ color: themeStyles.colors.text.primary }}
                    >
                      {t('admin.users.filters.accessLevel.label')}
                    </label>
                    <select
                      value={permissionLevelFilter}
                      onChange={e => setPermissionLevelFilter(e.target.value)}
                      className="w-full rounded-lg border px-3 py-2 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                      style={{
                        background: isDark ? 'rgba(17, 24, 39, 0.5)' : 'rgba(255, 255, 255, 0.9)',
                        borderColor: isDark ? 'rgba(75, 85, 99, 0.3)' : 'rgba(226, 232, 240, 0.8)',
                        color: themeStyles.colors.text.primary,
                      }}
                    >
                      <option value="all">{t('admin.users.filters.accessLevel.all')}</option>
                      <option value="read">{t('admin.users.filters.accessLevel.read')}</option>
                      <option value="write">{t('admin.users.filters.accessLevel.write')}</option>
                    </select>
                  </div>
                </div>

                {/* Clear Filters Button */}
                {hasActiveFilters && (
                  <div className="mt-4 flex justify-end">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-all duration-200"
                      style={{
                        color: themeStyles.colors.text.secondary,
                        background: isDark ? 'rgba(75, 85, 99, 0.2)' : 'rgba(226, 232, 240, 0.3)',
                      }}
                      onClick={clearFilters}
                    >
                      <FiX size={14} />
                      {t('admin.users.filters.clear')}
                    </motion.button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap gap-2"
            >
              {searchTerm && (
                <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {t('admin.users.search.label')} "{searchTerm}"
                  <FiX
                    size={14}
                    className="cursor-pointer transition-colors hover:text-blue-600 dark:hover:text-blue-100"
                    onClick={() => setSearchTerm('')}
                  />
                </span>
              )}
              {roleFilter !== 'all' && (
                <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-sm text-green-800 dark:bg-green-900 dark:text-green-200">
                  {t('admin.users.filters.role.filter')}{' '}
                  {roleFilter === 'admin'
                    ? t('admin.users.roles.administrator')
                    : t('admin.users.roles.regularUser')}
                  <FiX
                    size={14}
                    className="cursor-pointer transition-colors hover:text-green-600 dark:hover:text-green-100"
                    onClick={() => setRoleFilter('all')}
                  />
                </span>
              )}
              {permissionFilter !== 'all' && (
                <span className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-3 py-1 text-sm text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                  {t('admin.users.filters.permission.filter')}{' '}
                  {permissionComponents.find(p => p.id === permissionFilter)?.name}
                  <FiX
                    size={14}
                    className="cursor-pointer transition-colors hover:text-purple-600 dark:hover:text-purple-100"
                    onClick={() => setPermissionFilter('all')}
                  />
                </span>
              )}
              {permissionLevelFilter !== 'all' && (
                <span className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-sm text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                  {t('admin.users.filters.accessLevel.filter')}{' '}
                  {permissionLevelFilter === 'read'
                    ? t('admin.users.permissions.levels.readOnly')
                    : t('admin.users.permissions.levels.readWrite')}
                  <FiX
                    size={14}
                    className="cursor-pointer transition-colors hover:text-orange-600 dark:hover:text-orange-100"
                    onClick={() => setPermissionLevelFilter('all')}
                  />
                </span>
              )}
            </motion.div>
          )}
        </div>

        {/* Success message */}
        <AnimatePresence>{/* Removed static success message banner */}</AnimatePresence>

        {/* Error message */}
        <AnimatePresence>{/* Removed static error message banner */}</AnimatePresence>

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
              {hasActiveFilters && (
                <div className="flex items-center gap-2 rounded-full bg-blue-500 bg-opacity-10 px-3 py-1 text-xs">
                  <FiFilter size={12} className="text-blue-500" />
                  <span className="text-blue-500">
                    {t('admin.users.filters.active', { count: activeFilterCount })}
                  </span>
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
