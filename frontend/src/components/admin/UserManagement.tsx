import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useTheme from '../../stores/themeStore';
import getThemeStyles from '../../lib/theme-utils';
import { useAdminCheck } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import {
  FiUserPlus,
  FiSearch,
  FiFilter,
  FiRefreshCw,
  FiX,
  FiArrowUp,
  FiArrowDown,
  FiChevronDown,
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

// Import modular components and types
import { User, PermissionComponent, PermissionLevel, UserFilter } from './UserTypes';
import UserFormModal from './UserFormModal';
import DeleteUserModal from './DeleteUserModal';
import UserList from './UserList';
import UserService from './UserService';

const CustomDropdown = ({
  options,
  value,
  onChange,
  placeholder,
  disabled,
  isDark,
  style,
}: {
  options: { value: string; label: string; color?: string }[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  isDark: boolean;
  style?: React.CSSProperties;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const selected = options.find(opt => opt.value === value);

  return (
    <div ref={ref} className="relative" style={style}>
      <button
        type="button"
        className={`flex w-full items-center rounded-lg border px-3 py-2 text-left transition-all duration-200 focus:outline-none ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
        style={{
          background: isDark ? 'rgba(17,24,39,0.9)' : 'rgba(255,255,255,0.95)',
          color: isDark ? '#fff' : '#222',
          border: isDark ? '1px solid #374151' : '1px solid #e5e7eb',
          boxShadow: open ? (isDark ? '0 4px 24px #0008' : '0 4px 24px #0002') : undefined,
          ...style,
        }}
        onClick={() => !disabled && setOpen(v => !v)}
        disabled={disabled}
      >
        {selected?.color && (
          <span className="mr-2 h-2 w-2 rounded-full" style={{ background: selected.color }} />
        )}
        <span className={selected ? 'font-medium' : 'text-gray-400'}>
          {selected ? selected.label : placeholder}
        </span>
        <FiChevronDown className="ml-auto opacity-60" size={16} />
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
          className="absolute z-20 mt-2 w-full rounded-xl border shadow-xl"
          style={{
            background: isDark ? '#1e293b' : '#fff',
            border: isDark ? '1px solid #334155' : '1px solid #e5e7eb',
          }}
        >
          <div className="py-1">
            {options.map(opt => (
              <button
                key={opt.value}
                className={`flex w-full items-center px-4 py-2 text-left transition-colors hover:bg-blue-500/10 ${value === opt.value ? 'font-bold' : ''}`}
                style={{
                  color: isDark
                    ? value === opt.value
                      ? '#60a5fa'
                      : '#fff'
                    : value === opt.value
                      ? '#2563eb'
                      : '#222',
                  background: value === opt.value ? (isDark ? '#334155' : '#e0e7ff') : undefined,
                }}
                onClick={() => {
                  setOpen(false);
                  onChange(opt.value);
                }}
                type="button"
              >
                {opt.color && (
                  <span className="mr-2 h-2 w-2 rounded-full" style={{ background: opt.color }} />
                )}
                {opt.label}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

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
  const [isDeleting, setIsDeleting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<UserFilter>({
    role: 'all',
    permission: null,
    permissionLevel: null,
    sortBy: 'username',
    sortDirection: 'asc',
  });
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

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

  // Filter users based on search term and filters
  useEffect(() => {
    let filtered = [...users];

    // Apply search term filter
    if (searchTerm.trim() !== '') {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(
        user =>
          user.username.toLowerCase().includes(lowerSearchTerm) ||
          (user.is_admin && 'admin'.includes(lowerSearchTerm)) ||
          (!user.is_admin && 'user'.includes(lowerSearchTerm)) ||
          Object.keys(user.permissions || {}).some(
            key =>
              key.toLowerCase().includes(lowerSearchTerm) ||
              user.permissions[key].toLowerCase().includes(lowerSearchTerm)
          )
      );
    }

    // Apply role filter
    if (filters.role === 'admin') {
      filtered = filtered.filter(user => user.is_admin);
    } else if (filters.role === 'user') {
      filtered = filtered.filter(user => !user.is_admin);
    }

    // Apply permission filter
    if (filters.permission) {
      filtered = filtered.filter(
        user =>
          user.permissions &&
          Object.prototype.hasOwnProperty.call(user.permissions, filters.permission as string)
      );

      // Apply permission level filter if both permission and level are set
      if (filters.permissionLevel) {
        filtered = filtered.filter(
          user => user.permissions[filters.permission as string] === filters.permissionLevel
        );
      }
    }

    // Apply sorting
    if (filters.sortBy) {
      filtered.sort((a, b) => {
        const direction = filters.sortDirection === 'asc' ? 1 : -1;

        switch (filters.sortBy) {
          case 'username':
            return a.username.localeCompare(b.username) * direction;
          case 'role':
            return (a.is_admin === b.is_admin ? 0 : a.is_admin ? -1 : 1) * direction;
          case 'created': {
            const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return (dateA - dateB) * direction;
          }
          default:
            return 0;
        }
      });
    }

    setFilteredUsers(filtered);

    // Count active filters
    let count = 0;
    if (filters.role !== 'all') count++;
    if (filters.permission) count++;
    if (filters.permissionLevel) count++;
    if (searchTerm.trim() !== '') count++;
    setActiveFiltersCount(count);
  }, [searchTerm, users, filters]);

  const refreshUsers = async () => {
    setIsRefreshing(true);
    try {
      const fetchedUsers = await UserService.fetchUsers();
      setUsers(fetchedUsers);
      setFilteredUsers(searchTerm.trim() === '' ? fetchedUsers : filteredUsers);
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

  // Filter handling functions
  const toggleFilters = () => {
    setShowFilters(prev => !prev);
  };

  const handleFilterChange = (filterKey: keyof UserFilter, value: string | null) => {
    if (filterKey === 'permission' && !value) {
      // If clearing the permission filter, also clear the permission level filter
      setFilters(prev => ({
        ...prev,
        permission: null,
        permissionLevel: null,
      }));
    } else {
      setFilters(prev => ({
        ...prev,
        [filterKey]: value,
      }));
    }
  };
  // Helper arrays for colored options
  const roleOptions = [
    { value: 'all', label: t('admin.users.filters.allRoles') },
    { value: 'admin', label: t('admin.users.roles.admin'), color: '#22c55e' }, // green
    { value: 'user', label: t('admin.users.roles.user'), color: '#6b7280' }, // gray
  ];
  const permissionOptions = permissionComponents.map((c, i) => ({
    value: c.id,
    label: c.name,
    color: ['#3b82f6', '#10b981', '#a78bfa', '#f59e42'][i % 4], // blue, green, purple, orange
  }));
  const permissionLevelOptions = [
    { value: '', label: t('admin.users.filters.anyLevel') },
    { value: 'read', label: t('admin.users.permissions.levels.read'), color: '#f59e42' }, // orange
    { value: 'write', label: t('admin.users.permissions.levels.write'), color: '#22c55e' }, // green
  ];

  const resetFilters = () => {
    setFilters({
      role: 'all',
      permission: null,
      permissionLevel: null,
      sortBy: 'username',
      sortDirection: 'asc',
    });
    setSearchTerm('');
  };

  const toggleSortDirection = () => {
    setFilters(prev => ({
      ...prev,
      sortDirection: prev.sortDirection === 'asc' ? 'desc' : 'asc',
    }));
  };

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
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-2xl font-bold" style={{ color: themeStyles.colors.text.primary }}>
          {t('admin.users.title')}
        </h1>
        <p style={{ color: themeStyles.colors.text.secondary }}>{t('admin.users.description')}</p>
      </div>

      {/* Search and Filter Bar */}
      <div className="mb-6">
        <div
          className="mb-4 flex flex-wrap items-center gap-3 rounded-lg p-4"
          style={{
            background: isDark ? 'rgba(31, 41, 55, 0.4)' : 'rgba(249, 250, 251, 0.8)',
            borderBottom: `1px solid ${
              isDark ? 'rgba(75, 85, 99, 0.2)' : 'rgba(226, 232, 240, 0.8)'
            }`,
          }}
        >
          {/* Search Input */}
          <div className="relative flex-grow">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <FiSearch className="h-5 w-5" style={{ color: themeStyles.colors.text.secondary }} />
            </div>
            <input
              type="text"
              className="w-full rounded-lg py-2 pl-10 pr-4 transition-all duration-200 focus:outline-none"
              style={{
                background: isDark ? 'rgba(17, 24, 39, 0.7)' : 'rgba(255, 255, 255, 0.9)',
                color: themeStyles.colors.text.primary,
                border: `1px solid ${
                  isDark ? 'rgba(75, 85, 99, 0.2)' : 'rgba(226, 232, 240, 0.8)'
                }`,
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
              }}
              onFocus={e => {
                e.target.style.borderColor = isDark ? '#60a5fa' : '#3b82f6';
                e.target.style.boxShadow = isDark
                  ? '0 0 0 3px rgba(96, 165, 250, 0.1)'
                  : '0 0 0 3px rgba(59, 130, 246, 0.1)';
              }}
              onBlur={e => {
                e.target.style.borderColor = isDark
                  ? 'rgba(75, 85, 99, 0.2)'
                  : 'rgba(226, 232, 240, 0.8)';
                e.target.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
              }}
              placeholder={t('admin.users.searchPlaceholder')}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="absolute inset-y-0 right-0 flex items-center pr-3 transition-all duration-200 hover:bg-opacity-10"
                onClick={() => setSearchTerm('')}
                style={{
                  color: themeStyles.colors.text.secondary,
                  background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                  borderRadius: '0.5rem',
                  marginRight: '0.25rem',
                }}
              >
                <FiX className="h-5 w-5" />
              </motion.button>
            )}
          </div>

          {/* Filter Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 rounded-lg px-4 py-2 transition-colors duration-200"
            style={{
              background: showFilters
                ? isDark
                  ? 'rgba(59, 130, 246, 0.2)'
                  : 'rgba(59, 130, 246, 0.1)'
                : isDark
                  ? 'rgba(31, 41, 55, 0.6)'
                  : 'rgba(243, 244, 246, 0.8)',
              color: showFilters
                ? isDark
                  ? '#60a5fa'
                  : '#3b82f6'
                : themeStyles.colors.text.secondary,
              border: `1px solid ${
                showFilters
                  ? isDark
                    ? 'rgba(59, 130, 246, 0.4)'
                    : 'rgba(59, 130, 246, 0.2)'
                  : 'transparent'
              }`,
            }}
            onClick={toggleFilters}
          >
            <FiFilter className="h-5 w-5" />
            <span>{t('admin.users.filters.title')}</span>
            {activeFiltersCount > 0 && (
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold"
                style={{
                  background: isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)',
                  color: isDark ? '#60a5fa' : '#3b82f6',
                }}
              >
                {activeFiltersCount}
              </span>
            )}
          </motion.button>

          {/* Refresh Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 rounded-lg px-4 py-2 transition-colors duration-200"
            style={{
              background: isDark ? 'rgba(31, 41, 55, 0.6)' : 'rgba(243, 244, 246, 0.8)',
              color: themeStyles.colors.text.secondary,
            }}
            onClick={refreshUsers}
            disabled={isRefreshing}
          >
            <FiRefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{t('admin.users.refresh')}</span>
          </motion.button>

          {/* Add User Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="ml-auto flex items-center gap-2 rounded-lg px-4 py-2 transition-colors duration-200"
            style={{
              background: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
              color: isDark ? '#60a5fa' : '#3b82f6',
            }}
            onClick={openAddModal}
          >
            <FiUserPlus className="h-5 w-5" />
            <span>{t('admin.users.addUser')}</span>
          </motion.button>
        </div>

        {/* Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className=""
            >
              <div
                className="mb-4 rounded-lg p-4"
                style={{
                  background: isDark ? 'rgba(31, 41, 55, 0.4)' : 'rgba(249, 250, 251, 0.8)',
                  border: `1px solid ${
                    isDark ? 'rgba(75, 85, 99, 0.2)' : 'rgba(226, 232, 240, 0.8)'
                  }`,
                }}
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3
                    className="text-lg font-medium"
                    style={{ color: themeStyles.colors.text.primary }}
                  >
                    {t('admin.users.filters.title')}
                  </h3>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="rounded-md px-3 py-1 text-sm transition-colors duration-200"
                    onClick={resetFilters}
                    style={{
                      background: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)',
                      color: isDark ? '#60a5fa' : '#3b82f6',
                      border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)'}`,
                    }}
                  >
                    {t('admin.users.filters.reset')}
                  </motion.button>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  {/* Role Filter */}
                  <div>
                    <label
                      className="mb-1 block text-sm font-medium"
                      style={{ color: themeStyles.colors.text.secondary }}
                    >
                      {t('admin.users.filters.role')}
                    </label>

                    <CustomDropdown
                      options={roleOptions}
                      value={filters.role}
                      onChange={v => handleFilterChange('role', v)}
                      placeholder={t('admin.users.filters.role')}
                      isDark={isDark}
                    />
                  </div>

                  {/* Permission Filter */}
                  <div>
                    <label
                      className="mb-1 block text-sm font-medium"
                      style={{ color: themeStyles.colors.text.secondary }}
                    >
                      {t('admin.users.filters.permission')}
                    </label>

                    <CustomDropdown
                      options={[
                        { value: '', label: t('admin.users.filters.anyPermission') },
                        ...permissionOptions,
                      ]}
                      value={filters.permission || ''}
                      onChange={v => handleFilterChange('permission', v || null)}
                      placeholder={t('admin.users.filters.permission')}
                      isDark={isDark}
                    />
                  </div>

                  {/* Permission Level Filter */}
                  <div>
                    <label
                      className="mb-1 block text-sm font-medium"
                      style={{ color: themeStyles.colors.text.secondary }}
                    >
                      {t('admin.users.filters.permissionLevel')}
                    </label>
                    <CustomDropdown
                      options={permissionLevelOptions}
                      value={filters.permissionLevel || ''}
                      onChange={v => handleFilterChange('permissionLevel', v || null)}
                      placeholder={t('admin.users.filters.permissionLevel')}
                      isDark={isDark}
                      disabled={!filters.permission}
                    />
                  </div>

                  {/* Sort By Filter */}
                  <div>
                    <label
                      className="mb-1 block text-sm font-medium"
                      style={{ color: themeStyles.colors.text.secondary }}
                    >
                      {t('admin.users.filters.sortBy')}
                    </label>
                    <div className="flex">
                      <CustomDropdown
                        options={[
                          { value: 'username', label: t('admin.users.table.username') },
                          { value: 'role', label: t('admin.users.table.role') },
                          { value: 'created', label: t('admin.users.filters.created') },
                        ]}
                        value={filters.sortBy || 'username'}
                        onChange={v => handleFilterChange('sortBy', v)}
                        placeholder={t('admin.users.filters.sortBy')}
                        isDark={isDark}
                      />
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="ml-2 flex items-center justify-center rounded-lg px-3 transition-all duration-200"
                        style={{
                          background: isDark ? 'rgba(31, 41, 55, 0.8)' : 'rgba(243, 244, 246, 0.8)',
                          color: themeStyles.colors.text.secondary,
                          border: `1px solid ${
                            isDark ? 'rgba(75, 85, 99, 0.2)' : 'rgba(226, 232, 240, 0.8)'
                          }`,
                        }}
                        onClick={toggleSortDirection}
                        title={
                          filters.sortDirection === 'asc'
                            ? t('admin.users.filters.ascending')
                            : t('admin.users.filters.descending')
                        }
                      >
                        {filters.sortDirection === 'asc' ? (
                          <FiArrowUp className="h-5 w-5" />
                        ) : (
                          <FiArrowDown className="h-5 w-5" />
                        )}
                      </motion.button>
                    </div>
                  </div>
                </div>

                {/* Active Filters Display */}
                {activeFiltersCount > 0 && (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span
                      className="text-sm font-medium"
                      style={{ color: themeStyles.colors.text.secondary }}
                    >
                      {t('admin.users.filters.active')}:
                    </span>

                    {filters.role !== 'all' && (
                      <span
                        className="flex items-center gap-1 rounded-full px-3 py-1 text-xs"
                        style={{
                          background: isDark
                            ? 'rgba(59, 130, 246, 0.2)'
                            : 'rgba(59, 130, 246, 0.1)',
                          color: isDark ? '#60a5fa' : '#3b82f6',
                        }}
                      >
                        {t('admin.users.filters.roleFilter')}:{' '}
                        {filters.role === 'admin'
                          ? t('admin.users.roles.admin')
                          : t('admin.users.roles.user')}
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleFilterChange('role', 'all')}
                          className="ml-1 rounded-full p-0.5 transition-all duration-200 hover:bg-opacity-20"
                          style={{
                            background: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                            color: 'inherit',
                          }}
                        >
                          <FiX size={12} />
                        </motion.button>
                      </span>
                    )}

                    {filters.permission && (
                      <span
                        className="flex items-center gap-1 rounded-full px-3 py-1 text-xs"
                        style={{
                          background: isDark
                            ? 'rgba(59, 130, 246, 0.2)'
                            : 'rgba(59, 130, 246, 0.1)',
                          color: isDark ? '#60a5fa' : '#3b82f6',
                        }}
                      >
                        {t('admin.users.filters.permissionFilter')}:{' '}
                        {permissionComponents.find(p => p.id === filters.permission)?.name ||
                          filters.permission}
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleFilterChange('permission', null)}
                          className="ml-1 rounded-full p-0.5 transition-all duration-200 hover:bg-opacity-20"
                          style={{
                            background: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                            color: 'inherit',
                          }}
                        >
                          <FiX size={12} />
                        </motion.button>
                      </span>
                    )}

                    {filters.permissionLevel && (
                      <span
                        className="flex items-center gap-1 rounded-full px-3 py-1 text-xs"
                        style={{
                          background: isDark
                            ? 'rgba(59, 130, 246, 0.2)'
                            : 'rgba(59, 130, 246, 0.1)',
                          color: isDark ? '#60a5fa' : '#3b82f6',
                        }}
                      >
                        {t('admin.users.filters.levelFilter')}:{' '}
                        {permissionLevels.find(l => l.id === filters.permissionLevel)?.name ||
                          filters.permissionLevel}
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleFilterChange('permissionLevel', null)}
                          className="ml-1 rounded-full p-0.5 transition-all duration-200 hover:bg-opacity-20"
                          style={{
                            background: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                            color: 'inherit',
                          }}
                        >
                          <FiX size={12} />
                        </motion.button>
                      </span>
                    )}

                    {searchTerm && (
                      <span
                        className="flex items-center gap-1 rounded-full px-3 py-1 text-xs"
                        style={{
                          background: isDark
                            ? 'rgba(59, 130, 246, 0.2)'
                            : 'rgba(59, 130, 246, 0.1)',
                          color: isDark ? '#60a5fa' : '#3b82f6',
                        }}
                      >
                        {t('admin.users.filters.searchFilter')}: "{searchTerm}"
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setSearchTerm('')}
                          className="ml-1 rounded-full p-0.5 transition-all duration-200 hover:bg-opacity-20"
                          style={{
                            background: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                            color: 'inherit',
                          }}
                        >
                          <FiX size={12} />
                        </motion.button>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* User List */}
      <UserList
        users={filteredUsers}
        isLoading={isLoading}
        onEditUser={openEditModal}
        onDeleteUser={openDeleteModal}
        isDark={isDark}
        themeStyles={themeStyles}
      />

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
