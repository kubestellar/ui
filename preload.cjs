const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // Get application version from package.json
  getAppVersion: () => process.env.npm_package_version || '0.0.0',
  
  // Add IPC communication capabilities
  ipcRenderer: {
    send: (channel, data) => {
      ipcRenderer.send(channel, data);
    },
    on: (channel, func) => {
      // Remove the event as it includes `sender` 
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    },
    once: (channel, func) => {
      ipcRenderer.once(channel, (event, ...args) => func(...args));
    },
    invoke: (channel, data) => {
      return ipcRenderer.invoke(channel, data);
    },
    removeAllListeners: (channel) => {
      ipcRenderer.removeAllListeners(channel);
    }
  },
  
  // Expose relevant environment variables
  env: {
    NODE_ENV: process.env.NODE_ENV,
    isPackaged: process.env.NODE_ENV !== 'development',
    apiUrl: 'http://localhost:4000'
  }
});

// You can also expose Node.js APIs that might be useful for your application
contextBridge.exposeInMainWorld('api', {
  fetch: async (url, options) => {
    try {
      const response = await fetch(url, options);
      return await response.json();
    } catch (error) {
      console.error('API fetch error:', error);
      throw error;
    }
  }
});