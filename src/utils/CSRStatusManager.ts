export interface CSRStatus {
  approved: boolean;
  message?: string;
}

class CSRStatusManager {
  private clusterName: string;
  private onUpdate: (status: CSRStatus) => void;
  private onError: (message: string) => void; // ✅ Add error callback
  private intervalId: NodeJS.Timeout | null = null;

  constructor(
    clusterName: string,
    onUpdate: (status: CSRStatus) => void,
    onError: (message: string) => void
  ) {
    this.clusterName = clusterName;
    this.onUpdate = onUpdate;
    this.onError = onError; // ✅ Save error callback
  }

  startPolling() {
    if (!this.clusterName) return;

    const fetchStatus = async () => {
      try {
        const response = await fetch(
          `/api/cluster-status?name=${encodeURIComponent(this.clusterName)}`
        );
        if (!response.ok) throw new Error('Failed to fetch CSR status');

        const data: CSRStatus = await response.json();
        this.onUpdate(data);

        if (!data.approved) {
          this.intervalId = setTimeout(fetchStatus, 5000); // Retry every 5s
        }
      } catch (error) {
        console.error('CSR Status Check Failed:', error);
        this.onError('Failed to check CSR status.'); // ✅ Set error
      }
    };

    fetchStatus();
  }

  stopPolling() {
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
  }
}

export default CSRStatusManager;
