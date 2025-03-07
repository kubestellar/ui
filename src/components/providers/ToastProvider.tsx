import React from 'react';
import { Toaster, ToastOptions } from 'react-hot-toast';

interface ToastProviderProps {
  children: React.ReactNode;
  toastOptions?: ToastOptions; // Allow custom toast options
}

const ToastProvider: React.FC<ToastProviderProps> = ({ children, toastOptions }) => {
  return (
    <>
      {children}
      <Toaster 
        position="top-right" 
        reverseOrder={false} 
        toastOptions={toastOptions} // Pass custom options to Toaster
      />
    </>
  );
};

export default ToastProvider;