import { Navigate, useLocation } from "react-router-dom";
import LoadingFallback from "./LoadingFallback";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../hooks/useAuth";

interface PublicRouteProps {
  children: JSX.Element;
}

const PublicRoute = ({ children }: PublicRouteProps) => {
  const { data, isLoading } = useAuth();
  const location = useLocation();

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
  if (data?.isAuthenticated) {
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