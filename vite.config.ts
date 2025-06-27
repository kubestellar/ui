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

export default defineConfig({
  plugins: [
    react(),

    // Environment variable management
    // Enables access to base URL and git commit hash across the application
    EnvironmentPlugin({
      VITE_BASE_URL: process.env.VITE_BASE_URL || 'http://localhost:4000',
      VITE_GIT_COMMIT_HASH: getGitCommitHash(),
    }),
  ],

  define: {
    'import.meta.env.VITE_GIT_COMMIT_HASH': JSON.stringify(getGitCommitHash()),
  },

  build: {
    chunkSizeWarningLimit: 800,
    cssCodeSplit: true,
    sourcemap: process.env.NODE_ENV !== 'production',
    reportCompressedSize: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: process.env.NODE_ENV === 'production',
      },
      format: {
        comments: false,
      },
    },
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
          charts: ['recharts'],
          editor: ['@monaco-editor/react'],
          terminal: ['xterm', 'xterm-addon-fit'],

          // Utility libraries
          utils: ['axios', 'js-yaml', 'nanoid'],
        },
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: ({ name }) => {
          if (/\.(png|jpe?g|gif|svg|webp)$/.test(name ?? '')) {
            return 'assets/images/[name].[hash].[ext]';
          }
          if (/\.(woff2?|eot|ttf|otf)$/.test(name ?? '')) {
            return 'assets/fonts/[name].[hash].[ext]';
          }
          return 'assets/[name].[hash].[ext]';
        },
      },
    },
  },

  experimental: {
    renderBuiltUrl(filename: string, { hostType }: { hostType: 'js' | 'css' | 'html' }) {
      if (hostType === 'html') {
        return { relative: true, preload: true };
      }
      return { relative: true };
    },
  },
});
