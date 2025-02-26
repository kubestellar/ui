import { create } from "zustand";

interface ClusterStoreType {
  selectedCluster: string | null;
  setSelectedCluster: (cluster: string | null) => void;
  hasAvailableClusters: boolean;
  setHasAvailableClusters: (hasAvailable: boolean) => void;
}

//  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
//  const [hasAvailableClusters, setHasAvailableClusters] = useState(false);

const useClusterStore = create<ClusterStoreType>((set) => ({
  selectedCluster: null,

  hasAvailableClusters: false,

  setSelectedCluster: (cluster) => set({ selectedCluster: cluster }),

  setHasAvailableClusters: (hasAvailable) =>
    set({ hasAvailableClusters: hasAvailable }),
}));

export default useClusterStore;
