import { create } from 'zustand';
import { BindingPolicyInfo } from '../types/bindingPolicy';

// Define the drag types
export const DragTypes = {
  CLUSTER: 'CLUSTER_OR_WORKLOAD',
  WORKLOAD: 'CLUSTER_OR_WORKLOAD',
  POLICY: 'POLICY',
};

type EntityType = 'policy' | 'cluster' | 'workload';

// Define the state structure
interface CanvasEntities {
  clusters: string[];
  workloads: string[];
  policies: string[];
}

// Define the item labels structure to store labels for canvas items
interface ItemLabels {
  clusters: Record<string, Record<string, string>>;
  workloads: Record<string, Record<string, string>>;
}

interface PolicyDragDropState {
  // UI state
  activeDragItem: { type: string; id: string } | null;
  successMessage: string | null;

  // Data state
  assignmentMap: Record<string, { clusters: string[]; workloads: string[] }>;
  canvasEntities: CanvasEntities;
  itemLabels: ItemLabels;

  // Actions
  setActiveDragItem: (item: { type: string; id: string } | null) => void;
  setSuccessMessage: (message: string | null) => void;
  clearSuccessMessageAfterDelay: () => void;

  // Canvas management
  addToCanvas: (itemType: EntityType, itemId: string) => void;
  removeFromCanvas: (itemType: EntityType, itemId: string) => void;
  clearCanvas: () => void;

  // Label management
  assignLabelsToItem: (
    itemType: 'cluster' | 'workload',
    itemId: string,
    labels: Record<string, string>
  ) => void;
  getItemLabels: (itemType: 'cluster' | 'workload', itemId: string) => Record<string, string>;

  // Assignment management
  initializeAssignmentMap: (policies: BindingPolicyInfo[]) => void;
  assignPolicy: (
    policyName: string,
    targetType: 'cluster' | 'workload',
    targetName: string,
    onPolicyAssign: (
      policyName: string,
      targetType: 'cluster' | 'workload',
      targetName: string
    ) => void
  ) => void;
}

// Create the store
export const usePolicyDragDropStore = create<PolicyDragDropState>((set, get) => ({
  // Initial state
  activeDragItem: null,
  successMessage: null,
  assignmentMap: {},
  canvasEntities: {
    clusters: [],
    workloads: [],
    policies: [],
  },
  itemLabels: {
    clusters: {},
    workloads: {},
  },

  // UI state actions
  setActiveDragItem: item => set({ activeDragItem: item }),
  setSuccessMessage: message => set({ successMessage: message }),
  clearSuccessMessageAfterDelay: () => {
    const { successMessage } = get();
    if (successMessage) {
      setTimeout(() => {
        set({ successMessage: null });
      }, 3000);
    }
  },

  // Canvas management
  addToCanvas: (itemType, itemId) => {
    const { canvasEntities } = get();
    const entityKey = `${itemType}s` as keyof CanvasEntities;

    set({
      canvasEntities: {
        ...canvasEntities,
        [entityKey]: canvasEntities[entityKey].includes(itemId)
          ? canvasEntities[entityKey]
          : [...canvasEntities[entityKey], itemId],
      },
    });
  },

  removeFromCanvas: (itemType, itemId) => {
    const { canvasEntities, itemLabels } = get();
    const entityKey = `${itemType}s` as keyof CanvasEntities;

    // Create copy of the labels state for potential modification
    const newItemLabels = { ...itemLabels };

    // If itemType is cluster or workload, remove the item's labels too
    if (itemType === 'cluster' || itemType === 'workload') {
      // Remove labels for the item
      if (newItemLabels[`${itemType}s`][itemId]) {
        delete newItemLabels[`${itemType}s`][itemId];
      }
    }

    set({
      canvasEntities: {
        ...canvasEntities,
        [entityKey]: canvasEntities[entityKey].filter(id => id !== itemId),
      },
      itemLabels: newItemLabels,
    });
  },

  clearCanvas: () =>
    set({
      canvasEntities: {
        clusters: [],
        workloads: [],
        policies: [],
      },
      itemLabels: {
        clusters: {},
        workloads: {},
      },
    }),

  // Label management
  assignLabelsToItem: (itemType, itemId, labels) => {
    const { itemLabels } = get();
    const entityKey = `${itemType}s` as keyof ItemLabels;

    set({
      itemLabels: {
        ...itemLabels,
        [entityKey]: {
          ...itemLabels[entityKey],
          [itemId]: labels,
        },
      },
      successMessage: `Labels automatically assigned to ${itemType} ${itemId}`,
    });

    // Auto-hide the success message
    get().clearSuccessMessageAfterDelay();
  },

  getItemLabels: (itemType, itemId) => {
    const { itemLabels } = get();
    const entityKey = `${itemType}s` as keyof ItemLabels;

    return itemLabels[entityKey][itemId] || {};
  },

  // Assignment management
  initializeAssignmentMap: policies => {
    const newAssignmentMap: Record<string, { clusters: string[]; workloads: string[] }> = {};

    policies.forEach(policy => {
      newAssignmentMap[policy.name] = {
        clusters: policy.clusterList || [],
        workloads: policy.workloadList || [],
      };
    });

    set({ assignmentMap: newAssignmentMap });
  },

  assignPolicy: (policyName, targetType, targetName, onPolicyAssign) => {
    const { assignmentMap } = get();

    // Create a copy of the current state
    const newMap = { ...assignmentMap };
    if (!newMap[policyName]) {
      newMap[policyName] = { clusters: [], workloads: [] };
    }

    // Check if the assignment already exists
    if (targetType === 'cluster') {
      if (!newMap[policyName].clusters.includes(targetName)) {
        newMap[policyName].clusters = [...newMap[policyName].clusters, targetName];
        set({
          assignmentMap: newMap,
          successMessage: `Successfully assigned ${policyName} to ${targetType} ${targetName}`,
        });
        // Call the API
        onPolicyAssign(policyName, targetType, targetName);
      } else {
        set({
          successMessage: `Cluster ${targetName} is already assigned to policy ${policyName}`,
        });
      }
    } else if (targetType === 'workload') {
      // For workloads, we use string starts-with matching since workload IDs can have namespaces
      const alreadyAssigned = newMap[policyName].workloads.some(w => w.includes(targetName));
      if (!alreadyAssigned) {
        newMap[policyName].workloads = [...newMap[policyName].workloads, targetName];
        set({
          assignmentMap: newMap,
          successMessage: `Successfully assigned ${policyName} to ${targetType} ${targetName}`,
        });
        // Call the API
        onPolicyAssign(policyName, targetType, targetName);
      } else {
        set({
          successMessage: `Workload ${targetName} is already assigned to policy ${policyName}`,
        });
      }
    }

    // Auto-hide the success message
    get().clearSuccessMessageAfterDelay();
  },
}));
