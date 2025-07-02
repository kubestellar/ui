// src/components/ui/PublicRouteSkeleton.tsx
import React from 'react';
import { motion } from 'framer-motion';
import useTheme from '../../stores/themeStore';
import Skeleton from './Skeleton';

const PublicRouteSkeleton: React.FC = () => {
  const theme = useTheme(state => state.theme);
  const isDark = theme === 'dark';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0f1c]">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-center"
      >
        {/* App logo skeleton */}
        <Skeleton width={120} height={120} className="mx-auto mb-8 rounded-full" />

        {/* Loading text skeleton */}
        <div className="flex flex-col items-center gap-2">
          <Skeleton width={240} height={24} className="mb-2 rounded" />
          <Skeleton width={180} height={16} className="rounded" />
        </div>

        {/* Loading indicator */}
        <div className="mt-8 flex justify-center space-x-2">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="h-3 w-3 rounded-full"
              style={{
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
                animation: `pulse 1.5s ease-in-out ${i * 0.3}s infinite`,
              }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default PublicRouteSkeleton;
