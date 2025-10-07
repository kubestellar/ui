import { create } from 'zustand';

interface LabelHighlightState {
  highlightedLabels: {
    key: string;
    value: string;
  } | null;
  setHighlightedLabels: (labels: { key: string; value: string } | null) => void;
  clearHighlightedLabels: () => void;
}

const useLabelHighlightStore = create<LabelHighlightState>(set => ({
  highlightedLabels: null,
  setHighlightedLabels: labels => set({ highlightedLabels: labels }),
  clearHighlightedLabels: () => set({ highlightedLabels: null }),
}));

export default useLabelHighlightStore;
