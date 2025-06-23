import { memo } from 'react';

type SpinnerSize = 'small' | 'medium' | 'large';

interface SpinnerProps {
  size?: SpinnerSize;
  color?: string;
}

/**
 * Size mappings for different spinner sizes
 */
const SIZE_MAP: Record<SpinnerSize, number> = {
  small: 16,
  medium: 24,
  large: 40,
};

/**
 * Spinner component for loading states
 *
 * @param size - The size of the spinner (small, medium, large)
 * @param color - Override the default theme color
 */
export const Spinner = memo(({ size = 'medium', color }: SpinnerProps) => {
  const sizeValue = SIZE_MAP[size] || SIZE_MAP.medium;

  return (
    <div
      className={`inline-block animate-spin rounded-full border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]`}
      style={{
        color: color || 'var(--color-primary, #2563eb)',
        width: sizeValue,
        height: sizeValue,
        borderWidth: Math.max(2, sizeValue / 8),
      }}
      role="status"
    >
      <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
        Loading...
      </span>
    </div>
  );
});

Spinner.displayName = 'Spinner';

export default Spinner;
