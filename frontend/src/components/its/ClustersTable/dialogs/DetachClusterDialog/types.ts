import { ManagedClusterInfo, ColorTheme } from '../../types';

export interface DetachClusterDialogProps {
  open: boolean;
  onClose: () => void;
  cluster: ManagedClusterInfo | null;
  onDetach: (clusterName: string) => void;
  isLoading: boolean;
  isDark: boolean;
  colors: ColorTheme;
}
