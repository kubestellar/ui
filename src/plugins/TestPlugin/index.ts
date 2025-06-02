// src/plugins/TestPlugin/index.ts

// Define the plugin interface
export interface TestPlugin {
  name: string;
  version: string;
  initialized: boolean;
  init: () => string;
  getGreeting: (userName: string) => string;
  updateUI: (message: string) => string;
}

// Create the plugin instance
const testPlugin: TestPlugin = {
  name: "Test Plugin",
  version: "1.0.0",
  initialized: false,
  
  // Initialize the plugin
  init: function() {
    console.log("Test Plugin initialized!");
    this.initialized = true;
    return "Plugin initialization complete.";
  },
  
  // Sample function to demonstrate plugin functionality
  getGreeting: function(userName: string) {
    return `Hello, ${userName}! Welcome to the Test Plugin.`;
  },
  
  // Sample function to simulate rendering or updating UI
  updateUI: function(message: string) {
    console.log("Updating UI with message:", message);
    return `UI updated with: ${message}`;
  }
};

export default testPlugin;
