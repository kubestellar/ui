/**
 * User Management Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const userManagementConfig: UnifiedCardConfig = {
  type: 'user_management',
  title: 'User Management',
  category: 'security',
  description: 'Manage console users',
  icon: 'Users',
  iconColor: 'text-blue-400',
  defaultWidth: 6,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useUserManagement' },
  content: { type: 'custom', component: 'UserManagementUI' },
  emptyState: { icon: 'Users', title: 'No Users', message: 'No users configured', variant: 'info' },
  loadingState: { type: 'custom' },
  isDemoData: false,
  isLive: false,
}
export default userManagementConfig
