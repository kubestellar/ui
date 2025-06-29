import React, { useCallback, useRef } from 'react';
import { Position, MarkerType } from 'reactflow';
import { NodeLabel } from '../Wds_Topology/NodeLabel';
import useTheme from '../../stores/themeStore';
import useLabelHighlightStore from '../../stores/labelHighlightStore';
import { CustomNode, ResourceItem, CustomEdge } from './types';

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

const nodeStyle: React.CSSProperties = {
  padding: '2px 12px',
  fontSize: '6px',
  border: 'none',
  width: '146px',
  height: '30px',
};

const iconMap: Record<string, string> = {
  ConfigMap: '/src/assets/k8s_resources_logo/cm.svg',
  ClusterRoleBinding: '/src/assets/k8s_resources_logo/crb.svg',
  CustomResourceDefinition: '/src/assets/k8s_resources_logo/crd.svg',
  ClusterRole: '/src/assets/k8s_resources_logo/c-role.svg',
  CronJob: '/src/assets/k8s_resources_logo/cronjob.svg',
  Deployment: '/src/assets/k8s_resources_logo/deploy.svg',
  DaemonSet: '/src/assets/k8s_resources_logo/ds.svg',
  Endpoints: '/src/assets/k8s_resources_logo/ep.svg',
  Group: '/src/assets/k8s_resources_logo/group.svg',
  HorizontalPodAutoscaler: '/src/assets/k8s_resources_logo/hpa.svg',
  Ingress: '/src/assets/k8s_resources_logo/ing.svg',
  Job: '/src/assets/k8s_resources_logo/job.svg',
  LimitRange: '/src/assets/k8s_resources_logo/limits.svg',
  NetworkPolicy: '/src/assets/k8s_resources_logo/netpol.svg',
  Namespace: '/src/assets/k8s_resources_logo/ns.svg',
  PodSecurityPolicy: '/src/assets/k8s_resources_logo/psp.svg',
  PersistentVolume: '/src/assets/k8s_resources_logo/pv.svg',
  PersistentVolumeClaim: '/src/assets/k8s_resources_logo/pvc.svg',
  ResourceQuota: '/src/assets/k8s_resources_logo/quota.svg',
  RoleBinding: '/src/assets/k8s_resources_logo/rb.svg',
  Role: '/src/assets/k8s_resources_logo/role.svg',
  ReplicaSet: '/src/assets/k8s_resources_logo/rs.svg',
  ServiceAccount: '/src/assets/k8s_resources_logo/sa.svg',
  StorageClass: '/src/assets/k8s_resources_logo/sc.svg',
  Secret: '/src/assets/k8s_resources_logo/secret.svg',
  StatefulSet: '/src/assets/k8s_resources_logo/sts.svg',
  Service: '/src/assets/k8s_resources_logo/svc.svg',
  User: '/src/assets/k8s_resources_logo/user.svg',
  Volume: '/src/assets/k8s_resources_logo/vol.svg',
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
    : t('treeView.timeAgo.days', { count: diffDays });
};

export const useTreeViewNodes = ({ onNodeSelect, onMenuOpen, isExpanded }: TreeViewNodesProps) => {
  const theme = useTheme(state => state.theme);
  const highlightedLabels = useLabelHighlightStore(state => state.highlightedLabels);
  const nodeCache = useRef<Map<string, CustomNode>>(new Map());
  const edgeIdCounter = useRef<number>(0);

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
            ...nodeStyle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '2px 12px',
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
          ...node.style,
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
          type: 'step',
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
    [theme, isExpanded, highlightedLabels, onNodeSelect, onMenuOpen]
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

        const newStyle = {
          ...node.style,
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
    [theme, highlightedLabels]
  );

  return {
    createNode,
    clearNodeCache,
    updateNodeStyles,
  };
};
