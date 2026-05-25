import React from 'react';
import { Cloud, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

const AWSSupportBanner = () => {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 shadow-sm dark:border-blue-900/30 dark:bg-blue-900/20"
    >
      <div className="flex items-start sm:items-center">
        <div className="mr-3 mt-0.5 rounded-full bg-blue-100 p-2 text-blue-600 dark:bg-blue-800/40 dark:text-blue-400 sm:mt-0">
          <Cloud size={20} />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
            {t('clusters.dashboard.awsSupport.title')}
          </h3>
          <p className="mt-1 text-sm text-blue-800 dark:text-blue-200">
            {t('clusters.dashboard.awsSupport.description')}
          </p>
        </div>
        <a
          href="https://docs.kubestellar.io"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-4 flex shrink-0 items-center rounded-md bg-white px-3 py-1.5 text-xs font-medium text-blue-700 shadow-sm transition-colors hover:bg-blue-50 dark:bg-blue-900 dark:text-blue-100 dark:hover:bg-blue-800"
        >
          {t('common.learnMore')}
          <ExternalLink size={12} className="ml-1.5" />
        </a>
      </div>
    </motion.div>
  );
};

export default AWSSupportBanner;
