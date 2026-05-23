import { useState } from "react";
import Typography from "@mui/joy/Typography";
import Button from "@mui/joy/Button";
import Stack from "@mui/joy/Stack";
import List from "@mui/joy/List";
import ListItem from "@mui/joy/ListItem";
import ListItemContent from "@mui/joy/ListItemContent";
import FormControl from "@mui/joy/FormControl";
import FormLabel from "@mui/joy/FormLabel";
import Input from "@mui/joy/Input";
import Select from "@mui/joy/Select";
import Option from "@mui/joy/Option";
import Textarea from "@mui/joy/Textarea";
import Alert from "@mui/joy/Alert";
import { api, type Chicken, type LayingRecord } from "../api/client";
import { LogEditActions } from "./LogEditActions";
import { LogPhotoField, LogPhotoPreview, useLogPhotoEdit } from "./LogPhotoField";

function formatCollectedOn(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function dateInputValue(iso: string) {
  return iso.slice(0, 10);
}

interface Props {
  birds: Chicken[];
  records: LayingRecord[];
  canEdit?: boolean;
  onChanged: () => void;
}

export function EggCollectionSection({ birds, records, canEdit = true, onChanged }: Props) {
  const [recordedOn, setRecordedOn] = useState(todayIso);
  const [count, setCount] = useState(0);
  const [location, setLocation] = useState("");
  const [chickenId, setChickenId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editCount, setEditCount] = useState(1);
  const [editLocation, setEditLocation] = useState("");
  const [editChickenId, setEditChickenId] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const addPhoto = useLogPhotoEdit();
  const editPhoto = useLogPhotoEdit();

  const addEntry = async () => {
    if (!Number.isFinite(count) || count < 1) {
      setError("Enter at least 1 egg");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.laying.create({
        count,
        recordedOn,
        location: location.trim() || undefined,
        chickenId: chickenId || undefined,
        notes: notes.trim() || undefined,
        ...addPhoto.patchFields(),
      });
      setCount(0);
      setNotes("");
      addPhoto.reset();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to log collection");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (record: LayingRecord) => {
    setEditingId(record.id);
    setEditDate(dateInputValue(record.recordedOn));
    setEditCount(record.count);
    setEditLocation(record.location ?? "");
    setEditChickenId(record.chickenId ?? "");
    setEditNotes(record.notes ?? "");
    editPhoto.loadExisting(record.photoUrl);
    setError("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    editPhoto.reset();
  };

  const saveEdit = async () => {
    if (!editingId) return;
    if (!Number.isFinite(editCount) || editCount < 1) {
      setError("Count must be at least 1");
      return;
    }
    setEditSaving(true);
    setError("");
    try {
      await api.laying.update(editingId, {
        count: editCount,
        recordedOn: editDate,
        location: editLocation.trim() || null,
        chickenId: editChickenId || null,
        notes: editNotes.trim() || null,
        ...editPhoto.patchFields(),
      });
      cancelEdit();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update entry");
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <Stack spacing={2} sx={{ pt: 1 }}>
      {canEdit && (
        <Stack spacing={1}>
          <Typography level="title-sm">Add collection</Typography>
          <FormControl required>
            <FormLabel>Date</FormLabel>
            <Input type="date" value={recordedOn} onChange={(e) => setRecordedOn(e.target.value)} />
          </FormControl>
          <FormControl required>
            <FormLabel>Count</FormLabel>
            <Input
              type="number"
              slotProps={{ input: { min: 1 } }}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </FormControl>
          <FormControl>
            <FormLabel>Coop / location</FormLabel>
            <Input
              placeholder="Optional"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </FormControl>
          <FormControl>
            <FormLabel>Hen</FormLabel>
            <Select value={chickenId} onChange={(_, v) => setChickenId(v ?? "")}>
              <Option value="">—</Option>
              {birds.map((b) => (
                <Option key={b.id} value={b.id}>
                  #{b.tagNumber} {b.name}
                </Option>
              ))}
            </Select>
          </FormControl>
          <Textarea
            minRows={2}
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <LogPhotoField
            previewUrl={addPhoto.previewUrl}
            onChange={(e) => addPhoto.handlePhotoChange(e, setError)}
            onRemove={addPhoto.removePhoto}
          />
          <Button size="sm" loading={saving} disabled={count < 1} onClick={addEntry} sx={{ alignSelf: "flex-start" }}>
            Save to log
          </Button>
        </Stack>
      )}

      {error && <Alert color="danger">{error}</Alert>}

      {records.length === 0 ? (
        <Typography level="body-sm" sx={{ color: "text.tertiary" }}>
          No collections yet. Logged entries will appear here with date and details.
        </Typography>
      ) : (
        <List aria-label="Egg collection log">
          {records.map((record) => (
            <ListItem key={record.id} sx={{ px: 0 }}>
              <ListItemContent sx={{ width: "100%" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                  <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
                    {editingId === record.id ? (
                      <>
                        <FormControl size="sm">
                          <FormLabel>Date</FormLabel>
                          <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
                        </FormControl>
                        <FormControl size="sm">
                          <FormLabel>Count</FormLabel>
                          <Input
                            type="number"
                            slotProps={{ input: { min: 1 } }}
                            value={editCount}
                            onChange={(e) => setEditCount(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormControl size="sm">
                          <FormLabel>Coop / location</FormLabel>
                          <Input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} />
                        </FormControl>
                        <FormControl size="sm">
                          <FormLabel>Hen</FormLabel>
                          <Select value={editChickenId} onChange={(_, v) => setEditChickenId(v ?? "")}>
                            <Option value="">—</Option>
                            {birds.map((b) => (
                              <Option key={b.id} value={b.id}>
                                #{b.tagNumber} {b.name}
                              </Option>
                            ))}
                          </Select>
                        </FormControl>
                        <Textarea
                          minRows={2}
                          placeholder="Notes"
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
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
                          {formatCollectedOn(record.recordedOn)}
                        </Typography>
                        <Typography level="title-sm">
                          {record.count} {record.count === 1 ? "egg" : "eggs"}
                        </Typography>
                        {(record.location || record.chicken) && (
                          <Typography level="body-sm" sx={{ color: "text.secondary" }}>
                            {[record.location, record.chicken ? `#${record.chicken.tagNumber}${record.chicken.name ? ` ${record.chicken.name}` : ""}` : null]
                              .filter(Boolean)
                              .join(" · ")}
                          </Typography>
                        )}
                        {record.notes && (
                          <Typography level="body-sm" sx={{ whiteSpace: "pre-wrap" }}>
                            {record.notes}
                          </Typography>
                        )}
                        <LogPhotoPreview url={record.photoUrl} alt="Collection photo" />
                      </>
                    )}
                  </Stack>
                  <LogEditActions
                    editing={editingId === record.id}
                    canEdit={canEdit}
                    saving={editSaving}
                    onEdit={() => startEdit(record)}
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
