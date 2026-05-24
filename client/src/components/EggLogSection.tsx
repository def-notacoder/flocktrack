import { useState } from "react";
import Typography from "@mui/joy/Typography";
import Button from "@mui/joy/Button";
import Stack from "@mui/joy/Stack";
import List from "@mui/joy/List";
import ListItem from "@mui/joy/ListItem";
import ListItemContent from "@mui/joy/ListItemContent";
import Textarea from "@mui/joy/Textarea";
import FormControl from "@mui/joy/FormControl";
import FormLabel from "@mui/joy/FormLabel";
import { DateInput } from "./DateInput";
import { LogEditActions } from "./LogEditActions";
import { LogPhotoField, LogPhotoPreview, useLogPhotoEdit } from "./LogPhotoField";
import { toDatetimeLocal } from "../lib/datetime";

function formatWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export { formatWhen };

interface Props {
  hatchId: string;
  eggId: string;
  notes: HatchEggNote[];
  canEdit?: boolean;
  onChanged: () => void;
}

export function EggLogSection({ hatchId, eggId, notes, canEdit = true, onChanged }: Props) {
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [editLoggedAt, setEditLoggedAt] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const addPhoto = useLogPhotoEdit();
  const editPhoto = useLogPhotoEdit();

  const submit = async () => {
    const text = body.trim();
    if (!text) return;
    setSaving(true);
    setError("");
    try {
      await api.eggs.addNote(hatchId, eggId, { body: text, ...addPhoto.patchFields() });
      setBody("");
      addPhoto.reset();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save note");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (note: HatchEggNote) => {
    setEditingId(note.id);
    setEditBody(note.body);
    setEditLoggedAt(toDatetimeLocal(note.loggedAt));
    editPhoto.loadExisting(note.photoUrl);
    setError("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditBody("");
    setEditLoggedAt("");
    editPhoto.reset();
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const text = editBody.trim();
    if (!text) {
      setError("Note cannot be empty");
      return;
    }
    setEditSaving(true);
    setError("");
    try {
      await api.eggs.updateNote(hatchId, eggId, editingId, {
        body: text,
        loggedAt: new Date(editLoggedAt).toISOString(),
        ...editPhoto.patchFields(),
      });
      cancelEdit();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update note");
    } finally {
      setEditSaving(false);
    }
  };

  const latestNote =
    notes.length > 0
      ? [...notes].sort(
          (a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime()
        )[0]
      : null;

  return (
    <Stack spacing={2} sx={{ pt: 2 }}>
      {canEdit && (
        <Stack spacing={1}>
          <Typography level="title-sm">Add note</Typography>
          <Textarea
            minRows={3}
            placeholder="Observations, candling notes, marking changes…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <LogPhotoField
            previewUrl={addPhoto.previewUrl}
            onChange={(e) => addPhoto.handlePhotoChange(e, setError)}
            onRemove={addPhoto.removePhoto}
          />
          <Button
            type="button"
            size="sm"
            loading={saving}
            disabled={!body.trim()}
            onClick={submit}
            sx={{ alignSelf: "flex-start" }}
          >
            Save to log
          </Button>
        </Stack>
      )}

      {error && <Alert color="danger">{error}</Alert>}

      {!latestNote ? (
        <Typography level="body-sm" sx={{ color: "text.tertiary" }}>
          No notes yet. Saved notes will appear here with date and time.
        </Typography>
      ) : (
        <List aria-label="Egg log">
          <ListItem sx={{ px: 0 }}>
            <ListItemContent sx={{ width: "100%" }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
                  {editingId === latestNote.id ? (
                    <>
                      <FormControl size="sm">
                        <FormLabel>Date & time</FormLabel>
                        <DateInput
                          type="datetime-local"
                          value={editLoggedAt}
                          onChange={(e) => setEditLoggedAt(e.target.value)}
                        />
                      </FormControl>
                      <Textarea
                        minRows={3}
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                      />
                      <LogPhotoField
                        previewUrl={editPhoto.previewUrl}
                        onChange={(e) => editPhoto.handlePhotoChange(e, setError)}
                        onRemove={editPhoto.removePhoto}
                      />
                    </>
                  ) : (
                    <>
                      <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
                        {formatWhen(latestNote.loggedAt)}
                      </Typography>
                      <Typography level="body-sm" sx={{ whiteSpace: "pre-wrap" }}>
                        {latestNote.body}
                      </Typography>
                      <LogPhotoPreview url={latestNote.photoUrl} alt="Log photo" />
                    </>
                  )}
                </Stack>
                <LogEditActions
                  editing={editingId === latestNote.id}
                  canEdit={canEdit}
                  saving={editSaving}
                  onEdit={() => startEdit(latestNote)}
                  onSave={saveEdit}
                  onCancel={cancelEdit}
                />
              </Stack>
            </ListItemContent>
          </ListItem>
        </List>
      )}
    </Stack>
  );
}
