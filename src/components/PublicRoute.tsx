import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import PublicRouteSkeleton from "./ui/PublicRouteSkeleton";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../lib/api";

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
        await api.get("/api/me", {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });
        
        setIsAuthenticated(true);
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
    return <PublicRouteSkeleton />;
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