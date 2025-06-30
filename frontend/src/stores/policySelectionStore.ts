import { create } from 'zustand';
import { BindingPolicyInfo } from '../types/bindingPolicy';

// Define selection types
export enum SelectionTypes {
  POLICY = 'POLICY',
  CLUSTER = 'CLUSTER',
  WORKLOAD = 'WORKLOAD',
}

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

export interface PolicySelectionTranslations {
  labelsAssigned: (itemType: string, itemId: string) => string;
  policyAssigned: (policyName: string, targetType: string, targetName: string) => string;
  clusterAlreadyAssigned: (targetName: string, policyName: string) => string;
  workloadAlreadyAssigned: (targetName: string, policyName: string) => string;
}

interface PolicySelectionState {
  // UI state
  activeSelectionItem: { type: string; id: string } | null;
  successMessage: string | null;
  translations: PolicySelectionTranslations | null;

  // Data state
  assignmentMap: Record<string, { clusters: string[]; workloads: string[] }>;
  canvasEntities: CanvasEntities;
  itemLabels: ItemLabels;

  // Actions
  setActiveSelectionItem: (item: { type: string; id: string } | null) => void;
  setSuccessMessage: (message: string | null) => void;
  clearSuccessMessageAfterDelay: () => void;
  setTranslations: (translations: PolicySelectionTranslations) => void;

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
export const usePolicySelectionStore = create<PolicySelectionState>((set, get) => ({
  // Initial state
  activeSelectionItem: null,
  successMessage: null,
  translations: null,
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
  setActiveSelectionItem: item => set({ activeSelectionItem: item }),
  setSuccessMessage: message => set({ successMessage: message }),
  setTranslations: translations => set({ translations }),
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
    const { itemLabels, translations } = get();
    const entityKey = `${itemType}s` as keyof ItemLabels;

    set({
      itemLabels: {
        ...itemLabels,
        [entityKey]: {
          ...itemLabels[entityKey],
          [itemId]: labels,
        },
      },
      successMessage: translations
        ? translations.labelsAssigned(itemType, itemId)
        : `Labels automatically assigned to ${itemType} ${itemId}`,
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
    const { assignmentMap, translations } = get();

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
          successMessage: translations
            ? translations.policyAssigned(policyName, targetType, targetName)
            : `Successfully assigned ${policyName} to ${targetType} ${targetName}`,
        });
        // Call the API
        onPolicyAssign(policyName, targetType, targetName);
      } else {
        set({
          successMessage: translations
            ? translations.clusterAlreadyAssigned(targetName, policyName)
            : `Cluster ${targetName} is already assigned to policy ${policyName}`,
        });
      }
    } else if (targetType === 'workload') {
      // For workloads, we use string starts-with matching since workload IDs can have namespaces
      const alreadyAssigned = newMap[policyName].workloads.some(w => w.includes(targetName));
      if (!alreadyAssigned) {
        newMap[policyName].workloads = [...newMap[policyName].workloads, targetName];
        set({
          assignmentMap: newMap,
          successMessage: translations
            ? translations.policyAssigned(policyName, targetType, targetName)
            : `Successfully assigned ${policyName} to ${targetType} ${targetName}`,
        });
        // Call the API
        onPolicyAssign(policyName, targetType, targetName);
      } else {
        set({
          successMessage: translations
            ? translations.workloadAlreadyAssigned(targetName, policyName)
            : `Workload ${targetName} is already assigned to policy ${policyName}`,
        });
      }
    }

    // Auto-hide the success message
    get().clearSuccessMessageAfterDelay();
  },
}));
