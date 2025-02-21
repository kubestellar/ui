import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from "rollup-plugin-visualizer";
import EnvironmentPlugin from 'vite-plugin-environment'
import { execSync } from 'child_process';

// DOCS: https://www.npmjs.com/package/rollup-plugin-visualizer
// https://vitejs.dev/config/

// Utility function to extract the current git commit hash
// Provides a short 7-character version of the full commit hash
const getGitCommitHash = () => {
  try {
    return execSync('git rev-parse HEAD').toString().trim().slice(0, 7);
  } catch (error) {
    console.error('Failed to retrieve git commit hash:', error);
    return 'unknown';
  }
};

// Vite configuration for KubeStellar UI project
// Includes React plugin, environment variable management, and bundle visualization
export default defineConfig({
  plugins: [
    // React framework integration
    react(),

    // Environment variable management
    // Enables access to base URL and git commit hash across the application
    EnvironmentPlugin({
      VITE_BASE_URL: process.env.VITE_BASE_URL,
      VITE_GIT_COMMIT_HASH: getGitCommitHash(),
    }),

    // Bundle size and composition visualization
    // Helps in understanding application's build characteristics
    visualizer({
      filename: "bundle-stats.html", // Output file for the analysis
      open: true, // Automatically open the file in the browser if true
      gzipSize: true, // Show gzip sizes
      brotliSize: true, // Show brotli sizes
      // template: 'network', // sunburst, treemap, network, raw-data, list, flamegraph

    }),
  ],

  // Global compile-time constants and environment variable definitions
  // Ensures commit hash is available during build and runtime
  define: {
    'import.meta.env.VITE_GIT_COMMIT_HASH': JSON.stringify(getGitCommitHash()),
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core vendor dependencies
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          
          // MUI core and icons in separate chunks
          'vendor-mui-core': ['@mui/material'],
          'vendor-mui-icons': ['@mui/icons-material'],
          'vendor-mui-tree': ['@mui/x-tree-view'],
          
          // Feature-specific chunks
          'charts': ['recharts'],
          'editor': ['@monaco-editor/react'],
          'terminal': ['xterm', 'xterm-addon-fit'],
          
          // Utility libraries
          'utils': ['axios', 'js-yaml', 'nanoid'],
        },
      }
    },
  },

  // Add preload directives
  experimental: {
    renderBuiltUrl(filename: string, { hostType }: { hostType: 'js' | 'css' | 'html' }) {
      if (hostType === 'html') {
        return { relative: true, preload: true };
      }
      return { relative: true };
    }
  },
})