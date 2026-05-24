import Box from "@mui/joy/Box";

type AppLogoProps = {
  size?: number;
};

/** Homepage header — uses `public/logo.png` (not the square app icon). */
export function AppLogo({ size = 72 }: AppLogoProps) {
  return (
    <Box
      component="header"
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        py: 1,
        bgcolor: "transparent",
        background: "none",
      }}
    >
      <Box
        component="img"
        src="/logo.png?v=7"
        alt="Flock Log"
        sx={{
          display: "block",
          height: size,
          width: "auto",
          maxWidth: "min(100%, 320px)",
          objectFit: "contain",
        }}
      />
    </Box>
  );
}
