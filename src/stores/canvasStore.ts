import { create } from 'zustand';

// Define the canvas store types
interface CanvasState {
  // Canvas drawing state
  connectionLines: {
    source: string;
    target: string;
    color: string;
  }[];
  
  // Canvas interactions
  drawingActive: boolean;
  highlightedItem: string | null;
  canvasScale: number;
  
  // Actions
  setConnectionLines: (lines: { source: string; target: string; color: string }[]) => void;
  addConnectionLine: (source: string, target: string, color: string) => void;
  removeConnectionLine: (source: string, target: string) => void;
  setDrawingActive: (active: boolean) => void;
  setHighlightedItem: (id: string | null) => void;
  zoomCanvas: (scale: number) => void;
  
  // Helper functions
  findConnectionsBetween: (sourceId: string, targetId: string) => { source: string; target: string; color: string }[];
  getPolicyToTargetConnections: (policyName: string) => { source: string; target: string; color: string }[];
}

// Create the store
export const useCanvasStore = create<CanvasState>((set, get) => ({
  // Initial state
  connectionLines: [],
  drawingActive: true,
  highlightedItem: null,
  canvasScale: 1,
  
  // Actions
  setConnectionLines: (lines) => set({ connectionLines: lines }),
  
  addConnectionLine: (source, target, color) => {
    const { connectionLines } = get();
    
    // Check if this connection already exists
    const exists = connectionLines.some(
      line => line.source === source && line.target === target
    );
    
    if (!exists) {
      set({
        connectionLines: [
          ...connectionLines,
          { source, target, color }
        ]
      });
    }
  },
  
  removeConnectionLine: (source, target) => {
    const { connectionLines } = get();
    
    set({
      connectionLines: connectionLines.filter(
        line => !(line.source === source && line.target === target)
      )
    });
  },
  
  setDrawingActive: (active) => set({ drawingActive: active }),
  
  setHighlightedItem: (id) => set({ highlightedItem: id }),
  
  zoomCanvas: (scale) => set({ canvasScale: scale }),
  
  // Helper functions
  findConnectionsBetween: (sourceId, targetId) => {
    const { connectionLines } = get();
    
    return connectionLines.filter(
      line => 
        (line.source === sourceId && line.target === targetId) ||
        (line.source === targetId && line.target === sourceId)
    );
  },
  
  getPolicyToTargetConnections: (policyName) => {
    const { connectionLines } = get();
    
    return connectionLines.filter(
      line => line.source === `policy-${policyName}` || line.target === `policy-${policyName}`
    );
  }
})); 