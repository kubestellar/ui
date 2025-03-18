import React from 'react';
import { Toaster, ToastOptions} from 'react-hot-toast';

interface ToastProviderProps {
  children: React.ReactNode;
  toastOptions?: ToastOptions;
}

// Define a custom options type that extends the base ToastOptions
interface ExtendedToastOptions extends ToastOptions {
  success?: {
    style?: React.CSSProperties;
    iconTheme?: {
      primary: string;
      secondary: string;
    };
    duration?: number;
    icon?: React.ReactNode;
  };
  error?: {
    style?: React.CSSProperties;
    iconTheme?: {
      primary: string;
      secondary: string;
    };
    duration?: number;
    icon?: React.ReactNode;
  };
  loading?: {
    style?: React.CSSProperties;
    duration?: number;
    icon?: React.ReactNode;
  };
}

const ToastProvider: React.FC<ToastProviderProps> = ({ children, toastOptions }) => {
  // Enhanced default options with better styling and animations
  const defaultOptions: ExtendedToastOptions = {
    duration: 4000,
    position: 'top-center',
    // Default styling
    style: {
      background: '#1e293b',
      color: '#fff',
      padding: '12px 16px',
      borderRadius: '10px',
      fontSize: '14px',
      maxWidth: '350px',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    },
    // Success toast styling
    success: {
      style: {
        background: '#1e293b',
        border: '1px solid rgba(74, 222, 128, 0.2)',
      },
      iconTheme: {
        primary: '#4ade80',
        secondary: '#1e293b',
      },
    },
    // Error toast styling
    error: {
      style: {
        background: '#1e293b',
        border: '1px solid rgba(239, 68, 68, 0.2)',
      },
      iconTheme: {
        primary: '#ef4444',
        secondary: '#1e293b',
      },
    },
    // Loading toast styling
    loading: {
      style: {
        background: '#1e293b',
        border: '1px solid rgba(59, 130, 246, 0.2)',
      },
    },
  };

  // Merge default options with custom options
  const mergedOptions = { ...defaultOptions, ...toastOptions };

  return (
    <>
      {children}
      <Toaster 
        position="top-center" 
        reverseOrder={false} 
        gutter={12}
        containerClassName="toast-container"
        containerStyle={{
          zIndex: 9999,
        }}
        toastOptions={mergedOptions as ToastOptions}
      />
    </>
  );
};

export default ToastProvider;