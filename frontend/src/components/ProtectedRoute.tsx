import { Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useUserPermissions } from '../hooks/useUserPermissions';
import { hasPermission, PermissionRequirement } from '../utils/permissionUtils';
import LoadingFallback from './LoadingFallback';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: PermissionRequirement;
  requireAdmin?: boolean;
}

const ProtectedRoute = ({
  children,
  requiredPermission,
  requireAdmin = false,
}: ProtectedRouteProps) => {
  const { data, isLoading: authLoading } = useAuth();
  const { data: user, isLoading: userLoading, error: userError } = useUserPermissions();
  const location = useLocation();

  if (authLoading || userLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0f1c]">
        <LoadingFallback message="Verifying your session..." size="small" />
      </div>
    );
  }

  // If there's an error fetching user permissions (e.g., 401), redirect to login
  if (userError) {
    return (
      <Navigate
        to="/login"
        state={{
          infoMessage: 'Your session has expired. Please sign in again.',
          from: location.pathname,
        }}
        replace
      />
    );
  }

  if (!data?.isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{
          infoMessage: 'Please sign in to continue',
          from: location.pathname,
        }}
        replace
      />
    );
  }

  // Check admin requirement
  if (requireAdmin && !user?.is_admin) {
    return (
      <Navigate
        to="/"
        state={{
          errorMessage: 'Access denied. Admin privileges required.',
        }}
        replace
      />
    );
  }

  // Check specific permission requirement
  if (requiredPermission && user) {
    const hasAccess = hasPermission(
      user.permissions,
      requiredPermission.component,
      requiredPermission.level
    );

    if (!hasAccess) {
      return (
        <Navigate
          to="/"
          state={{
            errorMessage: `Access denied. You don't have ${requiredPermission.level} permission for ${requiredPermission.component}.`,
          }}
          replace
        />
      );
    }
  }

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
