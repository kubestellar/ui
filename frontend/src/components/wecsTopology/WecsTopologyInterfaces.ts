import { Position, MarkerType } from 'reactflow';

export interface NodeData {
  label: JSX.Element;
  isDeploymentOrJobPod?: boolean;
}

export interface BaseNode {
  id: string;
  data: NodeData;
  position: { x: number; y: number };
  style?: React.CSSProperties;
}

export interface CustomNode extends BaseNode {
  sourcePosition?: Position;
  targetPosition?: Position;
  collapsed?: boolean;
  showMenu?: boolean;
}

export interface BaseEdge {
  id: string;
  source: string;
  target: string;
}

export interface CustomEdge extends BaseEdge {
  type?: string;
  animated?: boolean;
  style?: React.CSSProperties;
  markerEnd?: {
    type: MarkerType;
    width?: number;
    height?: number;
    color?: string;
  };
}

export interface ResourceItem {
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
    replicas?: number;
    scaleTargetRef?: {
      apiVersion?: string;
      kind?: string;
      name?: string;
    };
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
  [key: string]: unknown; // Add index signature to make compatible with TreeViewComponent
}

export interface WecsResource {
  name: string;
  raw: ResourceItem;
  replicaSets?: Array<{
    name: string;
    kind: string;
    raw: ResourceItem;
    pods?: Array<{
      name: string;
      kind: string;
      raw: ResourceItem;
      creationTimestamp?: string;
    }>;
    creationTimestamp?: string;
  }>;
  pods?: Array<{
    name: string;
    kind: string;
    raw: ResourceItem;
    creationTimestamp?: string;
  }>;
}

export interface WecsResourceType {
  kind: string;
  version: string;
  resources: WecsResource[];
}

export interface WecsNamespace {
  namespace: string;
  resourceTypes: WecsResourceType[];
}

export interface WecsCluster {
  cluster: string;
  namespaces: WecsNamespace[];
}

export interface SelectedNode {
  namespace: string;
  name: string;
  type: string;
  onClose: () => void;
  isOpen: boolean;
  resourceData?: ResourceItem;
  initialTab?: number;
  cluster?: string;
  isDeploymentOrJobPod?: boolean;
}

export interface ContextMenuState {
  nodeId: string | null;
  x: number;
  y: number;
  nodeType: string | null;
}
