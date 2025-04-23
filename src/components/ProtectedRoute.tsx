import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

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
        const response = await fetch("http://localhost:4000/api/me", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });

        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          const data = await response.json();
          const errorMsg = data.error || "Your session has expired. Please sign in again.";
          setErrorMessage(errorMsg);
          setIsAuthenticated(false);
        }
      } catch (error) {
        const errorMsg = "Connection error. Please try again.";
        setErrorMessage(errorMsg);
        setIsAuthenticated(false);
        console.error("Protected route error:", error);
      }
    };

    verifyToken();
  }, []);

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