import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import LoadingFallback from "./LoadingFallback";
import { motion, AnimatePresence } from "framer-motion";

interface PublicRouteProps {
  children: JSX.Element;
}

const PublicRoute = ({ children }: PublicRouteProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const location = useLocation();

  useEffect(() => {
    const verifyToken = async () => {
      setIsLoading(true);
      const token = localStorage.getItem("jwtToken");

      if (!token) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch("http://localhost:4000/api/me", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });

        setIsAuthenticated(response.ok);
      } catch (error) {
        setIsAuthenticated(false);
        console.error("Public route error:", error);
      } finally {
        // Add a small delay to make transitions feel more natural
        setTimeout(() => setIsLoading(false), 300);
      }
    };

    verifyToken();
  }, []);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0f1c]">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <LoadingFallback 
            message="Preparing your experience..." 
            size="medium" 
          />
        </motion.div>
      </div>
    );
  }

  // Get the location state for redirecting after login if needed
  const { from } = location.state || { from: "/" };

  // Redirect to home or previous location if authenticated
  if (isAuthenticated) {
    return <Navigate to={from} replace />; 
  }

  // Render the public route with a fade-in effect
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="public-content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default PublicRoute;