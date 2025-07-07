// User data type
export interface User {
  id?: number;
  username: string;
  is_admin: boolean;
  permissions: Record<string, string>;
  created_at?: string;
  updated_at?: string;
}

// Permission component type
export interface PermissionComponent {
  id: string;
  name: string;
}

// Permission level type
export interface PermissionLevel {
  id: string;
  name: string;
}

// Theme styles interface
export interface ThemeStyles {
  colors: {
    text: {
      primary: string;
      secondary: string;
      tertiary?: string;
    };
    brand: {
      primary: string;
    };
    [key: string]: Record<string, string> | { [subKey: string]: string };
  };
}

// Props for user form modal
export interface UserFormModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  formError: string;
  username: string;
  setUsername: (username: string) => void;
  password: string;
  setPassword: (password: string) => void;
  confirmPassword: string;
  setConfirmPassword: (confirmPassword: string) => void;
  isAdmin: boolean;
  setIsAdmin: (isAdmin: boolean) => void;
  permissions: Record<string, string>;
  setPermissionChange: (component: string, permission: string) => void;
  permissionComponents: PermissionComponent[];
  permissionLevels: PermissionLevel[];
  submitLabel: string;
  showPasswordFields?: boolean;
  passwordOptional?: boolean;
  isDark: boolean;
  themeStyles: ThemeStyles;
}

// Props for delete user modal
export interface DeleteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => void;
  username: string;
  isDark: boolean;
  themeStyles: ThemeStyles;
  isDeleting?: boolean;
}
