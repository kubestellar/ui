import React from 'react';

type SkeletonProps = {
  className?: string;
  variant?: 'rectangular' | 'circular' | 'text';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
};

/**
 * Skeleton component for loading states
 * 
 * @param className - Additional CSS classes
 * @param variant - Shape of skeleton (rectangular, circular, text)
 * @param width - Width of the skeleton
 * @param height - Height of the skeleton
 * @param animation - Type of animation effect
 */
const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
  animation = 'pulse',
}) => {
  const baseClasses = "bg-gray-200 dark:bg-gray-700";
  const animationClasses = {
    pulse: "animate-pulse",
    wave: "animate-shimmer",
    none: "",
  };
  
  const variantClasses = {
    rectangular: "",
    circular: "rounded-full",
    text: "rounded-md",
  };
  
  const styles: React.CSSProperties = {
    width: width,
    height: height,
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={styles}
      aria-hidden="true"
    />
  );
};

export default Skeleton;