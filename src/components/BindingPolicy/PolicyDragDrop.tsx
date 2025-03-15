import React from 'react';
import { BindingPolicyInfo, Workload, ManagedCluster } from '../../types/bindingPolicy';
import { PolicyConfiguration } from './ConfigurationSidebar';
import PolicyDragDropContainer from './PolicyDragDropContainer';

interface PolicyDragDropProps {
  policies?: BindingPolicyInfo[];
  clusters?: ManagedCluster[];
  workloads?: Workload[];
  onPolicyAssign?: (policyName: string, targetType: 'cluster' | 'workload', targetName: string) => void;
  onCreateBindingPolicy?: (clusterId: string, workloadId: string, configuration?: PolicyConfiguration) => void;
}

const PolicyDragDrop: React.FC<PolicyDragDropProps> = (props) => {
  return <PolicyDragDropContainer {...props} />;
};

export default React.memo(PolicyDragDrop);