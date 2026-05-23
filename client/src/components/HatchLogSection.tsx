import { useState } from "react";
import Typography from "@mui/joy/Typography";
import Button from "@mui/joy/Button";
import Stack from "@mui/joy/Stack";
import List from "@mui/joy/List";
import ListItem from "@mui/joy/ListItem";
import ListItemContent from "@mui/joy/ListItemContent";
import Chip from "@mui/joy/Chip";
import Textarea from "@mui/joy/Textarea";
import FormControl from "@mui/joy/FormControl";
import FormLabel from "@mui/joy/FormLabel";
import Input from "@mui/joy/Input";
import Alert from "@mui/joy/Alert";
import { api, type HatchEvent } from "../api/client";
import { LogEditActions } from "./LogEditActions";
import { toDatetimeLocal } from "../lib/datetime";

function eventTypeLabel(type: string) {
  switch (type) {
    case "SET":
      return "Started";
    case "LOCKDOWN":
      return "Lockdown";
    case "HATCH":
      return "Hatching";
    case "CANDLING":
      return "Candling";
    default:
      return "Update";
  }
}

function eventTypeColor(type: string): "primary" | "success" | "warning" | "neutral" {
  switch (type) {
    case "SET":
      return "primary";
    case "LOCKDOWN":
    case "HATCH":
      return "warning";
    case "CANDLING":
      return "success";
    default:
      return "neutral";
  }
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

interface Props {
  hatchId: string;
  events: HatchEvent[];
  canEdit?: boolean;
  onChanged: () => void;
}

export function HatchLogSection({ hatchId, events, canEdit = true, onChanged }: Props) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editOccurredAt, setEditOccurredAt] = useState("");
  const [editIncDay, setEditIncDay] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const sorted = [...events].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  );

  const submit = async () => {
    const text = note.trim();
    if (!text) return;
    setSaving(true);
    setError("");
    try {
      await api.hatches.addEvent(hatchId, { notes: text });
      setNote("");
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add log entry");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (event: HatchEvent) => {
    setEditingId(event.id);
    setEditNotes(event.notes ?? "");
    setEditOccurredAt(toDatetimeLocal(event.occurredAt));
    setEditIncDay(event.incubationDay != null ? String(event.incubationDay) : "");
    setError("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditNotes("");
    setEditOccurredAt("");
    setEditIncDay("");
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setEditSaving(true);
    setError("");
    try {
      await api.hatches.updateEvent(hatchId, editingId, {
        notes: editNotes.trim() || null,
        occurredAt: new Date(editOccurredAt).toISOString(),
        incubationDay: editIncDay.trim() ? Number(editIncDay) : null,
      });
      cancelEdit();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update log entry");
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <Stack spacing={2} sx={{ pt: 1 }}>
      {canEdit && (
        <Stack spacing={1}>
          <Typography level="title-sm">Add note</Typography>
          <Textarea
            minRows={2}
            placeholder="Candling results, temperature notes, turning schedule…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button size="sm" loading={saving} disabled={!note.trim()} onClick={submit} sx={{ alignSelf: "flex-start" }}>
            Add to log
          </Button>
        </Stack>
      )}

      {error && <Alert color="danger">{error}</Alert>}

      {sorted.length === 0 ? (
        <Typography level="body-sm" sx={{ color: "text.tertiary" }}>
          No log entries yet. Stage changes and notes will appear here.
        </Typography>
      ) : (
        <List aria-label="Incubator log">
          {sorted.map((event) => (
            <ListItem key={event.id} sx={{ px: 0 }}>
              <ListItemContent sx={{ width: "100%" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                  <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      <Chip size="sm" variant="soft" color={eventTypeColor(event.eventType)}>
                        {eventTypeLabel(event.eventType)}
                      </Chip>
                      {editingId !== event.id && (
                        <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
                          {formatWhen(event.occurredAt)}
                          {event.incubationDay != null ? ` · Day ${event.incubationDay}` : ""}
                        </Typography>
                      )}
                    </Stack>
                    {editingId === event.id ? (
                      <>
                        <FormControl size="sm">
                          <FormLabel>Date & time</FormLabel>
                          <Input
                            type="datetime-local"
                            value={editOccurredAt}
                            onChange={(e) => setEditOccurredAt(e.target.value)}
                          />
                        </FormControl>
                        <FormControl size="sm">
                          <FormLabel>Incubation day (optional)</FormLabel>
                          <Input
                            type="number"
                            value={editIncDay}
                            placeholder="Leave blank if not applicable"
                            onChange={(e) => setEditIncDay(e.target.value)}
                          />
                        </FormControl>
                        <Textarea
                          minRows={2}
                          placeholder="Notes"
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                        />
                      </>
                    ) : (
                      event.notes && <Typography level="body-sm">{event.notes}</Typography>
                    )}
                  </Stack>
                  <LogEditActions
                    editing={editingId === event.id}
                    canEdit={canEdit}
                    saving={editSaving}
                    onEdit={() => startEdit(event)}
                    onSave={saveEdit}
                    onCancel={cancelEdit}
                  />
                </Stack>
              </ListItemContent>
            </ListItem>
          ))}
        </List>
      )}
    </Stack>
  );
}
