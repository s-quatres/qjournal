import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    // Check localStorage first, default to true (dark mode on by default)
    const saved = localStorage.getItem("theme");
    if (saved !== null) {
      return saved === "dark";
    }
    return true; // Default to dark mode
  });

  useEffect(() => {
    // Update localStorage when theme changes
    localStorage.setItem("theme", isDark ? "dark" : "light");

    // Update document class for Tailwind dark mode
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  const toggleDarkMode = () => {
    setIsDark((prev) => !prev);
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
