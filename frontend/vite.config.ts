import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import EnvironmentPlugin from 'vite-plugin-environment';
import { execSync } from 'child_process';

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
      VITE_BASE_URL: process.env.VITE_BASE_URL || 'http://localhost:4000',
      VITE_GIT_COMMIT_HASH: getGitCommitHash(),
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
          // Monaco Editor - already optimized
          editor: ['@monaco-editor/react'],

          // React core libraries
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],

          // MUI core libraries
          'vendor-mui-core': [
            '@mui/material',
            '@mui/icons-material',
            '@emotion/react',
            '@emotion/styled',
          ],

          // MUI specific components
          'vendor-mui-components': ['@mui/lab', '@mui/x-tree-view'],

          // Terminal and related libraries
          terminal: ['xterm', 'xterm-addon-fit'],

          // Charts and visualization
          charts: ['recharts'],

          // 3D and graphics libraries
          three: ['three', '@react-three/fiber', '@react-three/drei'],

          // Animation libraries
          animations: ['framer-motion'],

          // Flow and topology libraries
          flow: ['reactflow', '@xyflow/react', 'dagre'],

          // Utility libraries
          utils: ['lodash', 'js-yaml', 'yaml', 'uuid', 'nanoid'],

          // HTTP and API libraries
          api: ['axios', '@tanstack/react-query'],

          // Internationalization
          i18n: ['react-i18next', 'i18next', 'i18next-browser-languagedetector'],

          // File handling and upload
          files: [],

          // State management
          state: ['zustand'],

          // Icons and UI
          icons: ['react-icons', 'lucide-react', '@fortawesome/fontawesome-free'],

          // Drag and drop
          dnd: ['@hello-pangea/dnd'],

          // WebSocket
          websocket: [],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  // Add preload directives
  experimental: {
    renderBuiltUrl(filename: string, { hostType }: { hostType: 'js' | 'css' | 'html' }) {
      if (hostType === 'html') {
        return { relative: true, preload: true };
      }
      return { relative: true };
    },
  },
});
