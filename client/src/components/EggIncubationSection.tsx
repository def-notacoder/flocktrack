import { useEffect, useState } from "react";
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
import { DateInput } from "./DateInput";
import { nowDatetimeLocal, toDatetimeLocal } from "../lib/datetime";

export type IncubationLog = {
  id: string;
  incubationDay: number;
  assessment: string;
  notes?: string | null;
  loggedAt: string;
  photoUrl?: string | null;
};

interface Props {
  hatchId: string;
  eggId: string;
  logs: IncubationLog[];
  defaultDay: number;
  canEdit?: boolean;
  onChanged: () => void;
}

const ASSESSMENTS = [
  "DEVELOPING_WELL",
  "STALLED",
  "INFERTILE",
  "BLOOD_RING",
  "DEAD_EMBRYO",
  "UNKNOWN",
  "OTHER",
] as const;

function assessmentLabel(value: string) {
  return value.replace(/_/g, " ");
}

export function EggIncubationSection({
  hatchId,
  eggId,
  logs,
  defaultDay,
  canEdit = true,
  onChanged,
}: Props) {
  const [incDay, setIncDay] = useState(defaultDay);
  const [assessment, setAssessment] = useState<string>("DEVELOPING_WELL");
  const [incNotes, setIncNotes] = useState("");
  const [incLoggedAt, setIncLoggedAt] = useState(nowDatetimeLocal);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDay, setEditDay] = useState(1);
  const [editAssessment, setEditAssessment] = useState<string>("DEVELOPING_WELL");
  const [editNotes, setEditNotes] = useState("");
  const [editLoggedAt, setEditLoggedAt] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const addPhoto = useLogPhotoEdit();
  const editPhoto = useLogPhotoEdit();

  useEffect(() => {
    setIncDay(defaultDay);
  }, [defaultDay]);

  const addLog = async () => {
    setSaving(true);
    setError("");
    try {
      await api.eggs.addLog(hatchId, eggId, {
        incubationDay: incDay,
        assessment,
        notes: incNotes,
        loggedAt: new Date(incLoggedAt).toISOString(),
        ...addPhoto.patchFields(),
      });
      setIncNotes("");
      setIncLoggedAt(nowDatetimeLocal());
      addPhoto.reset();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to log check");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (log: IncubationLog) => {
    setEditingId(log.id);
    setEditDay(log.incubationDay);
    setEditAssessment(log.assessment);
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
      await api.eggs.updateLog(hatchId, eggId, editingId, {
        incubationDay: editDay,
        assessment: editAssessment,
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
            <FormLabel>Incubation day</FormLabel>
            <Input type="number" value={incDay} onChange={(e) => setIncDay(Number(e.target.value))} />
          </FormControl>
          <FormControl>
            <FormLabel>Assessment</FormLabel>
            <Select value={assessment} onChange={(_, v) => setAssessment(v!)}>
              {ASSESSMENTS.map((a) => (
                <Option key={a} value={a}>
                  {assessmentLabel(a)}
                </Option>
              ))}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Date & time</FormLabel>
            <DateInput
              type="datetime-local"
              value={incLoggedAt}
              onChange={(e) => setIncLoggedAt(e.target.value)}
            />
          </FormControl>
          <Textarea
            placeholder={assessment === "OTHER" ? "Describe the assessment" : "Notes"}
            value={incNotes}
            onChange={(e) => setIncNotes(e.target.value)}
            minRows={2}
          />
          <LogPhotoField
            previewUrl={addPhoto.previewUrl}
            onChange={(e) => addPhoto.handlePhotoChange(e, setError)}
            onRemove={addPhoto.removePhoto}
          />
          <Button onClick={addLog} loading={saving}>
            Log development check
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
                        <FormLabel>Incubation day</FormLabel>
                        <Input type="number" value={editDay} onChange={(e) => setEditDay(Number(e.target.value))} />
                      </FormControl>
                      <FormControl size="sm">
                        <FormLabel>Assessment</FormLabel>
                        <Select value={editAssessment} onChange={(_, v) => setEditAssessment(v!)}>
                          {ASSESSMENTS.map((a) => (
                            <Option key={a} value={a}>
                              {assessmentLabel(a)}
                            </Option>
                          ))}
                        </Select>
                      </FormControl>
                      <FormControl size="sm">
                        <FormLabel>Date & time</FormLabel>
                        <DateInput
                          type="datetime-local"
                          value={editLoggedAt}
                          onChange={(e) => setEditLoggedAt(e.target.value)}
                        />
                      </FormControl>
                      <Textarea
                        placeholder={editAssessment === "OTHER" ? "Describe the assessment" : "Notes"}
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
                      <Typography level="title-sm">
                        Day {l.incubationDay} — {assessmentLabel(l.assessment)}
                      </Typography>
                      {l.notes && <Typography level="body-sm">{l.notes}</Typography>}
                      <LogPhotoPreview url={l.photoUrl} alt="Candling photo" />
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
