import React from 'react';

interface TooltipProps {
  tooltip: string;
  disabled: boolean;
  children: React.ReactNode;
  className?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

const ButtonTooltip: React.FC<TooltipProps> = ({
  tooltip,
  disabled,
  children,
  className = '',
  placement = 'top',
}) => {
  const tooltipClass = `tooltip tooltip-${placement} ${className}`;
  return disabled ? (
    <div className={tooltipClass} data-tip={tooltip}>
      {children}
    </div>
  ) : (
    <>{children}</>
  );
};

export default ButtonTooltip;
