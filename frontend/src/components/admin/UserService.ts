import { api } from '../../lib/api';
import { User } from './UserTypes';

const getAuthHeader = () => {
  const token = localStorage.getItem('jwtToken');
  if (!token) throw new Error('No authentication token found');
  return { Authorization: `Bearer ${token}` };
};

export const UserService = {
  /**
   * Fetch all users
   * @returns Promise with array of users
   */
  fetchUsers: async (): Promise<User[]> => {
    try {
      const response = await api.get('/api/admin/users', {
        headers: { ...getAuthHeader() },
      });
      return Array.isArray(response.data.users) ? response.data.users : [];
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },

  /**
   * Create a new user
   * @param username - Username for the new user
   * @param password - Password for the new user
   * @param isAdmin - Whether the user should have admin privileges
   * @param permissions - User's component permissions
   * @returns Promise with the created user
   */
  createUser: async (
    username: string,
    password: string,
    isAdmin: boolean,
    permissions: Record<string, string>
  ): Promise<void> => {
    try {
      await api.post(
        '/api/admin/users',
        {
          username,
          password,
          is_admin: isAdmin,
          permissions,
        },
        {
          headers: { ...getAuthHeader() },
        }
      );
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },

  /**
   * Update an existing user
   * @param username - Username of the user to update
   * @param data - Data to update (username, password, is_admin)
   * @returns Promise with the updated user
   */
  updateUser: async (
    username: string,
    data: { username?: string; password?: string; is_admin?: boolean }
  ): Promise<void> => {
    try {
      await api.put(`/api/admin/users/${username}`, data, {
        headers: { ...getAuthHeader() },
      });
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  },

  /**
   * Update a user's permissions
   * @param username - Username of the user to update permissions for
   * @param permissions - New permissions object
   * @returns Promise with the updated permissions
   */
  updateUserPermissions: async (
    username: string,
    permissions: Record<string, string>
  ): Promise<void> => {
    try {
      await api.put(
        `/api/admin/users/${username}/permissions`,
        { permissions },
        {
          headers: { ...getAuthHeader() },
        }
      );
    } catch (error) {
      console.error('Error updating user permissions:', error);
      throw error;
    }
  },

  /**
   * Delete a user
   * @param username - Username of the user to delete
   * @returns Promise indicating success
   */
  deleteUser: async (username: string): Promise<void> => {
    try {
      await api.delete(`/api/admin/users/${username}`, {
        headers: { ...getAuthHeader() },
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  },

  /**
   * Get permissions for a specific user
   * @param username - Username to get permissions for
   * @returns Promise with the user's permissions
   */
  getUserPermissions: async (username: string): Promise<Record<string, string>> => {
    try {
      const response = await api.get(`/api/admin/users/${username}/permissions`, {
        headers: { ...getAuthHeader() },
      });
      return response.data.permissions || {};
    } catch (error) {
      console.error('Error fetching user permissions:', error);
      throw error;
    }
  },
};

export default UserService;
