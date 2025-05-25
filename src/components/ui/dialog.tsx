import { ReactNode } from 'react';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export function Dialog({ open, children }: DialogProps) {
  if (!open) return null;

  return <>{children}</>;
}
