/**
 * Theme utility functions and constants for KubeStellar UI
 */

// CSS variable accessor function with type safety
export const getCssVar = (name: string): string => {
  if (typeof window !== 'undefined') {
    const value = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value;
  }
  return '';
};

// Theme constants
export const lightTheme = {
  // Background colors
  bg: {
    primary: '#f8fafc',
    secondary: '#f1f5f9',
    tertiary: '#e2e8f0',
    inverse: '#0d1117',
  },
  // Text colors
  text: {
    primary: '#1e293b',
    secondary: '#475569',
    tertiary: '#64748b',
    inverse: '#f8fafc',
    accent: '#2563eb',
  },
  // Accent/brand colors
  brand: {
    primary: '#2563eb',
    primaryLight: '#3b82f6',
    primaryDark: '#1d4ed8',
    secondary: '#8b5cf6',
    secondaryLight: '#a78bfa',
    secondaryDark: '#7c3aed',
  },
  // Status colors
  status: {
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
  // UI element colors
  element: {
    card: 'rgba(255, 255, 255, 0.8)',
    button: 'rgba(243, 244, 246, 0.8)',
    buttonHover: 'rgba(231, 235, 240, 0.9)',
    input: 'rgba(249, 250, 251, 0.9)',
  },
  // Shadows
  shadow: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.05)',
    highlight: '0 0 10px rgba(59, 130, 246, 0.3)',
  },
};

export const darkTheme = {
  // Background colors
  bg: {
    primary: '#0d1117',
    secondary: '#111827',
    tertiary: '#1f2937',
    inverse: '#f8fafc',
  },
  // Text colors
  text: {
    primary: '#f1f5f9',
    secondary: '#e2e8f0',
    tertiary: '#cbd5e1',
    inverse: '#1e293b',
    accent: '#3b82f6',
  },
  // Accent/brand colors
  brand: {
    primary: '#3b82f6',
    primaryLight: '#60a5fa',
    primaryDark: '#2563eb',
    secondary: '#a78bfa',
    secondaryLight: '#c4b5fd',
    secondaryDark: '#8b5cf6',
  },
  // Status colors
  status: {
    success: '#4ade80',
    warning: '#fbbf24',
    error: '#f87171',
    info: '#60a5fa',
  },
  // UI element colors
  element: {
    card: 'rgba(31, 41, 55, 0.7)',
    button: 'rgba(31, 41, 55, 0.6)',
    buttonHover: 'rgba(31, 41, 55, 0.8)',
    input: 'rgba(17, 24, 39, 0.8)',
  },
  // Shadows
  shadow: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.15)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -2px rgba(0, 0, 0, 0.15)',
    lg: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
    highlight: '0 0 10px rgba(59, 130, 246, 0.2)',
  },
};

// Get theme-based style
export const getThemeStyles = (isDark: boolean) => {
  const theme = isDark ? darkTheme : lightTheme;
  return {
    colors: theme,
    // Common styling functions
    card: {
      background: theme.element.card,
      color: theme.text.primary,
      borderColor: isDark ? 'rgba(75, 85, 99, 0.2)' : 'rgba(226, 232, 240, 0.8)',
      shadow: theme.shadow.md,
    },
    button: {
      primary: {
        background: theme.brand.primary,
        color: '#ffffff',
        hover: {
          background: theme.brand.primaryDark,
        },
      },
      secondary: {
        background: isDark ? 'rgba(31, 41, 55, 0.8)' : 'rgba(243, 244, 246, 0.8)',
        color: theme.text.primary,
        hover: {
          background: isDark ? 'rgba(31, 41, 55, 0.95)' : 'rgba(231, 235, 240, 0.95)',
        },
      },
      outline: {
        background: 'transparent',
        borderColor: isDark ? 'rgba(75, 85, 99, 0.6)' : 'rgba(203, 213, 225, 0.8)',
        color: theme.text.primary,
        hover: {
          background: isDark ? 'rgba(31, 41, 55, 0.3)' : 'rgba(243, 244, 246, 0.5)',
        },
      },
    },
    input: {
      background: theme.element.input,
      borderColor: isDark ? 'rgba(75, 85, 99, 0.3)' : 'rgba(203, 213, 225, 0.6)',
      color: theme.text.primary,
      placeholder: theme.text.tertiary,
      focus: {
        borderColor: theme.brand.primary,
        shadow: `0 0 0 2px ${isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)'}`,
      },
    },
    // Menu related styles
    menu: {
      background: isDark ? 'rgba(31, 41, 55, 0.7)' : 'rgba(255, 255, 255, 0.7)',
      itemHover: isDark ? 'rgba(55, 65, 81, 0.7)' : 'rgba(243, 244, 246, 0.7)',
      itemActive: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.08)',
      borderColor: isDark ? 'rgba(55, 65, 81, 0.5)' : 'rgba(226, 232, 240, 0.8)',
      catalog: {
        color: isDark ? '#3b82f6' : '#2563eb',
      },
      icon: {
        color: isDark ? '#4498FF' : '#2563eb',
        shadow: isDark
          ? 'drop-shadow(0 2px 1px rgba(68, 152, 255, 0.15))'
          : 'drop-shadow(0 2px 1px rgba(37, 99, 235, 0.1))',
      },
    },
    // Effects
    effects: {
      glassMorphism: {
        background: isDark ? 'rgba(17, 24, 39, 0.6)' : 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(12px)',
        borderColor: isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(226, 232, 240, 0.7)',
      },
      gradients: {
        primary: isDark
          ? 'linear-gradient(to right, rgba(59, 130, 246, 0.8), rgba(37, 99, 235, 0.8))'
          : 'linear-gradient(to right, rgba(37, 99, 235, 0.9), rgba(29, 78, 216, 0.9))',
        subtle: isDark
          ? 'linear-gradient(to right bottom, rgba(31, 41, 55, 0.5), rgba(17, 24, 39, 0.5))'
          : 'linear-gradient(to right bottom, rgba(255, 255, 255, 0.8), rgba(241, 245, 249, 0.8))',
      },
    },
  };
};

export default getThemeStyles;
