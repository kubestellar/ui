import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, User, Globe } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const LoginForm = () => {
  // Form state
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [usernameError, setUsernameError] = useState(false);
  const [usernameErrorMessage, setUsernameErrorMessage] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  
  // Hooks for navigation
  const navigate = useNavigate();
  const location = useLocation();

  // Load remembered username if available
  useEffect(() => {
    const savedUsername = localStorage.getItem("rememberedUsername");
    if (savedUsername) {
      setUsername(savedUsername);
      setRememberMe(true);
    }
  }, []);

  // Check for redirects, error messages, or info messages on component mount
  useEffect(() => {
    if (location.state) {
      const { errorMessage, infoMessage, from } = location.state as { 
        errorMessage?: string;
        infoMessage?: string;
        from?: string;
      };
      
      // Store destination path to redirect after login
      if (from) {
        localStorage.setItem("redirectAfterLogin", from);
      }
      
      // Display custom error message
      if (errorMessage) {
        toast.error(errorMessage, {
          id: 'auth-redirect-error'
        });
        
        // Clear state after showing message to prevent showing it again on refresh
        navigate(location.pathname, { replace: true, state: {} });
      }
      
      // Display info message (for successful logout, etc.)
      if (infoMessage) {
        toast.success(infoMessage, {
          id: 'auth-redirect-info'
        });
        
        // Clear state after showing message
        navigate(location.pathname, { replace: true, state: {} });
      }
    }

    // Check if there was a recently removed token (indicating logout)
    const tokenRemovalTime = localStorage.getItem("tokenRemovalTime");
    if (tokenRemovalTime) {
      localStorage.removeItem("tokenRemovalTime");
    }
  }, [location, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form - only username is required
    if (!username.trim()) {
      setUsernameError(true);
      setUsernameErrorMessage("Please enter username");
      toast.error('Please enter your username', {
        id: 'username-error'
      });
      return;
    }
    
    setIsLoading(true);
    
    // Dismiss any existing toasts to prevent cluttering
    toast.dismiss();
    
    // Create loading toast that will be updated
    const loadingToastId = toast.loading('Signing in...', {
      id: 'auth-loading'
    });
    
    try {
      // Attempt login - sending password only if it has a value
      const loginData = password.trim() 
        ? { username, password } 
        : { username };
      
      const loginResponse = await fetch("http://localhost:4000/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginData),
      });

      const responseData = await loginResponse.json();

      if (loginResponse.ok) {
        // Store token
        localStorage.setItem("jwtToken", responseData.token);
        
        // Handle remember me functionality
        if (rememberMe) {
          localStorage.setItem("rememberedUsername", username);
        } else {
          localStorage.removeItem("rememberedUsername");
        }
        
        // Verify token is valid
        const token = localStorage.getItem("jwtToken");
        const protectedResponse = await fetch("http://localhost:4000/protected", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });

        const protectedData = await protectedResponse.json();

        if (protectedResponse.ok) {
          // Success! Update the loading toast to success
          toast.success('Login successful', { id: loadingToastId });
          
          // Get redirect path (if any) or default to home
          const redirectPath = localStorage.getItem("redirectAfterLogin") || "/";
          localStorage.removeItem("redirectAfterLogin"); // Clear stored path
          
          setTimeout(() => {
            navigate(redirectPath);
          }, 1000);
        } else {
          // Token verification failed
          toast.error(protectedData.error || "Authentication failed", { id: loadingToastId });
          localStorage.removeItem("jwtToken");
        }

        // Clear any form errors
        setUsernameError(false);
        setPasswordError(false);
      } else {
        // Login failed
        setPasswordError(true);
        toast.error(responseData.error || "Invalid credentials. Please try again.", { id: loadingToastId });
      }
    } catch (error) {
      // Network or other error
      setPasswordError(true);
      toast.error("Network error. Please check your connection and try again.", { id: loadingToastId });
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-5">
        <motion.div 
          className="relative group"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <User className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300/80 group-focus-within:text-blue-400 transition-colors duration-200" size={18} />
          <input
            type="text"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setUsernameError(false);
              setUsernameErrorMessage("");
            }}
            placeholder="Username"
            className={`w-full pl-10 pr-4 py-3.5 bg-white/5 backdrop-blur-sm border ${
              usernameError ? "border-red-400" : "border-blue-300/20"
            } rounded-xl focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 text-white placeholder-blue-200/70 transition-all duration-200 shadow-sm`}
            required
          />
          {usernameError && (
            <motion.p 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-400 text-xs mt-1.5 ml-2 flex items-center"
            >
              <span className="mr-1">•</span>{usernameErrorMessage}
            </motion.p>
          )}
        </motion.div>

        <motion.div 
          className="relative group"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300/80 group-focus-within:text-blue-400 transition-colors duration-200" size={18} />
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setPasswordError(false);
            }}
            placeholder="Password"
            className={`w-full pl-10 pr-12 py-3.5 bg-white/5 backdrop-blur-sm border ${
              passwordError ? "border-red-400" : "border-blue-300/20"
            } rounded-xl focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 text-white placeholder-blue-200/70 transition-all duration-200 shadow-sm`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-300/70 hover:text-blue-300 transition-colors duration-200"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
          {passwordError && (
            <motion.p 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-400 text-xs mt-1.5 ml-2 flex items-center"
            >
              <span className="mr-1">•</span>Invalid username or password
            </motion.p>
          )}
        </motion.div>

        <motion.div 
          className="flex items-center text-sm mt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center">
            <input
              type="checkbox"
              id="remember"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded-md border-blue-300/30 bg-white/5 text-blue-500 focus:ring-blue-500/50"
            />
            <label htmlFor="remember" className="ml-2 text-blue-200/80 cursor-pointer">
              Remember me
            </label>
          </div>
        </motion.div>

        <motion.button
          type="submit"
          className="w-full mt-6 py-3.5 px-4 bg-gradient-to-r from-blue-500 via-blue-600 to-[#6236FF] text-white rounded-xl font-medium hover:from-blue-600 hover:via-blue-700 hover:to-[#7a52ff] transition-all duration-300 shadow-lg hover:shadow-blue-500/25 flex items-center justify-center gap-2 relative overflow-hidden transform hover:-translate-y-0.5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <Globe size={18} className="text-white/90" />
              <span>Sign In to KubeStellar</span>
            </>
          )}
          
          {/* Add subtle button accents */}
          <span className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></span>
        </motion.button>
      </form>
    </>
  );
};

export default LoginForm;