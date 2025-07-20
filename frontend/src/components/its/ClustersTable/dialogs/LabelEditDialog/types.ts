import { ManagedClusterInfo, ColorTheme } from '../../types';

export interface LabelItem {
  key: string;
  value: string;
}

export interface LabelEditDialogProps {
  open: boolean;
  onClose: () => void;
  cluster: ManagedClusterInfo | null;
  onSave: (
    clusterName: string,
    contextName: string,
    labels: { [key: string]: string },
    deletedLabels?: string[]
  ) => void;
  isDark: boolean;
  colors: ColorTheme;
}
