export type PermissionLevel = 'read' | 'write' | null;
export type PermissionsMap = Record<string, PermissionLevel>;

export interface PermissionRequirement {
  component: string;
  level: 'read' | 'write';
}

/**
 * Check if user has the required permission for a component
 * @param userPermissions - User's permission map
 * @param component - Component name (e.g., 'workloads', 'clusters', 'binding-policies')
 * @param requiredLevel - Required permission level ('read' or 'write')
 * @returns true if user has the required permission, false otherwise
 */
export function hasPermission(
  userPermissions: PermissionsMap,
  component: string,
  requiredLevel: 'read' | 'write' = 'read'
): boolean {
  const permission = userPermissions[component];

  if (!permission) return false;

  // 'write' permission includes 'read' access
  if (requiredLevel === 'read') {
    return permission === 'read' || permission === 'write';
  }

  return permission === 'write';
}

/**
 * Check if user has all required permissions
 * @param userPermissions - User's permission map
 * @param requirements - Array of permission requirements
 * @returns true if user has ALL required permissions, false otherwise
 */
export function hasAllPermissions(
  userPermissions: PermissionsMap,
  requirements: PermissionRequirement[]
): boolean {
  return requirements.every((req) => hasPermission(userPermissions, req.component, req.level));
}

/**
 * Check if user has any of the required permissions
 * @param userPermissions - User's permission map
 * @param requirements - Array of permission requirements
 * @returns true if user has ANY of the required permissions, false otherwise
 */
export function hasAnyPermission(
  userPermissions: PermissionsMap,
  requirements: PermissionRequirement[]
): boolean {
  return requirements.some((req) => hasPermission(userPermissions, req.component, req.level));
}
