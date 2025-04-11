import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import EnvironmentPlugin from 'vite-plugin-environment'
import { execSync } from 'child_process';
import path from 'path';

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

// Determine if we're running in Electron mode
const isElectronBuild = process.env.ELECTRON_SERVE === 'true';

// Vite configuration for KubeStellar UI project
// Includes React framework integration, environment variable handling, and build optimization
export default defineConfig({
  plugins: [
    // React framework integration
    react(),

    // Environment variable management
    // Enables access to base URL and git commit hash across the application
    EnvironmentPlugin({
      VITE_BASE_URL: process.env.VITE_BASE_URL,
      VITE_GIT_COMMIT_HASH: getGitCommitHash(),
      VITE_IS_ELECTRON: isElectronBuild ? 'true' : 'false',
      VITE_APP_VERSION: process.env.npm_package_version || '0.0.0',
    }),
  ],

  // Global compile-time constants and environment variable definitions
  // Ensures commit hash is available during build and runtime
  define: {
    'import.meta.env.VITE_GIT_COMMIT_HASH': JSON.stringify(getGitCommitHash()),
    'import.meta.env.VITE_IS_ELECTRON': JSON.stringify(isElectronBuild),
  },

  // Base path for assets - important for Electron builds
  base: isElectronBuild ? './' : '/',
  
  // Resolve aliases for easier imports
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },

  build: {
    // Output directory
    outDir: 'dist',
    
    // Ensure clean output
    emptyOutDir: true,
    
    // Increase the chunk size warning limit from 500kB to 1000kB
    chunkSizeWarningLimit: 1000,
    
    rollupOptions: {
      output: {
        // Adjust chunk naming strategy for better caching
        manualChunks: (id) => {
          // Core React dependencies
          if (id.includes('node_modules/react/') || 
              id.includes('node_modules/react-dom/') || 
              id.includes('node_modules/scheduler/')) {
            return 'vendor-react-core';
          }
          
          // React ecosystem (router, etc.)
          if (id.includes('node_modules/react-router') || 
              id.includes('node_modules/@remix-run/') || 
              id.includes('node_modules/history/')) {
            return 'vendor-react-router';
          }
          
          // MUI related packages
          if (id.includes('node_modules/@mui/material/') || 
              id.includes('node_modules/@emotion/')) {
            return 'vendor-mui-core';
          }
          
          if (id.includes('node_modules/@mui/icons-material/')) {
            return 'vendor-mui-icons';
          }
          
          if (id.includes('node_modules/@mui/x-tree-view/')) {
            return 'vendor-mui-tree';
          }
          
          // Three.js and 3D related
          if (id.includes('node_modules/three/') || 
              id.includes('node_modules/@react-three/')) {
            return 'vendor-three';
          }
          
          // Charts and visualization
          if (id.includes('node_modules/recharts/') || 
              id.includes('node_modules/d3/')) {
            return 'charts';
          }
          
          // Flow/diagram related
          if (id.includes('node_modules/reactflow/') || 
              id.includes('node_modules/@xyflow/') || 
              id.includes('node_modules/dagre/') ||
              id.includes('node_modules/elkjs/')) {
            return 'flow-diagrams';
          }
          
          // Monaco editor related
          if (id.includes('node_modules/monaco-editor/') || 
              id.includes('node_modules/@monaco-editor/')) {
            return 'editor';
          }
          
          // Terminal related
          if (id.includes('node_modules/xterm')) {
            return 'terminal';
          }
          
          // State management
          if (id.includes('node_modules/zustand/') || 
              id.includes('node_modules/@tanstack/react-query')) {
            return 'state-management';
          }
          
          // Utility libraries
          if (id.includes('node_modules/axios/') || 
              id.includes('node_modules/lodash/') || 
              id.includes('node_modules/js-yaml/') ||
              id.includes('node_modules/yaml/') || 
              id.includes('node_modules/nanoid/')) {
            return 'utils';
          }
        }
      }
    },
    
    // Optimize build for Electron
    target: isElectronBuild ? 'chrome110' : 'modules',
    
    // Ensure proper source maps for debugging
    sourcemap: true,
  },

  // Server configuration
  server: {
    // Required for Electron to consistently find the dev server
    port: 5173,
    strictPort: true,
    
    // Allow connections from Electron process
    host: true,
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