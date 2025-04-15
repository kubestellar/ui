import { createContext } from 'react';

// Copy the interfaces from WebSocketProvider.tsx
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
  wecsData: WecsCluster[] | null;
}

// Create and export the context
export const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

// Also export the types
export type {
  ResourceItem,
  NamespaceData,
  WecsResource,
  WecsResourceType,
  WecsNamespace,
  WecsCluster,
  WebSocketContextType
}; 