// Type declarations for lucide-react
declare module 'lucide-react' {
  import { ComponentType, SVGAttributes } from 'react';

  export interface IconProps extends SVGAttributes<SVGElement> {
    color?: string;
    size?: string | number;
    strokeWidth?: string | number;
  }

  export type Icon = ComponentType<IconProps>;

  // Define all icons used in the project
  export const Trash2: Icon;
  export const CloudOff: Icon;
  export const Tag: Icon;
  export const Tags: Icon;
  export const Search: Icon;
  export const Filter: Icon;
  export const Plus: Icon;
  export const X: Icon;
  export const Network: Icon;
  export const Share2: Icon;
  export const AlertCircle: Icon;
  export const Check: Icon;
  export const ChevronDown: Icon;
  export const Layers: Icon;
  export const Server: Icon;
  export const Link2Off: Icon;
  export const Terminal: Icon;
  export const Eye: Icon;
  export const EyeOff: Icon;
  export const Lock: Icon;
  export const User: Icon;
  export const Globe: Icon;
  export const Sun: Icon;
  export const Moon: Icon;
  export const MoreVerticalIcon: Icon;
  export const RefreshCw: Icon;
  export const Rocket: Icon;
  export const Home: Icon;

  // Export a default that captures any other icons that might be used
  const LucideIcons: Record<string, Icon>;
  export default LucideIcons;
}
