import { useEffect } from 'react';
import { toast } from 'react-hot-toast';
import useNetworkErrorStore from '../stores/networkErrorStore';

const NetworkErrorToastManager = () => {
  const { isNetworkError, networkErrorToastId, setNetworkErrorToastId } = useNetworkErrorStore();

  useEffect(() => {
    if (isNetworkError && !networkErrorToastId) {
      const id = toast.error('A network error occurred. Please check your connection.', {
        duration: Infinity,
      });
      setNetworkErrorToastId(id);
    } else if (!isNetworkError && networkErrorToastId) {
      toast.dismiss(networkErrorToastId);
      setNetworkErrorToastId(null);
    }
  }, [isNetworkError, networkErrorToastId, setNetworkErrorToastId]);

  return null;
};

export default NetworkErrorToastManager;
