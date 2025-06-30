import useTheme from '../stores/themeStore';
import { PropsWithChildren } from 'react';

export default function ClientThemeWrapper({ children }: PropsWithChildren) {
  const theme = useTheme(state => state.theme);
  return <div data-theme={theme}>{children}</div>;
}
