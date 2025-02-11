import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from "rollup-plugin-visualizer";
import EnvironmentPlugin from 'vite-plugin-environment'
import { execSync } from 'child_process';

// Function to get git commit hash
const getGitCommitHash = () => {
  try {
    // Use more robust git command
    return execSync('git rev-parse HEAD').toString().trim().slice(0, 7);
  } catch (error) {
    console.error('Failed to get git commit hash:', error);
    return 'unknown';
  }
};

export default defineConfig({
  plugins: [
    react(),
    EnvironmentPlugin('all', { 
      // Prefix for environment variables
      prefix: 'VITE_' 
    }),
    EnvironmentPlugin({
      VITE_GIT_COMMIT_HASH: getGitCommitHash(),
    }),
    visualizer({
      filename: "bundle-stats.html",
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  define: {
    'import.meta.env.VITE_GIT_COMMIT_HASH': JSON.stringify(getGitCommitHash())
  }
})