import { useContext } from "react";
import { ThemeContext } from "../context/ThemeContext";

export const useChangeTheme = () => useContext(ThemeContext);
