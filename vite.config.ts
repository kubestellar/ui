import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from "rollup-plugin-visualizer";

// DOCS: https://www.npmjs.com/package/rollup-plugin-visualizer
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: "bundle-stats.html", // Output file for the analysis
      open: true, // Automatically open the file in the browser if true
      gzipSize: true, // Show gzip sizes
      brotliSize: true, // Show brotli sizes
      // template: 'network', // sunburst, treemap, network, raw-data, list, flamegraph
    }),
  ],
})
