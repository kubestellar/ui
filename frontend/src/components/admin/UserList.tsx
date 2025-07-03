import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiEdit, FiTrash2, FiUsers, FiShield, FiUser, FiKey } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { User, ThemeStyles } from './UserTypes';

interface UserListProps {
  users: User[];
  isLoading: boolean;
  onEditUser: (user: User) => void;
  onDeleteUser: (user: User) => void;
  isDark: boolean;
  themeStyles: ThemeStyles;
}

const UserList: React.FC<UserListProps> = ({
  users,
  isLoading,
  onEditUser,
  onDeleteUser,
  isDark,
  themeStyles,
}) => {
  const { t } = useTranslation();
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center p-6">
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

  if (users.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex min-h-[300px] flex-col items-center justify-center p-8 text-center"
        style={{ color: themeStyles.colors.text.tertiary }}
      >
        <div
          className="mb-5 flex h-20 w-20 items-center justify-center rounded-full"
          style={{
            background: isDark ? 'rgba(31, 41, 55, 0.5)' : 'rgba(243, 244, 246, 0.8)',
          }}
        >
          <FiUsers size={40} className="opacity-60" />
        </div>
        <p className="text-xl font-medium">{t('admin.users.noUsers')}</p>
        <p className="mt-3 max-w-md text-sm">{t('admin.users.noUsersDescription')}</p>
      </motion.div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full table-auto">
        <thead
          style={{
            background: isDark ? 'rgba(31, 41, 55, 0.6)' : 'rgba(243, 244, 246, 0.6)',
            color: themeStyles.colors.text.secondary,
          }}
        >
          <tr>
            <th className="px-6 py-3.5 text-left text-xs font-medium uppercase tracking-wider">
              {t('admin.users.table.username')}
            </th>
            <th className="px-6 py-3.5 text-left text-xs font-medium uppercase tracking-wider">
              {t('admin.users.table.role')}
            </th>
            <th className="px-6 py-3.5 text-left text-xs font-medium uppercase tracking-wider">
              {t('admin.users.table.permissions')}
            </th>
            <th className="px-6 py-3.5 text-right text-xs font-medium uppercase tracking-wider">
              {t('admin.users.table.actions')}
            </th>
          </tr>
        </thead>
        <tbody
          style={{
            color: themeStyles.colors.text.primary,
          }}
        >
          {users.map((user, index) => (
            <motion.tr
              key={user.username}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              onMouseEnter={() => setHoveredRow(user.username)}
              onMouseLeave={() => setHoveredRow(null)}
              className="transition-colors duration-150"
              style={{
                background:
                  hoveredRow === user.username
                    ? isDark
                      ? 'rgba(55, 65, 81, 0.3)'
                      : 'rgba(243, 244, 246, 0.8)'
                    : index % 2 === 0
                      ? 'transparent'
                      : isDark
                        ? 'rgba(31, 41, 55, 0.3)'
                        : 'rgba(249, 250, 251, 0.5)',
                borderBottom: `1px solid ${
                  isDark ? 'rgba(75, 85, 99, 0.2)' : 'rgba(226, 232, 240, 0.5)'
                }`,
              }}
            >
              <td className="whitespace-nowrap px-6 py-4 text-sm">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-full"
                    style={{
                      background: user.is_admin
                        ? isDark
                          ? 'rgba(59, 130, 246, 0.15)'
                          : 'rgba(59, 130, 246, 0.08)'
                        : isDark
                          ? 'rgba(99, 102, 241, 0.15)'
                          : 'rgba(99, 102, 241, 0.08)',
                    }}
                  >
                    {user.is_admin ? (
                      <FiShield
                        size={16}
                        style={{
                          color: isDark ? '#60a5fa' : '#3b82f6',
                        }}
                      />
                    ) : (
                      <FiUser
                        size={16}
                        style={{
                          color: isDark ? '#a5b4fc' : '#6366f1',
                        }}
                      />
                    )}
                  </div>
                  <span
                    className="font-medium"
                    style={{
                      color: user.is_admin
                        ? isDark
                          ? '#60a5fa'
                          : '#3b82f6'
                        : themeStyles.colors.text.primary,
                    }}
                  >
                    {user.username}
                  </span>
                </div>
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm">
                {user.is_admin ? (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                    style={{
                      background: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.08)',
                      color: isDark ? '#60a5fa' : '#3b82f6',
                    }}
                  >
                    <FiShield size={12} />
                    {t('admin.users.roles.admin')}
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                    style={{
                      background: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.08)',
                      color: isDark ? '#a5b4fc' : '#6366f1',
                    }}
                  >
                    <FiUser size={12} />
                    {t('admin.users.roles.user')}
                  </span>
                )}
              </td>
              <td className="px-6 py-4 text-sm">
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(user.permissions || {}).map(([component, permission]) => (
                    <span
                      key={component}
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        background:
                          permission === 'write'
                            ? isDark
                              ? 'rgba(16, 185, 129, 0.15)'
                              : 'rgba(16, 185, 129, 0.08)'
                            : isDark
                              ? 'rgba(59, 130, 246, 0.15)'
                              : 'rgba(59, 130, 246, 0.08)',
                        color:
                          permission === 'write'
                            ? isDark
                              ? '#34d399'
                              : '#10b981'
                            : isDark
                              ? '#60a5fa'
                              : '#3b82f6',
                      }}
                    >
                      <FiKey size={10} />
                      {component}:{' '}
                      {permission === 'write'
                        ? t('admin.users.permissions.levels.write')
                        : t('admin.users.permissions.levels.read')}
                    </span>
                  ))}
                  {Object.keys(user.permissions || {}).length === 0 && (
                    <span
                      className="text-xs italic"
                      style={{ color: themeStyles.colors.text.tertiary }}
                    >
                      {t('admin.users.noPermissions')}
                    </span>
                  )}
                </div>
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                <div className="flex justify-end gap-2">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onEditUser(user)}
                    className="rounded-md p-2 transition-colors duration-200"
                    style={{
                      background: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
                      color: isDark ? '#60a5fa' : '#3b82f6',
                    }}
                    title={t('admin.users.actions.edit')}
                  >
                    <FiEdit size={16} />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onDeleteUser(user)}
                    className="rounded-md p-2 transition-colors duration-200"
                    style={{
                      background: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)',
                      color: isDark ? '#f87171' : '#ef4444',
                    }}
                    title={t('admin.users.actions.delete')}
                  >
                    <FiTrash2 size={16} />
                  </motion.button>
                </div>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UserList;
