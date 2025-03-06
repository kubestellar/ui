import { useEffect, useState } from "react";
import CSRStatusManager, { CSRStatus } from "../utils/CSRStatusManager";

export const useCSRStatus = (clusterName: string) => {
  const [status, setStatus] = useState<CSRStatus>({ approved: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!clusterName) return;

    const csrManager = new CSRStatusManager(
        clusterName,
        (newStatus) => {
          setStatus(newStatus);
          setLoading(false);
        },
        (errorMessage) => { // ✅ Fix: Pass error callback
          setError(errorMessage);
          setLoading(false);
        }
      );

    return () => {
      csrManager.stopPolling();
    };
  }, [clusterName]);

  return { status, loading, error }; 
};
