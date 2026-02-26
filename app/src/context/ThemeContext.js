import React, { createContext, useState, useEffect, useContext } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setIsDark(savedTheme === 'dark');
      applyTheme(savedTheme === 'dark');
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDark(prefersDark);
      applyTheme(prefersDark);
    }
  }, []);

  const applyTheme = (dark) => {
    if (dark) {
      document.documentElement.style.setProperty('--bg-primary', '#1a1f2e');
      document.documentElement.style.setProperty('--bg-secondary', '#242a38');
      document.documentElement.style.setProperty('--bg-tertiary', '#2d3447');
      document.documentElement.style.setProperty('--text-primary', '#e8ecf1');
      document.documentElement.style.setProperty('--text-secondary', '#a0aab5');
      document.documentElement.style.setProperty('--border-color', '#3a4151');
      document.documentElement.style.setProperty('--card-bg', '#242a38');
      document.body.style.backgroundColor = '#1a1f2e';
      document.body.style.color = '#e8ecf1';
    } else {
      document.documentElement.style.setProperty('--bg-primary', '#ffffff');
      document.documentElement.style.setProperty('--bg-secondary', '#f8fafc');
      document.documentElement.style.setProperty('--bg-tertiary', '#f1f5f9');
      document.documentElement.style.setProperty('--text-primary', '#1e293b');
      document.documentElement.style.setProperty('--text-secondary', '#64748b');
      document.documentElement.style.setProperty('--border-color', '#e2e8f0');
      document.documentElement.style.setProperty('--card-bg', '#ffffff');
      document.body.style.backgroundColor = '#ffffff';
      document.body.style.color = '#1e293b';
    }
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
    localStorage.setItem('theme', !isDark ? 'dark' : 'light');
    applyTheme(!isDark);
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
