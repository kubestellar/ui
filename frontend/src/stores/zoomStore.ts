import { create } from 'zustand';

export interface ZoomPreset {
  level: number;
  label: string;
}

export interface ZoomState {
  currentZoom: number;
  zoomPresets: ZoomPreset[];
  setZoom: (zoom: number) => void;
  getScaledNodeStyle: (zoomLevel: number) => React.CSSProperties;
  getScaledIconSize: (zoomLevel: number) => number;
  getScaledFontSize: (zoomLevel: number) => number;
}

export const zoomPresets: ZoomPreset[] = [
  { level: 0.5, label: 'Overview' },
  { level: 1.0, label: 'Standard' },
  { level: 1.5, label: 'Detailed' },
  { level: 2.0, label: 'Focus' },
];

const useZoomStore = create<ZoomState>(set => ({
  currentZoom: 1.0,
  zoomPresets,

  setZoom: (zoom: number) => {
    set({ currentZoom: zoom });
  },

  getScaledNodeStyle: (zoomLevel: number) => {
    const scaleFactor = Math.max(0.5, Math.min(2.0, zoomLevel));
    return {
      padding: `${2 * scaleFactor}px ${12 * scaleFactor}px`,
      fontSize: `${6 * scaleFactor}px`,
      width: `${146 * scaleFactor}px`,
      height: `${30 * scaleFactor}px`,
    };
  },

  getScaledIconSize: (zoomLevel: number) => {
    const scaleFactor = Math.max(0.5, Math.min(2.0, zoomLevel));
    return 18 * scaleFactor;
  },

  getScaledFontSize: (zoomLevel: number) => {
    const scaleFactor = Math.max(0.5, Math.min(2.0, zoomLevel));
    return 6 * scaleFactor;
  },
}));

export default useZoomStore;
