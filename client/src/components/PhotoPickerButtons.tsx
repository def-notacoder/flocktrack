import Stack from "@mui/joy/Stack";
import Button from "@mui/joy/Button";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";

/** Max photo file size — typical phone camera JPEG. */
export const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
export const MAX_PHOTO_MB = 15;

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
  if (!file.type.startsWith("image/")) {
    onError("Choose an image file");
    return;
  }
  if (file.size > MAX_PHOTO_BYTES) {
    onError(`Photo must be ${MAX_PHOTO_MB} MB or smaller`);
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === "string") {
      onDataUrl(reader.result);
    } else {
      onError("Failed to read photo");
    }
  };
  reader.onerror = () => onError("Failed to read photo");
  reader.readAsDataURL(file);
}
