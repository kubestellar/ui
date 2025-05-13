import { useQuery, useQueryClient } from '@tanstack/react-query';
import { VerifyToken } from '../api/auth';
import { AUTH_QUERY_KEY } from '../api/auth/constant';

export const useAuth = () => {
  return useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: async () => {
      const token = localStorage.getItem('jwtToken');

      if (!token) {
        return { isAuthenticated: false };
      }
      
      try {
        await VerifyToken(token);
        return { isAuthenticated: true };
      } catch (error) {
        return { isAuthenticated: false, error };
      }
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 1,
  });
};

export const useAuthActions = () => {
  const queryClient = useQueryClient();
  
  return {
    logout: () => {
      localStorage.removeItem('jwtToken');
      localStorage.setItem('tokenRemovalTime', Date.now().toString());
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
    },
    refreshAuth: () => {
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
    }
  };
};

export const logout = () => {
  localStorage.removeItem('jwtToken');
  localStorage.setItem('tokenRemovalTime', Date.now().toString());
  window.dispatchEvent(new Event('storage'));
}; 