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
      const response = await LoginUser({ username, password });
      
      localStorage.setItem('jwtToken', response.token);
      
      if (rememberMe) {
        localStorage.setItem('rememberedUsername', username);
        localStorage.setItem('rememberedPassword', btoa(password));
      } else {
        localStorage.removeItem('rememberedUsername');
        localStorage.removeItem('rememberedPassword');
      }
      
      const token = localStorage.getItem('jwtToken');
      if (token) {
        await VerifyToken(token);
      }
      
      return response;
    },
    onSuccess: () => {
      toast.dismiss('auth-loading');
      
      toast.success('Login successful');
      
      connect(true);
      connectWecs(true);
      
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
      
      const redirectPath = localStorage.getItem('redirectAfterLogin') || '/';
      localStorage.removeItem('redirectAfterLogin');
      
      setTimeout(() => {
        navigate(redirectPath);
      }, 1000);
    },
    onError: (error) => {
      toast.dismiss('auth-loading');
      console.log('error', error);
      const errorMessage = axios.isAxiosError(error)
        ? error.response?.data?.error || 'Invalid credentials'
        : 'Invalid credentials';
      
      toast.error(errorMessage);
    },
  });
}; 