import { create } from "zustand";

interface ThemeStateType {
    theme: string;
    toggleTheme: () => void;
}

const useTheme = create<ThemeStateType>((set) => {
    const storedTheme = localStorage.getItem("theme") || "light";
    console.log(storedTheme)
    document.documentElement.setAttribute("data-theme", storedTheme);

    return {
        theme: storedTheme,
        toggleTheme: () => {
            set((state) => {
                const nextTheme = state.theme === "light" ? "dark" : "light";

                localStorage.setItem("theme", nextTheme);

                document.documentElement.setAttribute("data-theme", nextTheme);

                return { theme: nextTheme }
            });
        },
    };
});

export default useTheme;