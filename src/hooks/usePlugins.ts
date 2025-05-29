import { useState, useCallback } from 'react';
import { usePluginQueries } from './queries/usePluginQueries';
import { useClusterPluginQueries } from './queries/useClusterPluginQueries';
import { LoadPluginFromGitHubRequest, LoadPluginFromFileRequest } from '../services/pluginService';

interface PluginState {
  selectedPlugin: string | null;
  isInstalling: boolean;
  installationProgress: number;
  showInstallModal: boolean;
  showDetailsModal: boolean;
}

export const usePlugins = () => {
  const [state, setState] = useState<PluginState>({
    selectedPlugin: null,
    isInstalling: false,
    installationProgress: 0,
    showInstallModal: false,
    showDetailsModal: false,
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

  // Mutations
  const loadFromGitHub = useLoadPluginFromGitHub();
  const loadFromFile = useLoadPluginFromFile();
  const unloadPlugin = useUnloadPlugin();
  const callPluginEndpoint = useCallPluginEndpoint();
  const pluginOnboardCluster = usePluginOnboardCluster();
  const pluginDetachCluster = usePluginDetachCluster();

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

  // Plugin operations
  const installPluginFromGitHub = useCallback(
    async (request: LoadPluginFromGitHubRequest) => {
      setState(prev => ({ ...prev, isInstalling: true, installationProgress: 0 }));

      try {
        // Simulate progress updates
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

        // Reset after a short delay
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
      // This would need individual health queries for each plugin
      // For now, return a simple status
      return isPluginLoaded(pluginId) ? 'healthy' : 'not-loaded';
    },
    [isPluginLoaded]
  );

  return {
    // Data
    loadedPlugins: loadedPlugins.data?.plugins || [],
    availablePlugins: availablePlugins.data || [],
    clusterPluginStatus: clusterPluginStatus.data,
    clusterStatuses: clusterStatuses.data || [],

    // Selected plugin
    selectedPlugin: state.selectedPlugin,
    selectedPluginDetails: selectedPluginDetails.data,
    selectedPluginHealth: selectedPluginHealth.data,

    // Loading states
    isLoading: loadedPlugins.isLoading || availablePlugins.isLoading,
    isInstalling: state.isInstalling,
    installationProgress: state.installationProgress,

    // Modal states
    showInstallModal: state.showInstallModal,
    showDetailsModal: state.showDetailsModal,

    // Actions
    setSelectedPlugin,
    setShowInstallModal,
    setShowDetailsModal,
    installPluginFromGitHub,
    installPluginFromFile,
    removePlugin,
    callPluginEndpoint: callPluginEndpoint.mutateAsync,

    // Cluster plugin specific
    onboardClusterViaPlugin: pluginOnboardCluster.mutateAsync,
    detachClusterViaPlugin: pluginDetachCluster.mutateAsync,

    // Helper functions
    getPluginByType,
    isPluginLoaded,
    getPluginHealth,

    // Refresh functions
    refetchPlugins: loadedPlugins.refetch,
    refetchAvailable: availablePlugins.refetch,
  };
};
