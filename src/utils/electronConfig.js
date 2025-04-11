/**
 * This file provides configuration specific to the Electron environment
 */

// Check if we're running in Electron
export const isElectron = () => {
    return window.electron !== undefined;
  };
  
  // Get app version from Electron or env var
  export const getAppVersion = () => {
    if (isElectron()) {
      return window.electron.getAppVersion();
    }
    return import.meta.env.VITE_APP_VERSION || '0.1.0';
  };
  
  // Get appropriate database configuration
  export const getDatabaseConfig = () => {
    // In Electron, we use the bundled backend with default settings
    if (isElectron()) {
      return {
        redisHost: 'localhost',
        redisPort: 6379,
        postgresHost: 'localhost',
        postgresPort: 5432,
        postgresUser: 'postgres',
        postgresPassword: 'password',
        postgresDb: 'jwt_db'
      };
    }
    
    // In web mode, use environment variables
    return {
      redisHost: import.meta.env.VITE_REDIS_HOST || 'localhost',
      redisPort: import.meta.env.VITE_REDIS_PORT || 6379,
      postgresHost: import.meta.env.VITE_POSTGRES_HOST || 'localhost',
      postgresPort: import.meta.env.VITE_POSTGRES_PORT || 5432,
      postgresUser: import.meta.env.VITE_POSTGRES_USER || 'postgres',
      postgresPassword: import.meta.env.VITE_POSTGRES_PASSWORD || 'password',
      postgresDb: import.meta.env.VITE_POSTGRES_DB || 'jwt_db'
    };
  };