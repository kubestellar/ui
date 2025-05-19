import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, User, Globe } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useLogin } from '../../hooks/queries/useLogin';

const LoginForm = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({
    username: '',
    password: '',
  });
  const renderStartTime = useRef<number>(performance.now());
  const navigate = useNavigate();
  const location = useLocation();
  const { mutate: login, isPending } = useLogin();

  useEffect(() => {
    console.log(
      `[LoginForm] Component mounted at ${performance.now() - renderStartTime.current}ms`
    );
    const savedUsername = localStorage.getItem('rememberedUsername');
    const savedPassword = localStorage.getItem('rememberedPassword');

    if (savedUsername && savedPassword) {
      try {
        const decodedPassword = atob(savedPassword);
        setUsername(savedUsername);
        setPassword(decodedPassword);
        setRememberMe(true);
        console.log(
          `[LoginForm] Loaded remembered credentials at ${performance.now() - renderStartTime.current}ms`
        );
      } catch (error) {
        console.error(
          `[LoginForm] Error decoding stored credentials at ${performance.now() - renderStartTime.current}ms:`,
          error
        );
        localStorage.removeItem('rememberedUsername');
        localStorage.removeItem('rememberedPassword');
      }
    }
  }, []);

  useEffect(() => {
    if (location.state) {
      const { errorMessage, infoMessage, from } = location.state as {
        errorMessage?: string;
        infoMessage?: string;
        from?: string;
      };

      if (from) {
        localStorage.setItem('redirectAfterLogin', from);
        console.log(
          `[LoginForm] Stored redirect path "${from}" at ${performance.now() - renderStartTime.current}ms`
        );
      }

      if (errorMessage) {
        toast.error(errorMessage, { id: 'auth-redirect-error' });
        console.log(
          `[LoginForm] Displayed error message "${errorMessage}" at ${performance.now() - renderStartTime.current}ms`
        );
        navigate(location.pathname, { replace: true, state: {} });
      }

      if (infoMessage) {
        toast.success(infoMessage, { id: 'auth-redirect-info' });
        console.log(
          `[LoginForm] Displayed info message "${infoMessage}" at ${performance.now() - renderStartTime.current}ms`
        );
        navigate(location.pathname, { replace: true, state: {} });
      }
    }

    const tokenRemovalTime = localStorage.getItem('tokenRemovalTime');
    if (tokenRemovalTime) {
      localStorage.removeItem('tokenRemovalTime');
      console.log(
        `[LoginForm] Cleared token removal time at ${performance.now() - renderStartTime.current}ms`
      );
    }
  }, [location, navigate]);

  const validateForm = () => {
    const newErrors = {
      username: '',
      password: '',
    };

    if (!username.trim()) {
      newErrors.username = 'Username is required';
    }

    if (!password.trim()) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return !newErrors.username && !newErrors.password;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      console.log(
        `[LoginForm] Form validation failed at ${performance.now() - renderStartTime.current}ms`
      );
      return;
    }

    console.log(
      `[LoginForm] Form submission started at ${performance.now() - renderStartTime.current}ms`
    );
    toast.dismiss();
    toast.loading('Signing in...', { id: 'auth-loading' });

    login({ username, password, rememberMe });
  };

  // JSX remains unchanged
  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="group relative">
          <User
            className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300/80 transition-colors duration-200 group-focus-within:text-blue-400"
            size={18}
          />
          <input
            type="text"
            value={username}
            onChange={e => {
              setUsername(e.target.value);
              setErrors(prev => ({ ...prev, username: '' }));
            }}
            placeholder="Username"
            className={`w-full border bg-[#1a1f2e] py-3.5 pl-10 pr-4 ${
              errors.username ? 'border-red-400' : 'border-blue-300/20'
            } [&:-webkit-autofill]:!-webkit-text-fill-color-white rounded-xl text-white placeholder-blue-200/70 shadow-sm transition-all duration-200 
            [-webkit-text-fill-color:white] focus:border-blue-400 focus:outline-none
            focus:ring-1
            focus:ring-blue-400/30
            [&:-webkit-autofill]:!text-white
            [&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_#1a1f2e]
            [&:-webkit-autofill]:[transition:_background-color_9999s_ease-in-out_0s]`}
            required
          />
        </div>
        {errors.username && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="ml-2 mt-1.5 flex items-center text-xs text-red-400"
          >
            <span className="mr-1">•</span>
            {errors.username}
          </motion.p>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="group relative">
          <Lock
            className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300/80 transition-colors duration-200 group-focus-within:text-blue-400"
            size={18}
          />
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => {
              setPassword(e.target.value);
              setErrors(prev => ({ ...prev, password: '' }));
            }}
            placeholder="Password"
            className={`w-full border bg-[#1a1f2e] py-3.5 pl-10 pr-12 ${
              errors.password ? 'border-red-400' : 'border-blue-300/20'
            } [&:-webkit-autofill]:!-webkit-text-fill-color-white [-ms-reveal]:hidden rounded-xl text-white placeholder-blue-200/70 shadow-sm transition-all 
            duration-200 [-webkit-text-fill-color:white] focus:border-blue-400
            focus:outline-none
            focus:ring-1
            focus:ring-blue-400/30
            [&:-webkit-autofill]:!text-white
            [&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_#1a1f2e]
            [&:-webkit-autofill]:[transition:_background-color_9999s_ease-in-out_0s]
            [&::-ms-clear]:hidden
            [&::-ms-reveal]:hidden`}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent text-blue-300/70 transition-colors duration-200 hover:text-blue-300"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {errors.password && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="ml-2 mt-1.5 flex items-center text-xs text-red-400"
          >
            <span className="mr-1">•</span>
            {errors.password}
          </motion.p>
        )}
      </motion.div>

      <motion.div
        className="mt-2 flex items-center text-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center">
          <input
            type="checkbox"
            id="remember"
            checked={rememberMe}
            onChange={e => setRememberMe(e.target.checked)}
            className="h-4 w-4 rounded-md border-blue-300/30 bg-white/5 text-blue-500 focus:ring-blue-500/50"
          />
          <label htmlFor="remember" className="ml-2 cursor-pointer text-blue-200/80">
            Remember me
          </label>
        </div>
      </motion.div>

      <motion.button
        type="submit"
        className="relative mt-6 flex w-full transform items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-blue-500 via-blue-600 to-[#6236FF] px-4 py-3.5 font-medium text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:from-blue-600 hover:via-blue-700 hover:to-[#7a52ff] hover:shadow-blue-500/25 disabled:cursor-not-allowed disabled:opacity-50"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        disabled={isPending}
      >
        {isPending ? (
          <>
            <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            <span>Signing in...</span>
          </>
        ) : (
          <>
            <Globe size={18} className="text-white/90" />
            <span>Sign In to KubeStellar</span>
          </>
        )}
        <span className="absolute left-0 top-0 h-full w-full bg-gradient-to-r from-white/10 to-transparent opacity-0 transition-opacity duration-300 hover:opacity-100"></span>
      </motion.button>
    </form>
  );
};

export default LoginForm;
