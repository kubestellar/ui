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
      background: 'rgba(17, 24, 39, 0.95)',
      color: '#f3f4f6',
      padding: '16px 20px',
      borderRadius: '16px',
      fontSize: '15px',
      maxWidth: '420px',
      boxShadow: '0 8px 32px 0 rgba(0,0,0,0.2)',
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      lineHeight: '1.7',
      fontWeight: 500,
      letterSpacing: '0.02em',
      backdropFilter: 'blur(10px)',
      border: '1.5px solid rgba(255,255,255,0.1)',
      transform: 'translateY(0)',
      transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'default',
      userSelect: 'none',
      position: 'relative',
      overflow: 'hidden',
    },
    success: {
      style: {
        background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
        border: '2px solid rgba(167, 243, 208, 0.3)',
        color: '#ffffff',
      },
      iconTheme: {
        primary: '#ffffff',
        secondary: '#059669',
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
        background: 'linear-gradient(135deg, #b91c1c 0%, #dc2626 100%)',
        border: '2px solid rgba(254, 202, 202, 0.3)',
        color: '#ffffff',
      },
      iconTheme: {
        primary: '#ffffff',
        secondary: '#b91c1c',
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
        background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
        border: '2px solid rgba(191, 219, 254, 0.3)',
        color: '#ffffff',
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
        gutter={18}
        containerClassName="toast-container"
        containerStyle={{
          zIndex: 9999,
          top: '1.5rem',
          maxWidth: '100%',
          width: 'auto',
          padding: '0 1rem',
        }}
        toastOptions={mergedOptions}
      />
      <style>
        {`
          .toast-container {
            animation: slideIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
            perspective: 1000px;
          }
          .toast-success {
            animation: popBounce 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
            transform-style: preserve-3d;
          }
          .toast-error {
            animation: shake 0.8s cubic-bezier(0.36, 0.07, 0.19, 0.97);
            transform-style: preserve-3d;
          }
          .toast-loading {
            animation: pulse 1.5s infinite cubic-bezier(0.4, 0, 0.6, 1);
            transform-style: preserve-3d;
          }
          .toast-success::before,
          .toast-error::before,
          .toast-loading::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, 
              transparent,
              rgba(255,255,255,0.6),
              transparent
            );
            animation: shimmer 2s infinite;
            z-index: 1;
            transform: translateZ(1px);
          }
          @keyframes slideIn {
            0% { 
              transform: translateY(-150%) scale(0.85) rotateX(-10deg); 
              opacity: 0;
              filter: blur(8px);
            }
            100% { 
              transform: translateY(0) scale(1) rotateX(0); 
              opacity: 1;
              filter: blur(0);
            }
          }
          @keyframes popBounce {
            0% { 
              transform: scale(0.6) rotateX(-15deg); 
              opacity: 0.6;
              filter: blur(4px);
            }
            50% { 
              transform: scale(1.12) rotateX(5deg); 
              opacity: 1;
              filter: blur(0);
            }
            75% { 
              transform: scale(0.95) rotateX(-2deg);
            }
            100% { 
              transform: scale(1) rotateX(0);
            }
          }
          @keyframes shake {
            0%, 100% { 
              transform: translateX(0) rotate(0) translateZ(0); 
            }
            15% { 
              transform: translateX(-12px) rotate(-3deg) translateZ(10px); 
            }
            30% { 
              transform: translateX(12px) rotate(3deg) translateZ(10px); 
            }
            45% { 
              transform: translateX(-8px) rotate(-2deg) translateZ(5px); 
            }
            60% { 
              transform: translateX(8px) rotate(2deg) translateZ(5px); 
            }
            75% { 
              transform: translateX(-4px) rotate(-1deg) translateZ(2px); 
            }
            90% { 
              transform: translateX(4px) rotate(1deg) translateZ(2px); 
            }
          }
          @keyframes pulse {
            0% { 
              opacity: 1; 
              transform: scale(1) translateZ(0);
              filter: brightness(1) saturate(1);
            }
            50% { 
              opacity: 0.85; 
              transform: scale(0.98) translateZ(-5px);
              filter: brightness(1.1) saturate(1.1);
            }
            100% { 
              opacity: 1; 
              transform: scale(1) translateZ(0);
              filter: brightness(1) saturate(1);
            }
          }
          @keyframes shimmer {
            0% { 
              transform: translateX(-100%) skewX(-15deg) translateZ(2px);
              opacity: 0.5;
            }
            50% { 
              opacity: 1;
            }
            100% { 
              transform: translateX(100%) skewX(-15deg) translateZ(2px);
              opacity: 0.5;
            }
          }
          .toast-success:hover,
          .toast-error:hover,
          .toast-loading:hover {
            transform: translateY(-3px) scale(1.04) translateZ(20px);
            box-shadow: 
              0 25px 30px -5px rgba(0,0,0,0.25),
              0 15px 15px -5px rgba(0,0,0,0.15),
              0 0 20px rgba(255,255,255,0.1);
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          }
          .toast-success:focus,
          .toast-error:focus,
          .toast-loading:focus {
            outline: 2px solid rgba(255,255,255,0.6);
            outline-offset: 3px;
            transform: scale(1.04) translateZ(20px);
            transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
          }
          .toast-success::after,
          .toast-error::after,
          .toast-loading::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            height: 4px;
            background: linear-gradient(90deg, 
              rgba(255,255,255,0.7),
              rgba(255,255,255,0.4),
              rgba(255,255,255,0.7)
            );
            animation: progress linear forwards;
            z-index: 1;
            transform: translateZ(1px);
          }
          .toast-success::after { animation-duration: 3s; }
          .toast-error::after { animation-duration: 5s; }
          @keyframes progress {
            from { 
              width: 100%; 
              opacity: 1;
              filter: brightness(1.2) saturate(1.2);
            }
            to { 
              width: 0%; 
              opacity: 0.6;
              filter: brightness(0.8) saturate(0.8);
            }
          }
          .toast-success > div,
          .toast-error > div,
          .toast-loading > div {
            position: relative;
            z-index: 2;
            animation: fadeIn 0.5s ease-out;
            transform-style: preserve-3d;
          }
          @keyframes fadeIn {
            from { 
              opacity: 0;
              transform: translateY(10px) translateZ(0);
            }
            to { 
              opacity: 1;
              transform: translateY(0) translateZ(0);
            }
          }
          .toast-success svg,
          .toast-error svg,
          .toast-loading svg {
            filter: drop-shadow(0 3px 6px rgba(0,0,0,0.2));
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            transform-style: preserve-3d;
          }
          .toast-success:hover svg,
          .toast-error:hover svg,
          .toast-loading:hover svg {
            transform: scale(1.2) rotate(5deg) translateZ(30px);
            filter: drop-shadow(0 4px 8px rgba(0,0,0,0.25));
          }
        `}
      </style>
    </>
  );
};

export default ToastProvider;