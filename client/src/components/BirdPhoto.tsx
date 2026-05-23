import Box from "@mui/joy/Box";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";

interface Props {
  photoUrl?: string | null;
  size?: number;
  alt?: string;
}

export function BirdPhoto({ photoUrl, size = 56, alt = "" }: Props) {
  const boxSx = {
    width: size,
    height: size,
    borderRadius: "md",
    flexShrink: 0,
  };

  if (photoUrl) {
    return (
      <Box
        component="img"
        src={photoUrl}
        alt={alt}
        sx={{ ...boxSx, objectFit: "cover" }}
      />
    );
  }

  return (
    <Box
      sx={{
        ...boxSx,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.level1",
        color: "text.tertiary",
      }}
    >
      <PhotoCameraOutlinedIcon fontSize={size >= 64 ? "medium" : "small"} />
    </Box>
  );
}
