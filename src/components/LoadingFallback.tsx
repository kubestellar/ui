import React from 'react';
import { useTranslation } from 'react-i18next';

interface LoadingFallbackProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
}

const LoadingFallback: React.FC<LoadingFallbackProps> = ({ message, size = 'medium' }) => {
  const { t } = useTranslation();
  const defaultMessage = t('common.loading');

  const spinnerSizes = {
    small: 'h-8 w-8',
    medium: 'h-12 w-12',
    large: 'h-16 w-16',
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[200px] flex-col items-center justify-center gap-4"
    >
      <div
        className={`animate-spin rounded-full border-b-2 border-t-2 border-primary ${spinnerSizes[size]}`}
        aria-hidden="true"
      />
      {(message || defaultMessage) && (
        <p className="text-sm text-gray-600 dark:text-gray-300">{message || defaultMessage}</p>
      )}
      <span className="sr-only">{t('loadingFallback.loadingContent')}</span>
    </div>
  );
};

export default LoadingFallback;
