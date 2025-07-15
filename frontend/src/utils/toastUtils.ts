import { toast } from 'react-hot-toast';

const activeToasts = new Set<string>();

export const showToast = (message: string, type: 'success' | 'error' = 'error') => {
  if (activeToasts.has(message)) {
    return;
  }

  const toastId = toast[type](message, {
    onClose: () => {
      activeToasts.delete(message);
    },
  });

  if (typeof toastId === 'string') {
    activeToasts.add(message);
  }
};
