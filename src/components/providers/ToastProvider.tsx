import React from 'react';
import { Toaster, ToastOptions, DefaultToastOptions } from 'react-hot-toast';

interface ToastProviderProps {
  children: React.ReactNode;
  toastOptions?: ToastOptions;
}

const ToastProvider: React.FC<ToastProviderProps> = ({ children, toastOptions }) => {
  const defaultOptions: DefaultToastOptions = {
    duration: 4000,
    position: 'top-center',
    style: {
      background: 'rgba(30, 41, 59, 0.98)',
      color: '#fff',
      padding: '16px 20px',
      borderRadius: '16px',
      fontSize: '14px',
      maxWidth: '400px',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      lineHeight: '1.6',
      fontWeight: '500',
      letterSpacing: '0.025em',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      transform: 'translateY(0)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'default',
      userSelect: 'none',
      position: 'relative',
      overflow: 'hidden',
    },
    success: {
      style: {
        background: 'rgba(6, 78, 59, 0.98)',
        border: '1px solid rgba(5, 150, 105, 0.3)',
        color: '#d1fae5',
      },
      iconTheme: {
        primary: '#10b981',
        secondary: 'rgba(6, 78, 59, 0.98)',
      },
      duration: 3000,
      ariaProps: {
        role: 'status',
        'aria-live': 'polite',
      },
      className: 'toast-success',
    },
    error: {
      style: {
        background: 'rgba(127, 29, 29, 0.98)',
        border: '1px solid rgba(220, 38, 38, 0.3)',
        color: '#fee2e2',
      },
      iconTheme: {
        primary: '#ef4444',
        secondary: 'rgba(127, 29, 29, 0.98)',
      },
      duration: 5000,
      ariaProps: {
        role: 'alert',
        'aria-live': 'assertive',
      },
      className: 'toast-error',
    },
    loading: {
      style: {
        background: 'rgba(30, 58, 138, 0.98)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        color: '#dbeafe',
      },
      duration: Infinity,
      ariaProps: {
        role: 'status',
        'aria-live': 'polite',
      },
      className: 'toast-loading',
    },
  };

  const mergedOptions = {
    ...defaultOptions,
    ...toastOptions,
    style: {
      ...defaultOptions.style,
      ...toastOptions?.style,
    },
  };

  return (
    <>
      {children}
      <Toaster 
        position="top-center" 
        reverseOrder={false} 
        gutter={16}
        containerClassName="toast-container"
        containerStyle={{
          zIndex: 9999,
          top: '1rem',
          maxWidth: '100%',
          width: 'auto',
          padding: '0 1rem',
        }}
        toastOptions={mergedOptions}
      />
      <style>
        {`
          .toast-container {
            animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          .toast-success {
            animation: successPulse 2s infinite;
          }
          
          .toast-error {
            animation: errorShake 0.5s ease-in-out;
          }
          
          .toast-loading {
            animation: loadingPulse 1.5s infinite;
          }

          .toast-success::before,
          .toast-error::before,
          .toast-loading::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, 
              transparent,
              rgba(255, 255, 255, 0.3),
              transparent
            );
            animation: shimmer 2s infinite;
            z-index: 1;
          }
          
          @keyframes slideIn {
            0% {
              transform: translateY(-100%) scale(0.95);
              opacity: 0;
            }
            100% {
              transform: translateY(0) scale(1);
              opacity: 1;
            }
          }
          
          @keyframes successPulse {
            0% {
              box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
            }
            70% {
              box-shadow: 0 0 0 6px rgba(16, 185, 129, 0);
            }
            100% {
              box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
            }
          }
          
          @keyframes errorShake {
            0%, 100% {
              transform: translateX(0) rotate(0);
            }
            25% {
              transform: translateX(-5px) rotate(-1deg);
            }
            75% {
              transform: translateX(5px) rotate(1deg);
            }
          }
          
          @keyframes loadingPulse {
            0% {
              opacity: 1;
              transform: scale(1);
            }
            50% {
              opacity: 0.7;
              transform: scale(0.98);
            }
            100% {
              opacity: 1;
              transform: scale(1);
            }
          }

          @keyframes shimmer {
            0% {
              transform: translateX(-100%) skewX(-15deg);
            }
            100% {
              transform: translateX(100%) skewX(-15deg);
            }
          }

          /* Hover effects */
          .toast-success:hover,
          .toast-error:hover,
          .toast-loading:hover {
            transform: translateY(-2px) scale(1.02);
            box-shadow: 0 25px 30px -5px rgba(0, 0, 0, 0.15), 0 15px 15px -5px rgba(0, 0, 0, 0.08);
          }

          /* Focus styles for accessibility */
          .toast-success:focus,
          .toast-error:focus,
          .toast-loading:focus {
            outline: 2px solid rgba(255, 255, 255, 0.5);
            outline-offset: 2px;
            transform: scale(1.02);
          }

          /* Progress bar animation */
          .toast-success::after,
          .toast-error::after,
          .toast-loading::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            height: 3px;
            background: linear-gradient(90deg,
              rgba(255, 255, 255, 0.3),
              rgba(255, 255, 255, 0.1)
            );
            animation: progress linear forwards;
            z-index: 1;
          }

          .toast-success::after {
            animation-duration: 3s;
          }

          .toast-error::after {
            animation-duration: 5s;
          }

          @keyframes progress {
            from {
              width: 100%;
              opacity: 1;
            }
            to {
              width: 0%;
              opacity: 0.5;
            }
          }

          /* Toast content styles */
          .toast-success > div,
          .toast-error > div,
          .toast-loading > div {
            position: relative;
            z-index: 2;
          }

          /* Toast icon styles */
          .toast-success svg,
          .toast-error svg,
          .toast-loading svg {
            filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
            transition: transform 0.2s ease;
          }

          .toast-success:hover svg,
          .toast-error:hover svg,
          .toast-loading:hover svg {
            transform: scale(1.1);
          }
        `}
      </style>
    </>
  );
};

export default ToastProvider;