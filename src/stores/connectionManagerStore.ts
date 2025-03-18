import { create } from 'zustand';

interface ActiveConnection {
  source: string | null;
  sourceType: string | null;
  mouseX: number;
  mouseY: number;
}

interface CurrentConnection {
  workloadName: string;
  workloadNamespace: string;
  clusterName: string;
}

interface ConnectionManagerState {
  // Connection mode state
  connectionMode: boolean;
  activeConnection: ActiveConnection;
  currentConnection: CurrentConnection | null;
  invalidConnectionWarning: string | null;
  quickPolicyDialogOpen: boolean;
  
  // Actions
  toggleConnectionMode: () => void;
  setActiveConnection: (connection: ActiveConnection) => void;
  setCurrentConnection: (connection: CurrentConnection | null) => void;
  setInvalidConnectionWarning: (warning: string | null) => void;
  setQuickPolicyDialogOpen: (open: boolean) => void;
  resetConnection: () => void;
}

// Create the store
export const useConnectionManagerStore = create<ConnectionManagerState>((set) => ({
  // Initial state
  connectionMode: true,
  activeConnection: {
    source: null,
    sourceType: null,
    mouseX: 0,
    mouseY: 0
  },
  currentConnection: null,
  invalidConnectionWarning: null,
  quickPolicyDialogOpen: false,
  
  // Actions
  toggleConnectionMode: () => {
    set(state => {
      console.log(`🔄 Connection mode changing from ${state.connectionMode} to ${!state.connectionMode}`);
      
      // Reset active connection when toggling
      return {
        connectionMode: !state.connectionMode,
        activeConnection: {
          source: null,
          sourceType: null,
          mouseX: 0,
          mouseY: 0
        }
      };
    });
  },
  
  setActiveConnection: (connection) => set({ activeConnection: connection }),
  
  setCurrentConnection: (connection) => set({ currentConnection: connection }),
  
  setInvalidConnectionWarning: (warning) => set({ invalidConnectionWarning: warning }),
  
  setQuickPolicyDialogOpen: (open) => set({ quickPolicyDialogOpen: open }),
  
  resetConnection: () => set({
    activeConnection: {
      source: null,
      sourceType: null,
      mouseX: 0,
      mouseY: 0
    },
    invalidConnectionWarning: null
  })
})); 