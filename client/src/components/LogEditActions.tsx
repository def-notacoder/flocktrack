import Button from "@mui/joy/Button";
import Stack from "@mui/joy/Stack";

interface Props {
  editing: boolean;
  canEdit: boolean;
  saving?: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
}

export function LogEditActions({ editing, canEdit, saving, onEdit, onSave, onCancel }: Props) {
  if (!canEdit) return null;

  if (editing) {
    return (
      <Stack direction="row" spacing={0.5}>
        <Button size="sm" variant="solid" loading={saving} onClick={onSave}>
          Save
        </Button>
        <Button size="sm" variant="plain" disabled={saving} onClick={onCancel}>
          Cancel
        </Button>
      </Stack>
    );
  }

  return (
    <Button size="sm" variant="plain" onClick={onEdit}>
      Edit
    </Button>
  );
}
