/**
 * Utilities for handling different runtime environments
 */

// Determine if the app is running in Electron
export const isElectronEnvironment = (): boolean => {
    return window.electron !== undefined;
  };
  
  // Get the API base URL based on the environment
  export const getApiBaseUrl = (): string => {
    if (isElectronEnvironment()) {
      // In Electron, we're always using the local backend
      return 'http://localhost:4000';
    }
    
    // In web environment, use the configured base URL
    return import.meta.env.VITE_BASE_URL || 'http://localhost:4000';
  };
  
  // Get appropriate app version
  export const getAppVersion = (): string => {
    if (isElectronEnvironment() && window.electron.getAppVersion) {
      return window.electron.getAppVersion();
    }
    return import.meta.env.VITE_APP_VERSION || '0.1.0';
  };
  
  // Returns true if we're in development mode
  export const isDevelopment = (): boolean => {
    return import.meta.env.DEV === true;
  };
  
  // Detect platform for UI customizations
  export const getPlatform = (): 'win' | 'mac' | 'linux' | 'web' => {
    if (!isElectronEnvironment()) {
      return 'web';
    }
    
    const platform = navigator.platform.toLowerCase();
    
    if (platform.includes('win')) {
      return 'win';
    }
    
    if (platform.includes('mac')) {
      return 'mac';
    }
    
    return 'linux';
  };