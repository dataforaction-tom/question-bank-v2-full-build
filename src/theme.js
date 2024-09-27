// theme.js
import { createTheme } from '@mui/material/styles';

export const getThemeOptions = (mode) => ({
  palette: {
    mode,
    ...(mode === 'light'
      ? {
          // Light theme configuration
          primary: {
            main: '#1f1d1e',
            contrastText: 'rgba(255,251,251,0.87)',
          },
          secondary: {
            main: '#f3581d',
          },
          text: {
            primary: '#1f1d1e',
            seconday: '#9dc131' // Dark text for light background
          },
          background: {
            default: '#f4f4f4', // Light background
          },
          success: {
            main: '#9dc131',
          },
          info: {
            main: '#f860b1',
          },
        }
      : {
          // Dark theme configuration (inverting colors)
          primary: {
            main: '#f860b1',
            contrastText: '#1f1d1e', // Dark contrast text for light primary elements
          },
          secondary: {
            main: '#f3581d',
          },
          text: {
            primary: '#f4f4f4', // Light text for dark background
          },
          background: {
            default: '#1f1d1e', // Dark background
          },
          success: {
            main: '#9dc131',
          },
          info: {
            main: '#f860b1',
          },
        }),
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none', // This makes button text lowercase
        },
      },
    },
  },

  typography: {
    fontSize: 16,
    fontFamily: 'Figtree',
    
    button: {
      fontFamily: 'Figtree',
      fontWeight: 500,
    },
    h1: {
      fontFamily: 'Figtree',
    },
  },
  overrides: {
    MuiAppBar: {
      colorInherit: {
        backgroundColor: mode === 'light' ? '#f4f4f4' : '#1f1d1e', // Conditional background color based on mode
        color: mode === 'light' ? '#1f1d1e' : '#f4f4f4', // Conditional text color based on mode
      },
    },
  },
  props: {
    MuiAppBar: {
      color: 'inherit',
    },
    MuiButton: {
      size: 'small',
    },
    MuiCheckbox: {
      size: 'small',
    },
    MuiFab: {
      size: 'small',
    },
    MuiFormControl: {
      margin: 'dense',
      size: 'small',
    },
    MuiFormHelperText: {
      margin: 'dense',
    },
    MuiIconButton: {
      size: 'small',
    },
    MuiInputBase: {
      margin: 'dense',
    },
    MuiInputLabel: {
      margin: 'dense',
    },
    MuiRadio: {
      size: 'small',
    },
    MuiSwitch: {
      size: 'small',
    },
    MuiTextField: {
      margin: 'dense',
      size: 'small',
    },
    MuiTooltip: {
      arrow: true,
    },
    
  },
  spacing: 8,
});


const defaultTheme = createTheme(getThemeOptions('light'));
export default defaultTheme;
