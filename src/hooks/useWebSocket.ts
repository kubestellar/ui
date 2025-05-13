import { useEffect } from 'react';
import { useState } from 'react';
import { NamespaceData, WecsCluster } from '../context/WebSocketContext';
import { useWebSocketQuery } from './queries/useWebSocketQuery';

export const useNamespacesWebSocket = (enabled = true) => {
  return useWebSocketQuery<NamespaceData[]>({
    url: '/ws/namespaces',
    queryKey: ['namespaces'],
    enabled,
    transform: (data: unknown) => {
      if (!Array.isArray(data)) return [];
      return data.filter(
        (namespace: NamespaceData) => 
          !["kubestellar-report", "kube-node-lease", "kube-public", "default", "kube-system"].includes(namespace.name)
      );
    },
  });
};

export const useWecsWebSocket = (enabled = true) => {
  return useWebSocketQuery<WecsCluster[]>({
    url: '/ws/wecs',
    queryKey: ['wecs-clusters'],
    enabled,
    transform: (data: unknown) => {
      if (!Array.isArray(data)) return [];
      
      return (data as WecsCluster[]).map((cluster) => ({
        ...cluster,
        namespaces: cluster.namespaces?.filter(
          (ns) => 
            !["kubestellar-report", "kube-node-lease", "kube-public", "default", "kube-system", 
              "open-cluster-management-hub", "open-cluster-management", "local-path-storage"].includes(ns.namespace)
        ),
      }));
    },
  });
};


export const useResourceLogsWebSocket = (
  kind: string,
  namespace: string,
  name: string,
  onRawMessage?: (event: MessageEvent) => void
) => {
  const pluralForm = kind.toLowerCase() + 's';
  const [queryResult, setQueryResult] = useState({
    isConnected: false,
    data: [] as string[],
    isLoading: false, 
    isError: false
  });

  const wsQuery = useWebSocketQuery<string[]>({
    url: `/api/${pluralForm}/${namespace}/log?name=${name}`,
    queryKey: ['resource-logs', kind, namespace, name],
    parseData: false,
    enabled: !!(namespace && name),
    onRawMessage,
    transform: (data: unknown) => {
      if (typeof data !== 'string') return [];
      return data.split('\n');
    },
  });

  useEffect(() => {
    if (!namespace || !name) {
      setQueryResult({
        isConnected: false,
        data: [],
        isLoading: false,
        isError: false
      });
    } else {
      setQueryResult({
        isConnected: wsQuery.isConnected,
        data: wsQuery.data || [],
        isLoading: wsQuery.isLoading,
        isError: wsQuery.isError
      });
    }
  }, [namespace, name, wsQuery.isConnected, wsQuery.data, wsQuery.isLoading, wsQuery.isError]);

  return queryResult;
};

export const useContextCreationWebSocket = (
  contextName: string, 
  contextVersion: string, 
  onRawMessage?: (event: MessageEvent) => void, 
  onError?: (error: Error) => void, 
  onClose?: (event: CloseEvent) => void
) => {
  return useWebSocketQuery<string[]>({
    url: `/api/wds/context?context=${contextName}&version=${contextVersion}`,
    queryKey: ['context-creation', contextName, contextVersion],
    enabled: false,
    parseData: false,
    transform: (data: unknown) => {
      if (typeof data !== 'string') return [];
      return [data as string];
    },
    autoReconnect: false,
    onRawMessage: onRawMessage,
    onError: onError,
    onDisconnect: onClose,
  });
};

export const useWebSocket = () => {
  const namespaces = useNamespacesWebSocket();
  const wecs = useWecsWebSocket();
  
  return {
    ws: namespaces.isConnected ? {} as WebSocket : null,
    wecsWs: wecs.isConnected ? {} as WebSocket : null,
    isConnected: namespaces.isConnected,
    wecsIsConnected: wecs.isConnected,
    connect: (shouldConnect: boolean) => {
      if (shouldConnect) {
        namespaces.connect();
      } else {
        namespaces.disconnect();
      }
    },
    connectWecs: (shouldConnect: boolean) => {
      if (shouldConnect) {
        wecs.connect();
      } else {
        wecs.disconnect();
      }
    },
    hasValidData: !namespaces.isLoading && !namespaces.isError && !!namespaces.data,
    hasValidWecsData: !wecs.isLoading && !wecs.isError && !!wecs.data,
    wecsData: wecs.data,
    namespaces,
    wecs,
  };
}; 