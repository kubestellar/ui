import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { User } from '../components/admin/UserTypes';

/**
 * Hook to fetch the current user's information including permissions
 * @returns Query result containing user data with permissions
 */
export const useUserPermissions = () => {
  return useQuery({
    queryKey: ['user', 'permissions'],
    queryFn: async () => {
      const response = await api.get<User>('/api/me');
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    enabled: !!localStorage.getItem('jwtToken'),
    retry: 1,
  });
};
