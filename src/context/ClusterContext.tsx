import { createContext, useContext, useState, ReactNode } from "react";

interface ClusterContextType {
  selectedCluster: string | null;
  setSelectedCluster: (cluster: string | null) => void;
  hasAvailableClusters: boolean;
  setHasAvailableClusters: (hasAvailable: boolean) => void;
}

const ClusterContext = createContext<ClusterContextType | undefined>(undefined);

export function ClusterProvider({ children }: { children: ReactNode }) {
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [hasAvailableClusters, setHasAvailableClusters] = useState(false);

  return (
    <ClusterContext.Provider
      value={{
        selectedCluster,
        setSelectedCluster,
        hasAvailableClusters,
        setHasAvailableClusters,
      }}
    >
      {children}
    </ClusterContext.Provider>
  );
}

export function useCluster() {
  const context = useContext(ClusterContext);
  if (context === undefined) {
    throw new Error("useCluster must be used within a ClusterProvider");
  }
  return context;
}
