import { useState } from "react";
import Box from "@mui/joy/Box";
import Button from "@mui/joy/Button";
import FormControl from "@mui/joy/FormControl";
import FormLabel from "@mui/joy/FormLabel";
import Stack from "@mui/joy/Stack";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";

export function useLogPhotoEdit() {
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);

  const loadExisting = (url?: string | null) => {
    setPhotoDataUrl(null);
    setExistingPhotoUrl(url ?? null);
    setPhotoRemoved(false);
  };

  const reset = () => {
    setPhotoDataUrl(null);
    setExistingPhotoUrl(null);
    setPhotoRemoved(false);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>, onError: (msg: string) => void) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      onError("Choose an image file");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      onError("Photo must be 8 MB or smaller");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoDataUrl(typeof reader.result === "string" ? reader.result : null);
      setPhotoRemoved(false);
    };
    reader.onerror = () => onError("Failed to read photo");
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhotoDataUrl(null);
    setPhotoRemoved(true);
  };

  const previewUrl = photoDataUrl ?? (photoRemoved ? null : existingPhotoUrl);

  const patchFields = (): { photo?: string; clearPhoto?: true } => {
    if (photoDataUrl) return { photo: photoDataUrl };
    if (photoRemoved) return { clearPhoto: true };
    return {};
  };

  return { previewUrl, loadExisting, reset, handlePhotoChange, removePhoto, patchFields };
}

interface LogPhotoFieldProps {
  previewUrl: string | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}

export function LogPhotoField({ previewUrl, onChange, onRemove }: LogPhotoFieldProps) {
  return (
    <FormControl size="sm">
      <FormLabel>Photo</FormLabel>
      <Stack spacing={1}>
        <Button component="label" variant="outlined" size="sm" startDecorator={<PhotoCameraIcon />}>
          {previewUrl ? "Change photo" : "Add photo"}
          <input type="file" accept="image/*" capture="environment" hidden onChange={onChange} />
        </Button>
        {previewUrl && (
          <Stack spacing={0.5} alignItems="flex-start">
            <Box
              component="img"
              src={previewUrl}
              alt="Log photo"
              sx={{ maxWidth: "100%", maxHeight: 180, borderRadius: "md", objectFit: "cover" }}
            />
            <Button size="sm" variant="plain" onClick={onRemove}>
              Remove photo
            </Button>
          </Stack>
        )}
      </Stack>
    </FormControl>
  );
}

export function LogPhotoPreview({ url, alt = "Log photo" }: { url?: string | null; alt?: string }) {
  if (!url) return null;
  return (
    <Box
      component="img"
      src={url}
      alt={alt}
      sx={{ maxWidth: "100%", maxHeight: 180, borderRadius: "md", objectFit: "cover" }}
    />
  );
}
