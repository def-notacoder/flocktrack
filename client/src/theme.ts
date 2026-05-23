import { extendTheme } from "@mui/joy/styles";

export const theme = extendTheme({
  colorSchemes: {
    light: {
      palette: {
        background: {
          body: "#f7f7f7",
          surface: "#ffffff",
          level1: "#f7f7f7",
        },
        primary: {
          50: "#fff5f5",
          100: "#ffe0e0",
          200: "#ffb3b3",
          300: "#ff8080",
          400: "#e63939",
          500: "#d30000",
          600: "#b80000",
          700: "#9a0000",
          800: "#7a0000",
          900: "#5c0000",
        },
        warning: {
          500: "#e89132",
          600: "#c97a28",
        },
        neutral: {
          50: "#f7f7f7",
          100: "#f0ebe4",
          600: "#8b5e34",
          700: "#6b4a28",
        },
      },
    },
  },
  fontFamily: {
    body: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  },
});
