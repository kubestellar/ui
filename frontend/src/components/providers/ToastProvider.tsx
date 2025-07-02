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
      background: 'rgba(15, 23, 42, 0.95)',
      color: '#f8fafc',
      padding: '12px 16px',
      borderRadius: '12px',
      fontSize: '14px',
      maxWidth: '400px',
      boxShadow: '0 8px 32px 0 rgba(0,0,0,0.25)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      lineHeight: '1.5',
      fontWeight: 500,
      letterSpacing: '0.01em',
      backdropFilter: 'blur(10px)',
      border: '1.5px solid rgba(255,255,255,0.08)',
      transform: 'translateY(0)',
      transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'default',
      userSelect: 'none',
      position: 'relative',
      overflow: 'hidden',
    },
    success: {
      style: {
        background: 'linear-gradient(135deg, #047857 0%, #10b981 100%)',
        border: '2px solid rgba(167, 243, 208, 0.2)',
        color: '#ffffff',
      },
      iconTheme: {
        primary: '#ffffff',
        secondary: '#047857',
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
        background: 'linear-gradient(135deg, #991b1b 0%, #dc2626 100%)',
        border: '2px solid rgba(254, 202, 202, 0.2)',
        color: '#ffffff',
      },
      iconTheme: {
        primary: '#ffffff',
        secondary: '#991b1b',
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
        background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
        border: '2px solid rgba(191, 219, 254, 0.2)',
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
        gutter={16}
        containerClassName="toast-container"
        containerStyle={{
          zIndex: 9999,
          top: '1.25rem',
          maxWidth: '100%',
          width: 'auto',
          padding: '0 1rem',
        }}
        toastOptions={mergedOptions}
      />
      <style>
        {`
          .toast-container {
            animation: slideIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
            perspective: 1000px;
          }
          .toast-success {
            animation: popBounce 0.7s cubic-bezier(0.34, 1.56, 0.64, 1);
            transform-style: preserve-3d;
          }
          .toast-error {
            animation: shake 0.7s cubic-bezier(0.36, 0.07, 0.19, 0.97);
            transform-style: preserve-3d;
          }
          .toast-loading {
            animation: pulse 1.5s infinite cubic-bezier(0.4, 0, 0.6, 1);
            transform-style: preserve-3d;
          }
          .toast-success::after,
          .toast-error::after,
          .toast-loading::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            height: 3px;
            background: linear-gradient(90deg, 
              rgba(255,255,255,0.8),
              rgba(255,255,255,0.5),
              rgba(255,255,255,0.8)
            );
            animation: progress linear forwards;
            z-index: 1;
            transform: translateZ(1px);
          }
          .toast-success::after { animation-duration: 3s; }
          .toast-error::after { animation-duration: 5s; }
          .toast-loading::after { 
            height: 2px;
            animation: loadingBar 2s infinite linear;
            background: rgba(255,255,255,0.7);
            box-shadow: 0 0 8px rgba(255,255,255,0.5);
          }
          @keyframes slideIn {
            0% { 
              transform: translateY(-120%) scale(0.9) rotateX(-5deg); 
              opacity: 0;
              filter: blur(4px);
            }
            100% { 
              transform: translateY(0) scale(1) rotateX(0); 
              opacity: 1;
              filter: blur(0);
            }
          }
          @keyframes popBounce {
            0% { 
              transform: scale(0.7) rotateX(-10deg); 
              opacity: 0.7;
              filter: blur(3px);
            }
            50% { 
              transform: scale(1.05) rotateX(3deg); 
              opacity: 1;
              filter: blur(0);
            }
            75% { 
              transform: scale(0.97) rotateX(-1deg);
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
              transform: translateX(-8px) rotate(-2deg) translateZ(5px); 
            }
            30% { 
              transform: translateX(8px) rotate(2deg) translateZ(5px); 
            }
            45% { 
              transform: translateX(-6px) rotate(-1deg) translateZ(3px); 
            }
            60% { 
              transform: translateX(6px) rotate(1deg) translateZ(3px); 
            }
            75% { 
              transform: translateX(-3px) rotate(-0.5deg) translateZ(1px); 
            }
            90% { 
              transform: translateX(3px) rotate(0.5deg) translateZ(1px); 
            }
          }
          @keyframes pulse {
            0% { 
              opacity: 1; 
              transform: scale(1) translateZ(0);
              filter: brightness(1) saturate(1);
            }
            50% { 
              opacity: 0.9; 
              transform: scale(0.99) translateZ(-3px);
              filter: brightness(1.05) saturate(1.05);
            }
            100% { 
              opacity: 1; 
              transform: scale(1) translateZ(0);
              filter: brightness(1) saturate(1);
            }
          }
          @keyframes progress {
            from { 
              width: 100%; 
              opacity: 0.9;
              filter: brightness(1.1) saturate(1.1);
            }
            to { 
              width: 0%; 
              opacity: 0.6;
              filter: brightness(0.9) saturate(0.9);
            }
          }
          @keyframes loadingBar {
            0% {
              width: 0%;
              left: 0;
            }
            50% {
              width: 30%;
            }
            100% {
              width: 0%;
              left: 100%;
            }
          }
          .toast-success > div,
          .toast-error > div,
          .toast-loading > div {
            position: relative;
            z-index: 2;
            animation: fadeIn 0.4s ease-out;
            transform-style: preserve-3d;
          }
          @keyframes fadeIn {
            from { 
              opacity: 0;
              transform: translateY(6px) translateZ(0);
            }
            to { 
              opacity: 1;
              transform: translateY(0) translateZ(0);
            }
          }
          .toast-success svg,
          .toast-error svg,
          .toast-loading svg {
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            transform-style: preserve-3d;
          }
          .toast-success:hover svg,
          .toast-error:hover svg,
          .toast-loading:hover svg {
            transform: scale(1.15) rotate(3deg) translateZ(20px);
            filter: drop-shadow(0 3px 6px rgba(0,0,0,0.25));
          }
          .toast-success:hover,
          .toast-error:hover,
          .toast-loading:hover {
            transform: translateY(-2px) scale(1.02) translateZ(10px);
            box-shadow: 
              0 15px 25px -5px rgba(0,0,0,0.3),
              0 10px 10px -5px rgba(0,0,0,0.2),
              0 0 15px rgba(255,255,255,0.05);
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          }
          .toast-success:focus,
          .toast-error:focus,
          .toast-loading:focus {
            outline: 2px solid rgba(255,255,255,0.4);
            outline-offset: 2px;
            transform: scale(1.02) translateZ(10px);
            transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
          }
        `}
      </style>
    </>
  );
};

export default ToastProvider;
