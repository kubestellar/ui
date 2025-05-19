import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../../context/WebSocketProvider';
import toast from 'react-hot-toast';
import axios from 'axios';
import { LoginUser, VerifyToken } from '../../api/auth';
import { AUTH_QUERY_KEY } from '../../api/auth/constant';

interface LoginCredentials {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export const useLogin = () => {
  const navigate = useNavigate();
  const { connect, connectWecs } = useWebSocket();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ username, password, rememberMe = false }: LoginCredentials) => {
      try {
        const response = await LoginUser({ username, password });

        if (!response.token) {
          throw new Error('No token received from server');
        }

        localStorage.setItem('jwtToken', response.token);

        if (rememberMe) {
          localStorage.setItem('rememberedUsername', username);
          localStorage.setItem('rememberedPassword', btoa(password));
        } else {
          localStorage.removeItem('rememberedUsername');
          localStorage.removeItem('rememberedPassword');
        }

        // Verify token to ensure it's valid
        try {
          const token = localStorage.getItem('jwtToken');
          if (token) {
            await VerifyToken(token);
          }
        } catch (verifyError) {
          console.error('Token verification failed:', verifyError);
          // Continue anyway since we just received the token
        }

        return response;
      } catch (error) {
        console.error('Login error:', error);
        throw error;
      }
    },
    onSuccess: data => {
      toast.dismiss('auth-loading');

      toast.success('Login successful');

      // Connect to websockets with new token
      connect(true);
      connectWecs(true);

      // Update auth state
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });

      const redirectPath = localStorage.getItem('redirectAfterLogin') || '/';
      localStorage.removeItem('redirectAfterLogin');

      console.log(
        `Login successful for user: ${data.user.username}. Redirecting to ${redirectPath}`
      );

      setTimeout(() => {
        navigate(redirectPath);
      }, 1000);
    },
    onError: error => {
      toast.dismiss('auth-loading');
      console.error('Login error:', error);

      let errorMessage = 'Invalid credentials';

      if (axios.isAxiosError(error)) {
        errorMessage =
          error.response?.data?.error ||
          error.response?.data?.message ||
          'Authentication failed. Please check your credentials.';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
    },
  });
};
