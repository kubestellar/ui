import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import ReactDOM from "react-dom";
import { isEqual } from "lodash";

interface ResourceItem {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace: string;
    creationTimestamp: string;
    labels?: Record<string, string>;
    uid?: string;
    [key: string]: string | undefined | Record<string, string>;
  };
  spec?: {
    ports?: Array<{ name: string; port: number }>;
    holderIdentity?: string;
  };
  status?: {
    conditions?: Array<{ type: string; status: string }>;
    phase?: string;
  };
  data?: Record<string, string>;
  subsets?: Array<{
    addresses?: Array<{ ip: string }>;
    ports?: Array<{ name?: string; port?: number }>;
  }>;
  endpoints?: Array<{
    addresses?: string[];
    ports?: Array<{ name?: string; port?: number }>;
  }>;
  ports?: Array<{ name: string; port: number }>;
  subjects?: Array<{ name: string }>;
  roleRef?: { name: string };
  rules?: Array<{
    verbs?: string[];
    resources?: string[];
  }>;
}

interface NamespaceData {
  name: string;
  status: string;
  labels: Record<string, string>;
  resources: Record<string, ResourceItem[]>;
}

interface WecsResource {
  name: string;
  raw: ResourceItem;
}

interface WecsResourceType {
  kind: string;
  version: string;
  resources: WecsResource[];
}

interface WecsNamespace {
  namespace: string;
  resourceTypes: WecsResourceType[];
}

interface WecsCluster {
  cluster: string;
  namespaces: WecsNamespace[];
}

interface WebSocketContextType {
  ws: WebSocket | null;
  wecsWs: WebSocket | null;
  isConnected: boolean;
  wecsIsConnected: boolean;
  connect: (shouldConnect: boolean) => void;
  connectWecs: (shouldConnect: boolean) => void;
  hasValidData: boolean;
  hasValidWecsData: boolean;
  wecsData: WecsCluster[] | null; // Updated from WecsClusterData[] to WecsCluster[]
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
};

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const wsRef = useRef<WebSocket | null>(null);
  const wecsWsRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();
  const renderStartTime = useRef<number>(performance.now());
  const dataReceiveTime = useRef<number | null>(null);
  const NAMESPACE_QUERY_KEY = ["namespaces"];
  const [isConnected, setIsConnected] = useState(false);
  const [wecsIsConnected, setWecsIsConnected] = useState(false);
  const [shouldConnect, setShouldConnect] = useState(false);
  const [shouldConnectWecs, setShouldConnectWecs] = useState(false);
  const [hasValidData, setHasValidData] = useState(false);
  const [hasValidWecsData, setHasValidWecsData] = useState(false);
  const [wecsData, setWecsData] = useState<WecsCluster[] | null>(null); // Updated from WecsClusterData[] to WecsCluster[]

  const sortNamespaceData = (data: NamespaceData[]): NamespaceData[] => {
    return [...data]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((ns) => ({
        ...ns,
        resources: Object.fromEntries(
          Object.entries(ns.resources).map(([key, resources]) => [
            key,
            [...resources].sort((a, b) =>
              a.metadata.name.localeCompare(b.metadata.name)
            ),
          ])
        ),
      }));
  };

  const connectWebSocket = (reconnectFunc: () => void, url: string, isWecs: boolean = false): WebSocket => {
    console.log(`[WebSocket] Starting connection to ${url} at ${performance.now() - renderStartTime.current}ms`);
    const ws = new WebSocket(url);
    const ref = isWecs ? wecsWsRef : wsRef;
    ref.current = ws;

    const updateCache = (filteredData: NamespaceData[]) => {
      const currentData = queryClient.getQueryData<NamespaceData[]>(NAMESPACE_QUERY_KEY);
      const sortedFilteredData = sortNamespaceData(filteredData);
      const sortedCurrentData = currentData ? sortNamespaceData(currentData) : null;
      if (!sortedCurrentData || !isEqual(sortedFilteredData, sortedCurrentData)) {
        console.log(
          `[WebSocket] Data changed, updating cache with ${filteredData.length} namespaces at ${
            performance.now() - renderStartTime.current
          }ms`
        );
        queryClient.setQueryData(NAMESPACE_QUERY_KEY, filteredData);
      } else {
        console.log(
          `[WebSocket] Data unchanged, skipping cache update at ${
            performance.now() - renderStartTime.current
          }ms`
        );
      }
    };

    ws.onopen = () => {
      console.log(
        `[WebSocket] Connection established to ${url} at ${
          performance.now() - renderStartTime.current
        }ms`
      );
      if (isWecs) setWecsIsConnected(true);
      else setIsConnected(true);
    };

    ws.onmessage = (event) => {
      const receiveTime = performance.now();
      console.log(
        `[WebSocket] Data arrived from ${url} at ${
          receiveTime - renderStartTime.current
        }ms, readyState: ${ws.readyState}`
      );
      let data: NamespaceData[] | WecsCluster[]; // Updated to WecsCluster[]
      try {
        data = JSON.parse(event.data);
        console.log(
          `[WebSocket] Data received and parsed from ${url}: ${
            isWecs ? (data as WecsCluster[]).length + " clusters" : (data as NamespaceData[]).length + " namespaces"
          } at ${performance.now() - renderStartTime.current}ms`
        );

        if (!data || data.length === 0) {
          console.log(`[WebSocket] Empty data received from ${url} at ${performance.now() - renderStartTime.current}ms`);
          if (isWecs) setHasValidWecsData(false);
          else setHasValidData(false);
          return;
        }

        if (isWecs) {
          // Filter namespaces in wecsData
          const filteredWecsData = (data as WecsCluster[]).map((cluster) => ({
            ...cluster,
            namespaces: cluster.namespaces.filter(
              (ns) =>
                !["kubestellar-report", "kube-node-lease", "kube-public", "default", "kube-system", "open-cluster-management-hub","open-cluster-management","local-path-storage"].includes(ns.namespace)
            ),
          }));
          console.log(
            `[WebSocket] Filtered wecsData: ${filteredWecsData.length} clusters with filtered namespaces at ${
              performance.now() - renderStartTime.current
            }ms`
          );
          setWecsData(filteredWecsData);
          setHasValidWecsData(true);
        } else {
          const filteredData = (data as NamespaceData[]).filter(
            (namespace) =>
              !["kubestellar-report", "kube-node-lease", "kube-public", "default", "kube-system"].includes(namespace.name)
          );
          console.log(
            `[WebSocket] Filtered ${filteredData.length} namespaces from ${
              data.length
            } at ${performance.now() - renderStartTime.current}ms`
          );
          dataReceiveTime.current = receiveTime;
          ReactDOM.unstable_batchedUpdates(() => {
            updateCache(filteredData);
          });
          setHasValidData(true);
        }
      } catch (error) {
        console.error(
          `[WebSocket] Failed to parse data from ${url} at ${
            performance.now() - renderStartTime.current
          }ms:`,
          error
        );
        if (isWecs) setHasValidWecsData(false);
        else setHasValidData(false);
        return;
      }
    };

    ws.onerror = (error) => {
      console.error(
        `[WebSocket] Error at ${url} at ${
          performance.now() - renderStartTime.current
        }ms:`,
        error
      );
      if (isWecs) setWecsIsConnected(false);
      else setIsConnected(false);
    };

    ws.onclose = () => {
      console.log(
        `[WebSocket] Disconnected from ${url} at ${
          performance.now() - renderStartTime.current
        }ms, attempting reconnect...`
      );
      ref.current = null;
      if (isWecs) setWecsIsConnected(false);
      else setIsConnected(false);
      reconnectFunc();
    };

    return ws;
  };

  const reconnectWebSocket = (url: string, isWecs: boolean = false): void => {
    let retryCount = 0;
    const maxBackoff = 500;
    const initialDelay = 10;

    const attemptReconnect = () => {
      const ref = isWecs ? wecsWsRef : wsRef;
      if (ref.current?.readyState === WebSocket.OPEN) return;

      const delay = Math.min(initialDelay * Math.pow(2, retryCount), maxBackoff);
      retryCount++;

      setTimeout(() => {
        console.log(
          `[WebSocket] Reconnecting to ${url} (attempt ${retryCount}, delay ${delay}ms) at ${
            performance.now() - renderStartTime.current
          }ms`
        );
        connectWebSocket(() => reconnectWebSocket(url, isWecs), url, isWecs);
      }, delay);
    };

    attemptReconnect();
  };

  const connect = (shouldConnect: boolean) => {
    setShouldConnect(shouldConnect);
  };

  const connectWecs = (shouldConnect: boolean) => {
    setShouldConnectWecs(shouldConnect);
  };

  useEffect(() => {
    const token = localStorage.getItem("jwtToken");
    if (token && !shouldConnect) {
      console.log(`[WebSocket] User is authenticated, initiating namespaces connection at ${performance.now() - renderStartTime.current}ms`);
      setShouldConnect(true);
    }
    if (token && !shouldConnectWecs) {
      console.log(`[WebSocket] User is authenticated, initiating wecs connection at ${performance.now() - renderStartTime.current}ms`);
      setShouldConnectWecs(true);
    }
  }, []);

  useEffect(() => {
    if (!shouldConnect) return;

    connectWebSocket(() => reconnectWebSocket("ws://localhost:4000/ws/namespaces"), "ws://localhost:4000/ws/namespaces");

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
        console.log(`[WebSocket] Namespaces connection closed at ${performance.now() - renderStartTime.current}ms`);
      }
    };
  }, [shouldConnect]);

  useEffect(() => {
    if (!shouldConnectWecs) return;

    connectWebSocket(() => reconnectWebSocket("ws://localhost:4000/ws/wecs", true), "ws://localhost:4000/ws/wecs", true);

    return () => {
      if (wecsWsRef.current) {
        wecsWsRef.current.close();
        wecsWsRef.current = null;
        console.log(`[WebSocket] WECS connection closed at ${performance.now() - renderStartTime.current}ms`);
      }
    };
  }, [shouldConnectWecs]);

  return (
    <WebSocketContext.Provider
      value={{
        ws: wsRef.current,
        wecsWs: wecsWsRef.current,
        isConnected,
        wecsIsConnected,
        connect,
        connectWecs,
        hasValidData,
        hasValidWecsData,
        wecsData,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}; 