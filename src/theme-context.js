import React, { createContext, useContext, useState } from 'react';
import { createTheme, ThemeProvider as MUIThemeProvider } from '@mui/material/styles';
import { getThemeOptions } from './theme';

const ThemeContext = createContext(); 

export const ThemeProvider = ({ children }) => {
  const [mode, setMode] = useState('light');
  const theme = createTheme(getThemeOptions(mode));

  const toggleThemeMode = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ mode, toggleThemeMode }}>
      <MUIThemeProvider theme={theme}>
        {children}
      </MUIThemeProvider>
    </ThemeContext.Provider>
  );
};


export const useThemeMode = () => useContext(ThemeContext);
