import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

export interface ActivityItem {
  type: 'user';
  name: string;
  timestamp: string;
  status: 'Created' | 'Updated';
}

// Define proper type instead of `any`
interface APIUser {
  username: string;
  created_at: string;
  updated_at: string;
}

export const useUserActivityQuery = () => {
  return useQuery<ActivityItem[]>({
    queryKey: ['userActivity'],
    queryFn: async () => {
      // Get JWT token from localStorage
      const token = localStorage.getItem('jwtToken');
      if (!token) {
        console.warn('No auth token found in localStorage.');
        return [];
      }

      console.log('[useUserActivityQuery] Fetching user activity...');
      const response = await api.get('/api/admin/users', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const users: APIUser[] = response.data.users || [];
      console.log(`[useUserActivityQuery] Received ${users.length} users`);

      const activities: ActivityItem[] = users.map(user => {
        const created = new Date(user.created_at).toISOString();
        const updated = new Date(user.updated_at).toISOString();
        const isCreated = created === updated;

        const activity: ActivityItem = {
          type: 'user',
          name: user.username,
          timestamp: isCreated ? created : updated,
          status: isCreated ? 'Created' : 'Updated',
        };

        console.log(`[useUserActivityQuery] Processed activity:`, activity);
        return activity;
      });

      // Sort by latest timestamp
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return activities;
    },
  });
};

export const useDeletedUsersActivityQuery = () => {
  return useQuery<ActivityItem[]>({
    queryKey: ['deletedUserActivity'],
    queryFn: async () => {
      const logs = localStorage.getItem('deletedUserLogs');
      const parsed: ActivityItem[] = logs ? JSON.parse(logs) : [];

      // Optional: sort by timestamp
      parsed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      console.log(parsed);

      return parsed;
    },
  });
};
