import { PropsWithChildren, useEffect, useState } from "react";
import { ThemeContext } from "./ThemeContext";

export const ThemeProvider = ({ children }: PropsWithChildren) => {
    const [theme, setTheme] = useState<string>("light");
  
    useEffect(() => {
      // Retrieve the theme from localStorage or default to "light"
      const storedTheme = localStorage.getItem("theme") || "light";
      setTheme(storedTheme);
      document.documentElement.setAttribute("data-theme", storedTheme);
    }, []);
  
    const toggleTheme = () => {
      const nextTheme = theme === "light" ? "dark" : "light";
  
      // Update state and sync with localStorage
      setTheme(nextTheme);
      localStorage.setItem("theme", nextTheme);
  
      // Update the data-theme attribute for styling
      document.documentElement.setAttribute("data-theme", nextTheme);
    };
  
    return (
      <ThemeContext.Provider value={{ theme, toggleTheme }}>
        {children}
      </ThemeContext.Provider>
    );
  };
  