import { useState, useCallback } from 'react';
import { usePluginQueries } from './queries/usePluginQueries';
import { useClusterPluginQueries } from './queries/useClusterPluginQueries';
import { 
  LoadPluginFromGitHubRequest, 
  LoadPluginFromFileRequest,
  GitHubInstallRequest,
} from '../services/pluginService';

interface PluginState {
  selectedPlugin: string | null;
  isInstalling: boolean;
  installationProgress: number;
  showInstallModal: boolean;
  showDetailsModal: boolean;
  showGitHubModal: boolean;
  showLocalModal: boolean;
}

export const usePlugins = () => {
  const [state, setState] = useState<PluginState>({
    selectedPlugin: null,
    isInstalling: false,
    installationProgress: 0,
    showInstallModal: false,
    showDetailsModal: false,
    showGitHubModal: false,
    showLocalModal: false,
  });

  const {
    usePlugins: useLoadedPlugins,
    usePluginDetails,
    usePluginHealth,
    useAvailablePlugins,
    useLoadPluginFromGitHub,
    useLoadPluginFromFile,
    useUnloadPlugin,
    useCallPluginEndpoint,
    // GitHub Repository Management (Simplified)
    useInstallGitHubRepository,
    useUpdateGitHubRepository,
    // Local Plugin Testing
    useLoadLocalPlugin,
    useUnloadLocalPlugin,
    useListLocalPlugins,
    useBuildInfo,
  } = usePluginQueries();

  const {
    useClusterPluginStatus,
    useClusterPluginStatuses,
    usePluginOnboardCluster,
    usePluginDetachCluster,
  } = useClusterPluginQueries();

  // Queries
  const loadedPlugins = useLoadedPlugins();
  const availablePlugins = useAvailablePlugins();
  const clusterPluginStatus = useClusterPluginStatus();
  const clusterStatuses = useClusterPluginStatuses();
  
  // Local queries only (GitHub removed)
  const localPlugins = useListLocalPlugins();
  const buildInfo = useBuildInfo();

  // Mutations - Core
  const loadFromGitHub = useLoadPluginFromGitHub();
  const loadFromFile = useLoadPluginFromFile();
  const unloadPlugin = useUnloadPlugin();
  const callPluginEndpoint = useCallPluginEndpoint();
  const pluginOnboardCluster = usePluginOnboardCluster();
  const pluginDetachCluster = usePluginDetachCluster();

  // GitHub Repository Mutations (Simplified)
  const installGitHubRepo = useInstallGitHubRepository();
  const updateGitHubRepo = useUpdateGitHubRepository();

  // Local Plugin Mutations
  const loadLocalPlugin = useLoadLocalPlugin();
  const unloadLocalPlugin = useUnloadLocalPlugin();

  // Selected plugin details
  const selectedPluginDetails = usePluginDetails(state.selectedPlugin || '');
  const selectedPluginHealth = usePluginHealth(state.selectedPlugin || '');

  // State management
  const setSelectedPlugin = useCallback((pluginId: string | null) => {
    setState(prev => ({ ...prev, selectedPlugin: pluginId }));
  }, []);

  const setShowInstallModal = useCallback((show: boolean) => {
    setState(prev => ({ ...prev, showInstallModal: show }));
  }, []);

  const setShowDetailsModal = useCallback((show: boolean) => {
    setState(prev => ({ ...prev, showDetailsModal: show }));
  }, []);

  const setShowGitHubModal = useCallback((show: boolean) => {
    setState(prev => ({ ...prev, showGitHubModal: show }));
  }, []);

  const setShowLocalModal = useCallback((show: boolean) => {
    setState(prev => ({ ...prev, showLocalModal: show }));
  }, []);

  // Plugin operations - Original (backwards compatibility)
  const installPluginFromGitHub = useCallback(
    async (request: LoadPluginFromGitHubRequest) => {
      setState(prev => ({ ...prev, isInstalling: true, installationProgress: 0 }));

      try {
        const progressInterval = setInterval(() => {
          setState(prev => ({
            ...prev,
            installationProgress: Math.min(prev.installationProgress + 10, 90),
          }));
        }, 500);

        await loadFromGitHub.mutateAsync(request);

        clearInterval(progressInterval);
        setState(prev => ({
          ...prev,
          installationProgress: 100,
          showInstallModal: false,
        }));

        setTimeout(() => {
          setState(prev => ({
            ...prev,
            isInstalling: false,
            installationProgress: 0,
          }));
        }, 1000);
      } catch (error) {
        setState(prev => ({
          ...prev,
          isInstalling: false,
          installationProgress: 0,
        }));
        throw error;
      }
    },
    [loadFromGitHub]
  );

  const installPluginFromFile = useCallback(
    async (request: LoadPluginFromFileRequest) => {
      await loadFromFile.mutateAsync(request);
    },
    [loadFromFile]
  );

  // GitHub Repository Management (Simplified)
  const installPluginFromGitHubRepository = useCallback(
    async (request: GitHubInstallRequest) => {
      setState(prev => ({ ...prev, isInstalling: true, installationProgress: 0 }));

      try {
        const progressInterval = setInterval(() => {
          setState(prev => ({
            ...prev,
            installationProgress: Math.min(prev.installationProgress + 15, 90),
          }));
        }, 300);

        await installGitHubRepo.mutateAsync(request);

        clearInterval(progressInterval);
        setState(prev => ({
          ...prev,
          installationProgress: 100,
          showGitHubModal: false,
        }));

        setTimeout(() => {
          setState(prev => ({
            ...prev,
            isInstalling: false,
            installationProgress: 0,
          }));
        }, 1000);
      } catch (error) {
        setState(prev => ({
          ...prev,
          isInstalling: false,
          installationProgress: 0,
        }));
        throw error;
      }
    },
    [installGitHubRepo]
  );

  const updateGitHubRepository = useCallback(
    async (repoUrl: string, force?: boolean) => {
      setState(prev => ({ ...prev, isInstalling: true, installationProgress: 0 }));

      try {
        const progressInterval = setInterval(() => {
          setState(prev => ({
            ...prev,
            installationProgress: Math.min(prev.installationProgress + 20, 90),
          }));
        }, 200);

        await updateGitHubRepo.mutateAsync({ repoUrl, force });

        clearInterval(progressInterval);
        setState(prev => ({ ...prev, installationProgress: 100 }));

        setTimeout(() => {
          setState(prev => ({
            ...prev,
            isInstalling: false,
            installationProgress: 0,
          }));
        }, 1000);
      } catch (error) {
        setState(prev => ({
          ...prev,
          isInstalling: false,
          installationProgress: 0,
        }));
        throw error;
      }
    },
    [updateGitHubRepo]
  );

  // Local Plugin Management
  const installPluginFromLocalFile = useCallback(
    async (request: LoadPluginFromFileRequest) => {
      setState(prev => ({ ...prev, isInstalling: true, installationProgress: 0 }));

      try {
        const progressInterval = setInterval(() => {
          setState(prev => ({
            ...prev,
            installationProgress: Math.min(prev.installationProgress + 25, 90),
          }));
        }, 100);

        await loadLocalPlugin.mutateAsync(request);

        clearInterval(progressInterval);
        setState(prev => ({
          ...prev,
          installationProgress: 100,
          showLocalModal: false,
        }));

        setTimeout(() => {
          setState(prev => ({
            ...prev,
            isInstalling: false,
            installationProgress: 0,
          }));
        }, 1000);
      } catch (error) {
        setState(prev => ({
          ...prev,
          isInstalling: false,
          installationProgress: 0,
        }));
        throw error;
      }
    },
    [loadLocalPlugin]
  );

  const unloadLocalPluginById = useCallback(
    async (pluginId: string) => {
      await unloadLocalPlugin.mutateAsync({ pluginId });
      if (state.selectedPlugin === pluginId) {
        setSelectedPlugin(null);
      }
    },
    [unloadLocalPlugin, state.selectedPlugin, setSelectedPlugin]
  );

  // Original remove plugin (backwards compatibility)
  const removePlugin = useCallback(
    async (pluginId: string) => {
      await unloadPlugin.mutateAsync(pluginId);
      if (state.selectedPlugin === pluginId) {
        setSelectedPlugin(null);
      }
    },
    [unloadPlugin, state.selectedPlugin, setSelectedPlugin]
  );

  // Helper functions
  const getPluginByType = useCallback(
    (type: 'cluster' | 'monitoring' | 'backup') => {
      if (!loadedPlugins.data) return null;

      const typeMap = {
        cluster: 'kubestellar-cluster-plugin',
        monitoring: 'kubestellar-monitoring-plugin',
        backup: 'kubestellar-backup-plugin',
      };

      return loadedPlugins.data.pluginsMap[typeMap[type]] || null;
    },
    [loadedPlugins.data]
  );

  const isPluginLoaded = useCallback(
    (pluginId: string) => {
      return loadedPlugins.data?.pluginsMap[pluginId] != null;
    },
    [loadedPlugins.data]
  );

  const getPluginHealth = useCallback(
    (pluginId: string) => {
      return isPluginLoaded(pluginId) ? 'healthy' : 'not-loaded';
    },
    [isPluginLoaded]
  );

  // Simplified plugin source detection
  const getPluginSource = useCallback(
    (pluginId: string) => {
      // Check if plugin is loaded locally
      const localPluginsList = localPlugins.data?.localPlugins || {};
      const isLocal = pluginId in localPluginsList;

      if (isLocal) return 'local';
      // For now, assume anything else is from GitHub since we don't track repos
      return isPluginLoaded(pluginId) ? 'github' : 'unknown';
    },
    [localPlugins.data, isPluginLoaded]
  );

  return {
    // Data
    loadedPlugins: loadedPlugins.data?.plugins || [],
    availablePlugins: availablePlugins.data || [],
    clusterPluginStatus: clusterPluginStatus.data,
    clusterStatuses: clusterStatuses.data || [],

    // Local data only (GitHub repositories removed)
    localPlugins: localPlugins.data?.localPlugins || {},
    buildInfo: buildInfo.data,

    // Selected plugin
    selectedPlugin: state.selectedPlugin,
    selectedPluginDetails: selectedPluginDetails.data,
    selectedPluginHealth: selectedPluginHealth.data,

    // Loading states
    isLoading: loadedPlugins.isLoading || availablePlugins.isLoading,
    isInstalling: state.isInstalling,
    installationProgress: state.installationProgress,
    isLoadingLocalPlugins: localPlugins.isLoading,

    // Modal states
    showInstallModal: state.showInstallModal,
    showDetailsModal: state.showDetailsModal,
    showGitHubModal: state.showGitHubModal,
    showLocalModal: state.showLocalModal,

    // Actions - Original (backwards compatibility)
    setSelectedPlugin,
    setShowInstallModal,
    setShowDetailsModal,
    installPluginFromGitHub,
    installPluginFromFile,
    removePlugin,
    callPluginEndpoint: callPluginEndpoint.mutateAsync,

    // GitHub Repository Management Actions (Simplified)
    setShowGitHubModal,
    installPluginFromGitHubRepository,
    updateGitHubRepository,

    // Local Plugin Management Actions
    setShowLocalModal,
    installPluginFromLocalFile,
    unloadLocalPluginById,

    // Cluster plugin specific
    onboardClusterViaPlugin: pluginOnboardCluster.mutateAsync,
    detachClusterViaPlugin: pluginDetachCluster.mutateAsync,

    // Helper functions
    getPluginByType,
    isPluginLoaded,
    getPluginHealth,
    getPluginSource,

    // Refresh functions (cleaned up)
    refetchPlugins: loadedPlugins.refetch,
    refetchAvailable: availablePlugins.refetch,
    refetchLocalPlugins: localPlugins.refetch,

    // Mutation states (cleaned up)
    isInstallingFromGitHub: installGitHubRepo.isPending,
    isUpdatingGitHub: updateGitHubRepo.isPending,
    isLoadingLocal: loadLocalPlugin.isPending,
    isUnloadingLocal: unloadLocalPlugin.isPending,
  };
};