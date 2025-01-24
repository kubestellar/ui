import { PropsWithChildren, useContext } from "react";
import { ThemeContext } from "./ThemeContext";

export default function ClientThemeWrapper({ children }: PropsWithChildren) {
    const { theme } = useContext(ThemeContext);
    return <div data-theme={theme}>{children}</div>;
}