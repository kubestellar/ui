import React from 'react';
import { motion } from 'framer-motion';
import {
  HiShieldCheck,
  HiShieldExclamation,
  HiXMark,
  HiClock,
  HiQuestionMarkCircle,
} from 'react-icons/hi2';

interface SecurityBadgeProps {
  galaxySafe: boolean;
  securityScore: number;
  riskLevel: string;
  securityStatus: string;
  className?: string;
}

export const SecurityBadge: React.FC<SecurityBadgeProps> = ({
  galaxySafe,
  securityScore,
  riskLevel,
  securityStatus,
  className = '',
}) => {
  const getBadgeConfig = () => {
    if (galaxySafe) {
      return {
        icon: HiShieldCheck,
        text: 'Galaxy Safe',
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        borderColor: 'border-green-200',
        description: 'Verified safe by KubeStellar security scan',
      };
    }

    switch (securityStatus) {
      case 'safe':
        return {
          icon: HiShieldCheck,
          text: 'Safe',
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          borderColor: 'border-green-200',
          description: 'Passed security scan',
        };
      case 'unsafe':
        return {
          icon: HiXMark,
          text: 'Unsafe',
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          borderColor: 'border-red-200',
          description: 'Failed security scan',
        };
      case 'pending':
        return {
          icon: HiClock,
          text: 'Pending',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          borderColor: 'border-yellow-200',
          description: 'Security scan in progress',
        };
      case 'failed':
        return {
          icon: HiShieldExclamation,
          text: 'Scan Failed',
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
          borderColor: 'border-orange-200',
          description: 'Security scan failed to complete',
        };
      default:
        return {
          icon: HiQuestionMarkCircle,
          text: 'Unknown',
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-200',
          description: 'Security status unknown',
        };
    }
  };

  const config = getBadgeConfig();
  const Icon = config.icon;

  return (
    <motion.div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${config.bgColor} ${config.borderColor} ${config.color} ${className}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      title={`${config.description} (Score: ${securityScore}/100, Risk: ${riskLevel})`}
    >
      <Icon className="h-3 w-3" />
      <span>{config.text}</span>
      {galaxySafe && (
        <motion.div
          className="ml-1 rounded-full bg-green-500 p-0.5"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 500 }}
        >
          <HiShieldCheck className="h-2 w-2 text-white" />
        </motion.div>
      )}
    </motion.div>
  );
};

export default SecurityBadge;
