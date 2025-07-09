import { create } from 'zustand';

export type EdgeType = 'bezier' | 'step';

interface EdgeTypeState {
  edgeType: EdgeType;
  setEdgeType: (type: EdgeType) => void;
}

const useEdgeTypeStore = create<EdgeTypeState>(set => ({
  edgeType: 'bezier',
  setEdgeType: (type: EdgeType) => set({ edgeType: type }),
}));

export default useEdgeTypeStore;
