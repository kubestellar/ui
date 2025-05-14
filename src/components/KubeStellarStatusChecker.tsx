import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../lib/api';

interface KubeStellarStatusCheckerProps {
  children: React.ReactNode;
}

const KubeStellarStatusChecker = ({ children }: KubeStellarStatusCheckerProps) => {
  const [isChecking, setIsChecking] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkInstallation = async () => {
      try {
        const { data } = await api.get('/api/kubestellar/status');
        
        // If on login page and KubeStellar is not installed, redirect to install page
        if (location.pathname === '/login' && !data.allReady) {
          navigate('/install');
        }
        
        // If on install page and KubeStellar is installed, redirect to login
        if (location.pathname === '/install' && data.allReady) {
          navigate('/login');
        }
        
        // If user accesses root path and KubeStellar is not installed, redirect to install page
        if ((location.pathname === '/' || location.pathname === '') && !data.allReady) {
          navigate('/install');
          return;
        }
        
        // Prevent infinite loop, if not at login or install, check other paths
        if (!['/login', '/install', '/', ''].includes(location.pathname) && !data.allReady) {
          navigate('/install');
        }
      } catch (error) {
        console.error('Error checking KubeStellar status:', error);
        
        // On error, redirect to installation page to be safe
        if (!['/install'].includes(location.pathname)) {
          navigate('/install');
        }
      } finally {
        setIsChecking(false);
      }
    };

    checkInstallation();
  }, [navigate, location.pathname]);

  // If still checking, show nothing and wait
  if (isChecking) {
    return null;
  }

  // Otherwise, render children
  return <>{children}</>;
};

export default KubeStellarStatusChecker; 