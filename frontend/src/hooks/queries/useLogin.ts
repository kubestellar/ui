import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../../context/useWebSocket';
import toast from 'react-hot-toast';
import axios from 'axios';
import { LoginUser } from '../../api/auth';
import { AUTH_QUERY_KEY } from '../../api/auth/constant';
import { useTranslation } from 'react-i18next';
import { encryptData, secureSet, secureRemove } from '../../utils/secureStorage';
import { setAccessToken, setRefreshToken, clearTokens } from '../../components/login/tokenUtils';

interface LoginCredentials {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export const useLogin = () => {
  const navigate = useNavigate();
  const { connect, connectWecs } = useWebSocket();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ username, password, rememberMe = false }: LoginCredentials) => {
      try {
        const response = await LoginUser({ username, password });

        if (!response.token) {
          throw new Error(t('auth.login.noToken'));
        }
        setAccessToken(response.token);
        if (
          'refreshToken' in response &&
          typeof response.refreshToken === 'string' &&
          response.refreshToken
        ) {
          setRefreshToken(response.refreshToken);
        }

        if (rememberMe) {
          // Use secure storage with XSS protection
          secureSet('rememberedUsername', username);
          // Securely encrypt password with expiration
          const encryptedPassword = await encryptData(password);
          secureSet('rememberedPassword', encryptedPassword);
        } else {
          secureRemove('rememberedUsername');
          secureRemove('rememberedPassword');
        }

        return response;
      } catch (error) {
        console.error(t('auth.login.error'), error);
        throw error;
      }
    },
    onSuccess: data => {
      toast.dismiss('auth-loading');

      toast.success(t('auth.login.success'));

      // Connect to websockets with new token
      connect(true);
      connectWecs(true);

      // Update auth state
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });

      const redirectPath = localStorage.getItem('redirectAfterLogin') || '/';
      localStorage.removeItem('redirectAfterLogin');

      console.log(
        t('auth.login.successWithUser', {
          username: data.user.username,
          path: redirectPath,
        })
      );

      setTimeout(() => {
        navigate(redirectPath);
      }, 1000);
    },
    onError: error => {
      toast.dismiss('auth-loading');

      // Don't log the raw error to console to avoid showing technical details
      // console.error(t('auth.login.error'), error);

      let errorMessage = t('auth.login.invalidCredentials');

      if (axios.isAxiosError(error)) {
        // Handle different types of authentication errors
        if (error.response?.status === 401) {
          errorMessage = t('auth.login.invalidCredentials');
        } else if (error.response?.status === 400) {
          errorMessage = error.response?.data?.error || t('auth.login.invalidRequest');
        } else if (error.response?.status && error.response.status >= 500) {
          errorMessage = t('auth.login.serverError');
        } else {
          errorMessage =
            error.response?.data?.error ||
            error.response?.data?.message ||
            t('auth.login.authFailed');
        }
      } else if (error instanceof Error) {
        // For non-axios errors, use a generic message instead of the raw error
        errorMessage = t('auth.login.authFailed');
      }

      // Use a consistent toast ID to prevent duplicates
      toast.error(errorMessage, { id: 'login-error' });
    },
  });
};

export const logout = () => {
  clearTokens();
  localStorage.setItem('tokenRemovalTime', Date.now().toString());
  window.dispatchEvent(new Event('storage'));
};
