import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../lib/api";

interface ProtectedRouteProps {
  children: JSX.Element;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const location = useLocation();

  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem("jwtToken");

      if (!token) {
        setErrorMessage("Please sign in to continue");
        setIsAuthenticated(false);
        return;
      }

      try {
        const response = await api.get("/protected", {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
          signal: new AbortController().signal
        });

        if (response.status === 200) {
          setIsAuthenticated(true);
        } else {
          const errorMsg = response.data.error || "Your session has expired. Please sign in again.";
          setErrorMessage(errorMsg);
          setIsAuthenticated(false);
        }
      } catch (error) {
        if (error instanceof Error && error.name !== 'CanceledError') {
          setErrorMessage("Your session has expired. Please sign in again.");
          setIsAuthenticated(false);
          
          if (error.message.includes('401')) {
            localStorage.removeItem("jwtToken");
          }
        }
      }
    };

    if (isAuthenticated === null) {
      verifyToken();
    }

    // Cleanup function
    return () => {
    };
  }, [isAuthenticated]);

  // While checking authentication, return nothing or a minimal spinner
  // This reduces UI flicker and provides a smoother experience
  if (isAuthenticated === null) {
    return null;
  }

  // Redirect to login with error message in state if not authenticated
  if (isAuthenticated === false) {
    return (
      <Navigate 
        to="/login" 
        state={{ 
          errorMessage,
          from: location.pathname // Store the attempted path for redirect after login
        }} 
        replace 
      />
    );
  }

  // Render the protected content with a fade-in effect
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="protected-content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default ProtectedRoute;