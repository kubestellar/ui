import { useCallback, useRef } from 'react';
import { Position, MarkerType } from 'reactflow';
import { NodeLabel } from '../wds_topology/NodeLabel';
import useTheme from '../../stores/themeStore';
import useLabelHighlightStore from '../../stores/labelHighlightStore';
import useZoomStore from '../../stores/zoomStore';
import useEdgeTypeStore from '../../stores/edgeTypeStore';
import { CustomNode, ResourceItem, CustomEdge } from './types';
import ConfigMap from '../../assets/k8s_resources_logo/cm.svg';
import ClusterRoleBinding from '../../assets/k8s_resources_logo/crb.svg';
import CustomResourceDefinition from '../../assets/k8s_resources_logo/crd.svg';
import ClusterRole from '../../assets/k8s_resources_logo/c-role.svg';
import CronJob from '../../assets/k8s_resources_logo/cronjob.svg';
import Deployment from '../../assets/k8s_resources_logo/deploy.svg';
import DaemonSet from '../../assets/k8s_resources_logo/ds.svg';
import Endpoints from '../../assets/k8s_resources_logo/ep.svg';
import Group from '../../assets/k8s_resources_logo/group.svg';
import HorizontalPodAutoscaler from '../../assets/k8s_resources_logo/hpa.svg';
import Ingress from '../../assets/k8s_resources_logo/ing.svg';
import Job from '../../assets/k8s_resources_logo/job.svg';
import LimitRange from '../../assets/k8s_resources_logo/limits.svg';
import NetworkPolicy from '../../assets/k8s_resources_logo/netpol.svg';
import Namespace from '../../assets/k8s_resources_logo/ns.svg';
import PodSecurityPolicy from '../../assets/k8s_resources_logo/psp.svg';
import PersistentVolume from '../../assets/k8s_resources_logo/pv.svg';
import PersistentVolumeClaim from '../../assets/k8s_resources_logo/pvc.svg';
import ResourceQuota from '../../assets/k8s_resources_logo/quota.svg';
import RoleBinding from '../../assets/k8s_resources_logo/rb.svg';
import Role from '../../assets/k8s_resources_logo/role.svg';
import ReplicaSet from '../../assets/k8s_resources_logo/rs.svg';
import ServiceAccount from '../../assets/k8s_resources_logo/sa.svg';
import StorageClass from '../../assets/k8s_resources_logo/sc.svg';
import Secret from '../../assets/k8s_resources_logo/secret.svg';
import StatefulSet from '../../assets/k8s_resources_logo/sts.svg';
import Service from '../../assets/k8s_resources_logo/svc.svg';
import User from '../../assets/k8s_resources_logo/user.svg';
import Volume from '../../assets/k8s_resources_logo/vol.svg';

interface TreeViewNodesProps {
  onNodeSelect: (nodeData: {
    namespace: string;
    name: string;
    type: string;
    resourceData?: ResourceItem;
    isGroup?: boolean;
    groupItems?: ResourceItem[];
  }) => void;
  onMenuOpen: (event: React.MouseEvent, nodeId: string) => void;
  isExpanded: boolean;
}

// Node styling is now handled dynamically through the zoom store

const iconMap: Record<string, string> = {
  ConfigMap: ConfigMap,
  ClusterRoleBinding: ClusterRoleBinding,
  CustomResourceDefinition: CustomResourceDefinition,
  ClusterRole: ClusterRole,
  CronJob: CronJob,
  Deployment: Deployment,
  DaemonSet: DaemonSet,
  Endpoints: Endpoints,
  Group: Group,
  HorizontalPodAutoscaler: HorizontalPodAutoscaler,
  Ingress: Ingress,
  Job: Job,
  LimitRange: LimitRange,
  NetworkPolicy: NetworkPolicy,
  Namespace: Namespace,
  PodSecurityPolicy: PodSecurityPolicy,
  PersistentVolume: PersistentVolume,
  PersistentVolumeClaim: PersistentVolumeClaim,
  ResourceQuota: ResourceQuota,
  RoleBinding: RoleBinding,
  Role: Role,
  ReplicaSet: ReplicaSet,
  ServiceAccount: ServiceAccount,
  StorageClass: StorageClass,
  Secret: Secret,
  StatefulSet: StatefulSet,
  Service: Service,
  User: User,
  Volume: Volume,
};

const getNodeConfig = (type: string) => {
  const normalizedType = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  let icon = iconMap[normalizedType] || iconMap.ConfigMap;
  let dynamicText = type.toLowerCase();

  switch (type.toLowerCase()) {
    case 'namespace':
      icon = iconMap.Namespace;
      dynamicText = 'ns';
      break;
    case 'deployment':
      icon = iconMap.Deployment;
      dynamicText = 'deploy';
      break;
    case 'replicaset':
      icon = iconMap.ReplicaSet;
      dynamicText = 'replica';
      break;
    case 'service':
      icon = iconMap.Service;
      dynamicText = 'svc';
      break;
    case 'endpoints':
      icon = iconMap.Endpoints;
      dynamicText = 'endpoints';
      break;
    case 'endpointslice':
      icon = iconMap.Endpoints;
      dynamicText = 'endpointslice';
      break;
    case 'configmap':
      icon = iconMap.ConfigMap;
      dynamicText = 'configmap';
      break;
    case 'clusterrolebinding':
      icon = iconMap.ClusterRoleBinding;
      dynamicText = 'clusterrolebinding';
      break;
    case 'customresourcedefinition':
      icon = iconMap.CustomResourceDefinition;
      dynamicText = 'crd';
      break;
    case 'clusterrole':
      icon = iconMap.ClusterRole;
      dynamicText = 'clusterrole';
      break;
    case 'cronjob':
      icon = iconMap.CronJob;
      dynamicText = 'cronjob';
      break;
    case 'daemonset':
      icon = iconMap.DaemonSet;
      dynamicText = 'daemonset';
      break;
    case 'group':
      icon = iconMap.Group;
      dynamicText = 'group';
      break;
    case 'horizontalpodautoscaler':
      icon = iconMap.HorizontalPodAutoscaler;
      dynamicText = 'hpa';
      break;
    case 'ingress':
      icon = iconMap.Ingress;
      dynamicText = 'ingress';
      break;
    case 'job':
      icon = iconMap.Job;
      dynamicText = 'job';
      break;
    case 'limitrange':
      icon = iconMap.LimitRange;
      dynamicText = 'limitrange';
      break;
    case 'networkpolicy':
      icon = iconMap.NetworkPolicy;
      dynamicText = 'netpol';
      break;
    case 'podsecuritypolicy':
      icon = iconMap.PodSecurityPolicy;
      dynamicText = 'psp';
      break;
    case 'persistentvolume':
      icon = iconMap.PersistentVolume;
      dynamicText = 'pv';
      break;
    case 'persistentvolumeclaim':
      icon = iconMap.PersistentVolumeClaim;
      dynamicText = 'pvc';
      break;
    case 'resourcequota':
      icon = iconMap.ResourceQuota;
      dynamicText = 'quota';
      break;
    case 'rolebinding':
      icon = iconMap.RoleBinding;
      dynamicText = 'rolebinding';
      break;
    case 'role':
      icon = iconMap.Role;
      dynamicText = 'role';
      break;
    case 'serviceaccount':
      icon = iconMap.ServiceAccount;
      dynamicText = 'sa';
      break;
    case 'storageclass':
      icon = iconMap.StorageClass;
      dynamicText = 'storageclass';
      break;
    case 'secret':
      icon = iconMap.Secret;
      dynamicText = 'secret';
      break;
    case 'statefulset':
      icon = iconMap.StatefulSet;
      dynamicText = 'statefulset';
      break;
    case 'user':
      icon = iconMap.User;
      dynamicText = 'user';
      break;
    case 'volume':
      icon = iconMap.Volume;
      dynamicText = 'volume';
      break;
    case 'envvar':
      icon = iconMap.ConfigMap;
      dynamicText = 'envvar';
      break;
    case 'customresource':
      icon = iconMap.CustomResourceDefinition;
      dynamicText = 'cr';
      break;
    case 'controller':
      icon = iconMap.Deployment;
      dynamicText = 'controller';
      break;
    case 'ingresscontroller':
      icon = iconMap.Ingress;
      dynamicText = 'ingresscontroller';
      break;
    case 'context':
      icon = iconMap.Group;
      dynamicText = 'context';
      break;
    default:
      break;
  }

  return { icon, dynamicText };
};

const getTimeAgo = (timestamp: string | undefined, t: (key: string) => string): string => {
  if (!timestamp) return t('treeView.unknown');
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays === 0
    ? t('treeView.timeAgo.today')
    : t(`treeView.timeAgo.days${diffDays === 1 ? '.one' : ''}`).replace(
        '{{count}}',
        diffDays.toString()
      );
};

export const useTreeViewNodes = ({ onNodeSelect, onMenuOpen, isExpanded }: TreeViewNodesProps) => {
  const theme = useTheme(state => state.theme);
  const highlightedLabels = useLabelHighlightStore(state => state.highlightedLabels);
  const { currentZoom, getScaledNodeStyle } = useZoomStore();
  const nodeCache = useRef<Map<string, CustomNode>>(new Map());
  const edgeIdCounter = useRef<number>(0);
  const { edgeType } = useEdgeTypeStore();

  const createNode = useCallback(
    (
      id: string,
      label: string,
      type: string,
      status: string,
      timestamp: string | undefined,
      namespace: string | undefined,
      resourceData: ResourceItem | undefined,
      parent: string | null,
      newNodes: CustomNode[],
      newEdges: CustomEdge[],
      groupItems?: ResourceItem[],
      t?: (key: string) => string
    ) => {
      const config = getNodeConfig(type.toLowerCase());
      const timeAgo = getTimeAgo(timestamp, t || (() => ''));
      const cachedNode = nodeCache.current.get(id);

      const isGroupNode = id.includes(':group');

      // Check if this node has the highlighted label
      const hasHighlightedLabel =
        highlightedLabels &&
        resourceData?.metadata?.labels &&
        resourceData.metadata.labels[highlightedLabels.key] === highlightedLabels.value;

      // Get dynamically scaled node style
      const scaledNodeStyle = getScaledNodeStyle(currentZoom);

      const node =
        cachedNode ||
        ({
          id,
          data: {
            label: (
              <NodeLabel
                label={label}
                icon={config.icon}
                dynamicText={config.dynamicText}
                status={status}
                timeAgo={timeAgo}
                resourceData={resourceData}
                onClick={e => {
                  if (
                    (e.target as HTMLElement).tagName === 'svg' ||
                    (e.target as HTMLElement).closest('svg')
                  )
                    return;
                  if (isGroupNode && groupItems) {
                    onNodeSelect({
                      namespace: namespace || 'default',
                      name: label,
                      type: type.toLowerCase(),
                      resourceData,
                      isGroup: true,
                      groupItems,
                    });
                  } else {
                    onNodeSelect({
                      namespace: namespace || 'default',
                      name: label,
                      type: type.toLowerCase(),
                      resourceData,
                    });
                  }
                }}
                onMenuClick={e => onMenuOpen(e, id)}
              />
            ),
          },
          position: { x: 0, y: 0 },
          style: {
            ...scaledNodeStyle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: theme === 'dark' ? '#fff' : '#000',
            ...(hasHighlightedLabel
              ? {
                  boxShadow: `0 0 0 2px ${theme === 'dark' ? '#41dc8e' : '#41dc8e'}`,
                  backgroundColor:
                    theme === 'dark' ? 'rgba(68, 152, 255, 0.15)' : 'rgba(68, 152, 255, 0.08)',
                  zIndex: 1000,
                  opacity: 1,
                  transition: 'all 0.2s ease-in-out',
                }
              : {
                  backgroundColor: theme === 'dark' ? '#333' : '#fff',
                  transition: 'all 0.2s ease-in-out',
                  ...(highlightedLabels
                    ? {
                        opacity: 0.5,
                      }
                    : {}),
                }),
          },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          isGroup: isGroupNode,
        } as CustomNode);

      // If the node is already cached but highlighting changed, update style
      if (cachedNode) {
        node.style = {
          ...scaledNodeStyle,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: hasHighlightedLabel
            ? theme === 'dark'
              ? 'rgba(68, 152, 255, 0.15)'
              : 'rgba(68, 152, 255, 0.08)'
            : theme === 'dark'
              ? '#333'
              : '#fff',
          color: theme === 'dark' ? '#fff' : '#000',
          ...(hasHighlightedLabel
            ? {
                boxShadow: `0 0 0 2px ${theme === 'dark' ? '#41dc8e' : '#41dc8e'}`,
                zIndex: 1000,
                opacity: 1,
                transition: 'all 0.2s ease-in-out',
              }
            : highlightedLabels
              ? {
                  boxShadow: 'none',
                  zIndex: 0,
                  opacity: 0.5,
                  transition: 'all 0.2s ease-in-out',
                }
              : {}),
        };
      }

      if (!cachedNode) nodeCache.current.set(id, node);
      newNodes.push(node);

      // Add direct edge from parent to node if it's a parent-child relationship
      if (parent && isExpanded) {
        const uniqueSuffix = resourceData?.metadata?.uid || edgeIdCounter.current++;
        const edgeId = `edge-${parent}-${id}-${uniqueSuffix}`;
        const edge = {
          id: edgeId,
          source: parent,
          target: id,
          type: edgeType,
          animated: true,
          style: { stroke: theme === 'dark' ? '#777' : '#a3a3a3', strokeDasharray: '2,2' },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: theme === 'dark' ? '#777' : '#a3a3a3',
          },
        };
        newEdges.push(edge);
      }
    },
    [
      theme,
      isExpanded,
      highlightedLabels,
      onNodeSelect,
      onMenuOpen,
      currentZoom,
      getScaledNodeStyle,
      edgeType,
    ]
  );

  const clearNodeCache = useCallback(() => {
    nodeCache.current.clear();
    edgeIdCounter.current = 0;
  }, []);

  const updateNodeStyles = useCallback(
    (nodes: CustomNode[]) => {
      return nodes.map(node => {
        const resourceData = node.data?.label?.props?.resourceData;
        const hasHighlightedLabel =
          resourceData?.metadata?.labels &&
          highlightedLabels &&
          resourceData.metadata.labels[highlightedLabels.key] === highlightedLabels.value;

        const scaledNodeStyle = getScaledNodeStyle(currentZoom);

        const newStyle = {
          ...scaledNodeStyle,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: hasHighlightedLabel
            ? theme === 'dark'
              ? 'rgba(47, 134, 255, 0.2)'
              : 'rgba(47, 134, 255, 0.12)'
            : theme === 'dark'
              ? '#333'
              : '#fff',
          color: theme === 'dark' ? '#fff' : '#000',
          boxShadow: hasHighlightedLabel
            ? `0 0 0 2px ${theme === 'dark' ? '#41dc8e' : '#41dc8e'}`
            : 'none',
          zIndex: hasHighlightedLabel ? 1000 : 0,
          opacity: !highlightedLabels ? 1 : hasHighlightedLabel ? 1 : 0.5,
          transition: 'all 0.2s ease-in-out',
        };

        return {
          ...node,
          style: newStyle,
        };
      });
    },
    [theme, highlightedLabels, currentZoom, getScaledNodeStyle]
  );

  return {
    createNode,
    clearNodeCache,
    updateNodeStyles,
  };
};
