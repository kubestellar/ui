import { useQuery, useQueryClient } from '@tanstack/react-query';
import { VerifyToken } from '../api/auth';
import { AUTH_QUERY_KEY } from '../api/auth/constant';
import { api } from '../lib/api';
import { useState, useEffect } from 'react';

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
    },
  };
};

export const logout = () => {
  localStorage.removeItem('jwtToken');
  localStorage.setItem('tokenRemovalTime', Date.now().toString());
  window.dispatchEvent(new Event('storage'));
};

// Hook to check if the current user has admin privileges
export const useAdminCheck = () => {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { data: authData } = useAuth();

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!authData?.isAuthenticated) {
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem('jwtToken');
        if (!token) {
          setIsAdmin(false);
          setIsLoading(false);
          return;
        }

        const response = await api.get('/api/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setIsAdmin(response.data.is_admin === true);
        setIsLoading(false);
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
        setIsLoading(false);
      }
    };

    checkAdminStatus();
  }, [authData?.isAuthenticated]);

  return { isAdmin, isLoading };
};
