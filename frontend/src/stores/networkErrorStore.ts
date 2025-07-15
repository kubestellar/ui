import { create } from 'zustand';

interface NetworkErrorState {
  isNetworkError: boolean;
  networkErrorToastId: string | null;
  setNetworkError: (isError: boolean) => void;
  setNetworkErrorToastId: (id: string | null) => void;
}

const useNetworkErrorStore = create<NetworkErrorState>(set => ({
  isNetworkError: false,
  networkErrorToastId: null,
  setNetworkError: isError => set({ isNetworkError: isError }),
  setNetworkErrorToastId: id => set({ networkErrorToastId: id }),
}));

export default useNetworkErrorStore;
