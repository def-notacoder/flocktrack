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
import { api } from "../api/client";
import { formatWhen } from "./EggLogSection";
import { LogEditActions } from "./LogEditActions";
import { LogPhotoField, LogPhotoPreview, useLogPhotoEdit } from "./LogPhotoField";
import { nowDatetimeLocal, toDatetimeLocal } from "../lib/datetime";

export type HatchingLog = {
  id: string;
  stage: string;
  notes?: string | null;
  loggedAt: string;
  hatchingDay?: number | null;
  chickHealth?: string | null;
  photoUrl?: string | null;
};

interface Props {
  hatchId: string;
  eggId: string;
  logs: HatchingLog[];
  canEdit?: boolean;
  onChanged: () => void;
}

const STAGES = [
  "PIPPED",
  "ZIPPED",
  "HATCHED",
  "DRYING",
  "ASSISTED",
  "STUCK",
  "DIED_IN_SHELL",
] as const;

export function EggHatchingSection({ hatchId, eggId, logs, canEdit = true, onChanged }: Props) {
  const [hStage, setHStage] = useState<string>("PIPPED");
  const [hNotes, setHNotes] = useState("");
  const [hLoggedAt, setHLoggedAt] = useState(nowDatetimeLocal);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStage, setEditStage] = useState<string>("PIPPED");
  const [editNotes, setEditNotes] = useState("");
  const [editLoggedAt, setEditLoggedAt] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const addPhoto = useLogPhotoEdit();
  const editPhoto = useLogPhotoEdit();

  const addLog = async () => {
    setSaving(true);
    setError("");
    try {
      await api.eggs.addHatchingLog(hatchId, eggId, {
        stage: hStage,
        notes: hNotes,
        loggedAt: new Date(hLoggedAt).toISOString(),
        ...addPhoto.patchFields(),
      });
      setHNotes("");
      setHLoggedAt(nowDatetimeLocal());
      addPhoto.reset();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to log hatching event");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (log: HatchingLog) => {
    setEditingId(log.id);
    setEditStage(log.stage);
    setEditNotes(log.notes ?? "");
    setEditLoggedAt(toDatetimeLocal(log.loggedAt));
    editPhoto.loadExisting(log.photoUrl);
    setError("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    editPhoto.reset();
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setEditSaving(true);
    setError("");
    try {
      await api.eggs.updateHatchingLog(hatchId, eggId, editingId, {
        stage: editStage,
        notes: editNotes.trim() || null,
        loggedAt: new Date(editLoggedAt).toISOString(),
        ...editPhoto.patchFields(),
      });
      cancelEdit();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update log");
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <Stack spacing={2} sx={{ pt: 2 }}>
      {canEdit && (
        <>
          <FormControl>
            <FormLabel>Stage</FormLabel>
            <Select value={hStage} onChange={(_, v) => setHStage(v!)}>
              {STAGES.map((s) => (
                <Option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </Option>
              ))}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Date & time</FormLabel>
            <Input
              type="datetime-local"
              value={hLoggedAt}
              onChange={(e) => setHLoggedAt(e.target.value)}
            />
          </FormControl>
          <Textarea placeholder="Hatching notes" value={hNotes} onChange={(e) => setHNotes(e.target.value)} minRows={2} />
          <LogPhotoField
            previewUrl={addPhoto.previewUrl}
            onChange={(e) => addPhoto.handlePhotoChange(e, setError)}
            onRemove={addPhoto.removePhoto}
          />
          <Button onClick={addLog} loading={saving}>
            Log hatching event
          </Button>
        </>
      )}

      {error && <Alert color="danger">{error}</Alert>}

      <List>
        {logs.map((l) => (
          <ListItem key={l.id}>
            <ListItemContent sx={{ width: "100%" }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
                  {editingId === l.id ? (
                    <>
                      <FormControl size="sm">
                        <FormLabel>Stage</FormLabel>
                        <Select value={editStage} onChange={(_, v) => setEditStage(v!)}>
                          {STAGES.map((s) => (
                            <Option key={s} value={s}>
                              {s.replace(/_/g, " ")}
                            </Option>
                          ))}
                        </Select>
                      </FormControl>
                      <FormControl size="sm">
                        <FormLabel>Date & time</FormLabel>
                        <Input
                          type="datetime-local"
                          value={editLoggedAt}
                          onChange={(e) => setEditLoggedAt(e.target.value)}
                        />
                      </FormControl>
                      <Textarea
                        placeholder="Hatching notes"
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        minRows={2}
                      />
                      <LogPhotoField
                        previewUrl={editPhoto.previewUrl}
                        onChange={(e) => editPhoto.handlePhotoChange(e, setError)}
                        onRemove={editPhoto.removePhoto}
                      />
                    </>
                  ) : (
                    <>
                      <Typography level="body-xs" sx={{ color: "text.tertiary", mb: 0.25 }}>
                        {formatWhen(l.loggedAt)}
                      </Typography>
                      <Typography level="title-sm">{l.stage.replace(/_/g, " ")}</Typography>
                      {l.notes && <Typography level="body-sm">{l.notes}</Typography>}
                      <LogPhotoPreview url={l.photoUrl} alt="Hatching photo" />
                    </>
                  )}
                </Stack>
                <LogEditActions
                  editing={editingId === l.id}
                  canEdit={canEdit}
                  saving={editSaving}
                  onEdit={() => startEdit(l)}
                  onSave={saveEdit}
                  onCancel={cancelEdit}
                />
              </Stack>
            </ListItemContent>
          </ListItem>
        ))}
      </List>
    </Stack>
  );
}
