import Stack from "@mui/joy/Stack";
import Button from "@mui/joy/Button";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import { compressImageFile, MAX_PHOTO_BYTES, MAX_PHOTO_MB } from "../lib/compressImage";

export { MAX_PHOTO_BYTES, MAX_PHOTO_MB };

type PhotoPickerButtonsProps = {
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  hasPhoto?: boolean;
  size?: "sm" | "md" | "lg";
};

/** Camera + library/file inputs so users can pick from either on mobile or desktop. */
export function PhotoPickerButtons({ onChange, hasPhoto, size = "sm" }: PhotoPickerButtonsProps) {
  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      <Button component="label" variant="outlined" size={size} startDecorator={<PhotoCameraIcon />}>
        {hasPhoto ? "Retake photo" : "Take photo"}
        <input type="file" accept="image/*" capture="environment" hidden onChange={onChange} />
      </Button>
      <Button component="label" variant="outlined" size={size} startDecorator={<PhotoLibraryIcon />}>
        {hasPhoto ? "Choose different" : "Choose photo"}
        <input type="file" accept="image/*" hidden onChange={onChange} />
      </Button>
    </Stack>
  );
}

export function readImageFileFromInput(
  e: React.ChangeEvent<HTMLInputElement>,
  onDataUrl: (dataUrl: string) => void,
  onError: (message: string) => void
) {
  const file = e.target.files?.[0];
  e.target.value = "";
  if (!file) return;

  void compressImageFile(file)
    .then(onDataUrl)
    .catch((err) => onError(err instanceof Error ? err.message : "Failed to read photo"));
}
