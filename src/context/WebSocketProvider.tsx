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
  ports?: Array<{ name?: string; port?: number }>;
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

interface WebSocketContextType {
  ws: WebSocket | null;
  isConnected: boolean;
  connect: (shouldConnect: boolean) => void;
  hasValidDatat: boolean;
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
  const queryClient = useQueryClient();
  const renderStartTime = useRef<number>(performance.now());
  const dataReceiveTime = useRef<number | null>(null);
  const NAMESPACE_QUERY_KEY = ["namespaces"];
  const [isConnected, setIsConnected] = useState(false);
  const [shouldConnect, setShouldConnect] = useState(false);
  const [hasValidDatat, sethasValidDatat] = useState(false);

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

  const connectWebSocket = (reconnectFunc: () => void): WebSocket => {
    console.log(`[WebSocket] Starting connection at ${performance.now() - renderStartTime.current}ms`);
    const ws = new WebSocket("ws://localhost:4000/ws/namespaces");
    wsRef.current = ws;

    const updateCache = (filteredData: NamespaceData[]) => {
      const currentData = queryClient.getQueryData<NamespaceData[]>(
        NAMESPACE_QUERY_KEY
      );
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
        `[WebSocket] Connection established at ${
          performance.now() - renderStartTime.current
        }ms`
      );
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      const receiveTime = performance.now();
      console.log(
        `[WebSocket] Data arrived at ${
          receiveTime - renderStartTime.current
        }ms, readyState: ${ws.readyState}`
      );
      let data: NamespaceData[];
      try {
        data = JSON.parse(event.data) as NamespaceData[];
        console.log(
          `[WebSocket] Data received and parsed: ${data.length} namespaces at ${
            performance.now() - renderStartTime.current
          }ms`
        );
        
        // Check if data is empty or invalid
        if (!data || data.length === 0) {
          console.log(`[WebSocket] Empty data received at ${performance.now() - renderStartTime.current}ms`);
          sethasValidDatat(false);
          return;
        }
        
        sethasValidDatat(true);
      } catch (error) {
        console.error(
          `[WebSocket] Failed to parse data at ${
            performance.now() - renderStartTime.current
          }ms:`,
          error
        );
        sethasValidDatat(false);
        return;
      }
      const totalObjects = data.reduce((count, namespace) => {
        const resourceCount = Object.values(namespace.resources).reduce(
          (sum, resources) => sum + resources.length,
          0
        );
        return count + resourceCount;
      }, 0);
      console.log(
        `[WebSocket] Processed ${totalObjects} objects across ${
          data.length
        } namespaces at ${performance.now() - renderStartTime.current}ms`
      );
      const filteredData = JSON.parse(JSON.stringify(data)).filter(
        (namespace: NamespaceData) =>
          ![
            "kubestellar-report",
            "kube-node-lease",
            "kube-public",
            "default",
            "kube-system",
          ].includes(namespace.name)
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
    };

    ws.onerror = (error) => {
      console.error(
        `[WebSocket] Error at ${
          performance.now() - renderStartTime.current
        }ms:`,
        error
      );
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log(
        `[WebSocket] Disconnected at ${
          performance.now() - renderStartTime.current
        }ms, attempting reconnect...`
      );
      wsRef.current = null;
      setIsConnected(false);
      reconnectFunc();
    };

    return ws;
  };

  const reconnectWebSocket = (): void => {
    let retryCount = 0;
    const maxBackoff = 500;
    const initialDelay = 10;

    const attemptReconnect = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      const delay = Math.min(initialDelay * Math.pow(2, retryCount), maxBackoff);
      retryCount++;

      setTimeout(() => {
        console.log(
          `[WebSocket] Reconnecting (attempt ${retryCount}, delay ${delay}ms) at ${
            performance.now() - renderStartTime.current
          }ms`
        );
        connectWebSocket(reconnectWebSocket);
      }, delay);
    };

    attemptReconnect();
  };

  const connect = (shouldConnect: boolean) => {
    setShouldConnect(shouldConnect);
  };

  useEffect(() => {
    // Check if the user is authenticated by looking for the JWT token
    const token = localStorage.getItem("jwtToken");
    if (token && !shouldConnect) {
      console.log(`[WebSocket] User is authenticated, initiating connection at ${performance.now() - renderStartTime.current}ms`);
      setShouldConnect(true);
    }
  }, []);

  useEffect(() => {
    if (!shouldConnect) return;

    connectWebSocket(reconnectWebSocket);

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
        console.log(`[WebSocket] Connection closed at ${performance.now() - renderStartTime.current}ms`);
      }
    };
  }, [shouldConnect]);

  return (
    <WebSocketContext.Provider value={{ ws: wsRef.current, isConnected, connect, hasValidDatat }}>
      {children}
    </WebSocketContext.Provider>
  );
};