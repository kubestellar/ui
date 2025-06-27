import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import EnvironmentPlugin from 'vite-plugin-environment';
import { execSync } from 'child_process';
import { visualizer } from 'rollup-plugin-visualizer';

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

    EnvironmentPlugin({
      VITE_BASE_URL: process.env.VITE_BASE_URL || 'http://localhost:4000',
      VITE_GIT_COMMIT_HASH: getGitCommitHash(),
    }),

    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
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
        manualChunks: id => {
          if (id.includes('node_modules') && id.match(/\.(css|svg|png|jpe?g|gif|webp)$/)) {
            return 'vendor-assets';
          }

          if (id.includes('node_modules')) {
            if (id.includes('react/') || id.includes('react-dom/') || id.includes('scheduler/')) {
              return 'core-react';
            }
            if (
              id.includes('react-router') ||
              id.includes('react-router-dom') ||
              id.includes('@remix-run/router')
            ) {
              return 'core-router';
            }

            if (id.includes('@mui/material') || id.includes('@emotion/')) {
              return 'ui-mui-core';
            }
            if (id.includes('@mui/icons-material')) {
              return 'ui-mui-icons';
            }
            if (id.includes('@mui/x-tree-view') || id.includes('@mui/x-')) {
              return 'ui-mui-extensions';
            }

            if (id.includes('@monaco-editor')) {
              return 'feature-monaco-editor';
            }
            if (id.includes('xterm')) {
              return 'feature-terminal';
            }
            if (id.includes('recharts') || id.includes('d3')) {
              return 'feature-charts';
            }
            if (id.includes('three') || id.includes('@react-three')) {
              return 'feature-3d';
            }

            if (
              id.includes('axios') ||
              id.includes('js-yaml') ||
              id.includes('nanoid') ||
              id.includes('dayjs') ||
              id.includes('date-fns')
            ) {
              return 'util-data';
            }
            if (id.includes('i18next') || id.includes('translation') || id.includes('intl')) {
              return 'util-i18n';
            }
            if (
              id.includes('zustand') ||
              id.includes('redux') ||
              id.includes('recoil') ||
              id.includes('jotai') ||
              id.includes('valtio')
            ) {
              return 'util-state';
            }
            if (id.includes('tanstack') || id.includes('query') || id.includes('swr')) {
              return 'util-data-fetching';
            }

            const nodeModuleName = id.split('node_modules/').pop()?.split('/')[0] || '';
            if (nodeModuleName) {
              const firstChar = nodeModuleName.charAt(0);
              if (firstChar === '@') {
                const scopedName = nodeModuleName.split('/').slice(0, 2).join('-');
                return `vendor-${scopedName}`;
              }
              return `vendor-${firstChar}`;
            }

            return 'vendor-other';
          }

          if (id.includes('/pages/')) {
            const pageName = id.split('/pages/')[1]?.split('.')[0] || '';
            return `page-${pageName || 'unknown'}`;
          }

          if (id.includes('/components/')) {
            if (id.includes('/components/login/') || id.includes('/components/auth/')) {
              return 'feature-auth';
            }
            if (id.includes('/components/BindingPolicy/')) {
              return 'feature-binding-policy';
            }
            if (id.includes('/components/Workloads/')) {
              return 'feature-workloads';
            }
            if (
              id.includes('/components/Clusters') ||
              id.includes('/components/ClusterManagement')
            ) {
              return 'feature-clusters';
            }
            if (
              id.includes('/components/TreeView') ||
              id.includes('/components/Topology') ||
              id.includes('TreeView') ||
              id.includes('Topology')
            ) {
              return 'feature-visualization';
            }
            if (id.includes('/components/ui/') || id.includes('/components/common/')) {
              return 'shared-ui';
            }

            return 'shared-components';
          }

          if (id.includes('/utils/') || id.includes('/hooks/') || id.includes('/context/')) {
            return 'shared-utils';
          }

          if (id.includes('/stores/') || id.includes('/state/')) {
            return 'app-state';
          }

          if (id.includes('/api/') || id.includes('/lib/api') || id.includes('/services/')) {
            return 'app-api';
          }

          return undefined;
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
