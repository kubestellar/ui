export interface ManagedClusterInfo {
  name: string;
  uid?: string;
  labels: { [key: string]: string };
  creationTime?: string;
  creationTimestamp?: string;
  status?: string;
  context: string;
  available?: boolean;
  joined?: boolean;
}

export interface ColorTheme {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  white: string;
  background: string;
  paper: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  disabled: string;
  [key: string]: string;
}

export interface StatusFilterItem {
  value: string;
  label: string;
  color: string;
  icon?: React.ReactNode;
}

export interface LabelFilter {
  key: string;
  value: string;
}

export interface BaseDialogProps {
  open: boolean;
  onClose: () => void;
  isDark: boolean;
  colors: ColorTheme;
}

export interface ClustersTableProps {
  clusters: ManagedClusterInfo[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  initialShowCreateOptions?: boolean;
  initialActiveOption?: string;
}
