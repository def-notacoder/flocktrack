import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Box from "@mui/joy/Box";
import Sheet from "@mui/joy/Sheet";
import IconButton from "@mui/joy/IconButton";
import Typography from "@mui/joy/Typography";
import HomeIcon from "@mui/icons-material/Home";
import EggIcon from "@mui/icons-material/Egg";
import EggAltIcon from "@mui/icons-material/EggAlt";
import { AppLogo } from "./AppLogo";
import { ChickenIcon } from "./ChickenIcon";

const nav = [
  { path: "/", label: "Home", icon: <HomeIcon /> },
  { path: "/eggs", label: "Eggs", icon: <EggAltIcon /> },
  { path: "/hatch", label: "Hatch", icon: <EggIcon /> },
  { path: "/birds", label: "Flock", icon: <ChickenIcon /> },
];

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const idx = nav.findIndex(
    (n) => n.path === location.pathname || (n.path !== "/" && location.pathname.startsWith(n.path))
  );

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        maxWidth: 480,
        mx: "auto",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.body",
      }}
    >
      <Box component="main" sx={{ flex: 1, pb: 9, px: 2, pt: location.pathname === "/" ? 0 : 2 }}>
        {location.pathname === "/" && <AppLogo size={88} />}
        <Outlet />
      </Box>
      <Sheet
        variant="outlined"
        sx={{
          position: "fixed",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: 480,
          pb: "env(safe-area-inset-bottom)",
          display: "flex",
          justifyContent: "space-around",
          py: 0.5,
          borderRadius: 0,
          bgcolor: "background.surface",
          zIndex: 1000,
        }}
      >
        {nav.map((item, i) => (
          <IconButton
            key={item.path}
            variant={idx === i ? "soft" : "plain"}
            color={idx === i ? "primary" : "neutral"}
            onClick={() => navigate(item.path)}
            sx={{ flexDirection: "column", borderRadius: "sm", minWidth: 56, minHeight: 56 }}
          >
            {item.icon}
            <Typography level="body-xs">{item.label}</Typography>
          </IconButton>
        ))}
      </Sheet>
    </Box>
  );
}
