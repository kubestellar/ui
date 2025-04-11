// Electron type definition file
interface ElectronAPI {
    getAppVersion: () => string;
    // Add other methods exposed from preload script here
  }
  
  declare global {
    interface Window {
      electron: ElectronAPI;
    }
  }