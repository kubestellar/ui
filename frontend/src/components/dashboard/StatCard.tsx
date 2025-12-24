import React from 'react';
import { motion, Variants } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronUp, ChevronDown, FileText, Activity } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  change?: number;
  iconColor: 'blue' | 'green' | 'purple' | 'amber' | 'gray';
  isContext?: boolean;
  link?: string;
  variants?: Variants;
}

const defaultVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.3 } },
};

// Get colors for gradient based on the icon color type
const getGradient = (iconColor: string) => {
  switch (iconColor) {
    case 'blue':
      return 'bg-gradient-to-br from-blue-500/10 to-indigo-600/5 dark:from-blue-900/20 dark:to-indigo-900/10';
    case 'green':
      return 'bg-gradient-to-br from-emerald-500/10 to-green-600/5 dark:from-emerald-900/20 dark:to-green-900/10';
    case 'purple':
      return 'bg-gradient-to-br from-violet-500/10 to-purple-600/5 dark:from-violet-900/20 dark:to-purple-900/10';
    case 'amber':
      return 'bg-gradient-to-br from-amber-500/10 to-orange-600/5 dark:from-amber-900/20 dark:to-orange-900/10';
    case 'gray':
    default:
      return 'bg-gradient-to-br from-gray-600/15 to-gray-700/10 dark:from-gray-800/30 dark:to-gray-900/20';
  }
};

// Get colors for the icon container
const getIconGradient = (iconColor: string) => {
  switch (iconColor) {
    case 'blue':
      return 'bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-400 dark:to-indigo-500';
    case 'green':
      return 'bg-gradient-to-br from-emerald-500 to-green-600 dark:from-emerald-400 dark:to-green-500';
    case 'purple':
      return 'bg-gradient-to-br from-violet-500 to-purple-600 dark:from-violet-400 dark:to-purple-500';
    case 'amber':
      return 'bg-gradient-to-br from-amber-500 to-orange-600 dark:from-amber-400 dark:to-orange-500';
    case 'gray':
    default:
      return 'bg-gradient-to-br from-gray-500 to-gray-600 dark:from-gray-400 dark:to-gray-500';
  }
};

interface CardLinkWrapperProps {
  children?: React.ReactNode;
  link?: string;
}

const CardLinkWrapper: React.FC<CardLinkWrapperProps> = ({ children, link }) => {
  return link ? (
    <Link to={link} className="block h-full w-full">
      {children}
    </Link>
  ) : (
    <div className="block h-full w-full cursor-default">{children}</div>
  );
};

// Get indicator component based on card type
const getIndicator = (title: string) => {
  if (title === 'Total Clusters') {
    return (
      <div className="flex h-10 items-end space-x-1">
        {[0.4, 0.7, 1, 0.6, 0.8].map((height, i) => (
          <motion.div
            key={i}
            className="w-1.5 rounded-t bg-blue-500/70 dark:bg-blue-400/70"
            initial={{ height: 0 }}
            animate={{ height: `${height * 40}px` }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
          ></motion.div>
        ))}
      </div>
    );
  }

  if (title === 'Active Clusters') {
    return (
      <div className="flex h-10 w-10 items-center justify-center">
        <div className="flex -space-x-1.5">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="h-5 w-5 rounded-full border-2 border-white bg-emerald-500/80 dark:border-gray-800 dark:bg-emerald-400/80"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.1, duration: 0.3 }}
            ></motion.div>
          ))}
        </div>
      </div>
    );
  }

  if (title === 'Binding Policies') {
    return (
      <div className="relative flex h-10 w-10 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-purple-100 dark:bg-purple-900/30"></div>
        <FileText
          size={60}
          className="scale-[0.65] transform text-purple-600/80 dark:text-purple-400/80"
        />
      </div>
    );
  }

  if (title === 'Current Context') {
    return (
      <div className="relative flex h-10 w-10 items-center justify-center">
        <div className="absolute inset-0 rounded-full border-2 border-amber-500/30 bg-amber-500/10 dark:border-amber-400/30 dark:bg-amber-400/10"></div>
        <div className="absolute inset-0 rounded-full border-2 border-dashed border-amber-500/40 dark:border-amber-400/40"></div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/30 dark:from-amber-400/20 dark:to-amber-500/30">
          <Activity size={16} className="text-amber-600 dark:text-amber-400" />
        </div>
      </div>
    );
  }

  return null;
};
const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  change,
  iconColor,
  isContext = false,
  link,
  variants = defaultVariants,
}) => {
  // Determine if change is positive, negative or neutral
  const isPositive = typeof change === 'number' && change > 0;
  const isNegative = typeof change === 'number' && change < 0;

  return (
    <CardLinkWrapper link={link}>
      <motion.div
        className={`flex flex-col rounded-xl border border-gray-100 p-6 shadow-sm transition-all duration-300 dark:border-gray-700 ${getGradient(iconColor)} relative overflow-hidden`}
        whileHover={{
          y: -4,
          boxShadow: '0 12px 24px rgba(0, 0, 0, 0.12)',
          transition: { duration: 0.3, ease: [0.23, 1, 0.32, 1] },
        }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        variants={variants}
      >
        {/* Decorative background elements for visual interest without animation loops */}
        <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gradient-to-br from-white/5 to-white/10 dark:from-gray-700/10 dark:to-gray-700/20"></div>
        <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-gradient-to-tl from-white/5 to-white/0 dark:from-gray-700/5 dark:to-transparent"></div>

        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center">
            <div
              className={`rounded-xl p-2.5 ${getIconGradient(iconColor)} mr-3 text-white shadow-lg`}
            >
              {React.createElement(Icon, { size: 18 })}
            </div>
            <span className="text-sm font-medium text-gray-700 transition-colors dark:text-gray-300">
              {title}
            </span>
          </div>
        </div>

        <div className="mt-1 flex items-end justify-between">
          <div className="min-w-0 flex-grow">
            <div className="flex items-center">
              <h3 className="truncate text-3xl font-bold text-gray-900 transition-colors dark:text-gray-50">
                {value}
              </h3>
              {isContext && (
                <div className="ml-2 h-2.5 w-2.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]"></div>
              )}
            </div>
            {change !== undefined && (
              <div className="mt-2.5 flex w-fit items-center rounded-full bg-gray-50 px-3 py-1 dark:bg-gray-800/50">
                {isPositive && <ChevronUp size={16} className="mr-1.5 text-emerald-500" />}
                {isNegative && <ChevronDown size={16} className="mr-1.5 text-red-500" />}
                <span
                  className={
                    isPositive
                      ? 'text-sm font-medium text-emerald-500'
                      : isNegative
                        ? 'text-sm font-medium text-red-500'
                        : 'text-sm font-medium text-gray-500 dark:text-gray-400'
                  }
                >
                  {Math.abs(change)}% {isPositive ? 'increase' : isNegative ? 'decrease' : 'change'}
                </span>
              </div>
            )}
          </div>

          {/* Static visual indicators that don't use infinite animation loops */}
          {getIndicator(title)}
        </div>
      </motion.div>
    </CardLinkWrapper>
  );
};

export default StatCard;
