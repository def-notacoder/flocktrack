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
import Checkbox from "@mui/joy/Checkbox";
import Chip from "@mui/joy/Chip";
import Alert from "@mui/joy/Alert";
import { api, type HealthRecord } from "../api/client";
import { formatWhen } from "./EggLogSection";
import { LogEditActions } from "./LogEditActions";
import { LogPhotoField, LogPhotoPreview, useLogPhotoEdit } from "./LogPhotoField";
import { DateInput } from "./DateInput";
import { nowDatetimeLocal, toDatetimeLocal } from "../lib/datetime";

const EVENT_TYPES = [
  "CHECKUP",
  "ILLNESS",
  "TREATMENT",
  "VACCINATION",
  "INJURY",
  "OTHER",
] as const;

const ALL_EVENT_TYPES = [
  "HATCH",
  "CHECKUP",
  "ILLNESS",
  "TREATMENT",
  "VACCINATION",
  "INJURY",
  "DEATH",
  "OTHER",
] as const;

const LIFE_STAGES = ["CHICK", "JUVENILE", "ADULT"] as const;

function formatEventType(value: string) {
  return value.replace(/_/g, " ");
}

function defaultLifeStage(birdLifeStage: string) {
  if (birdLifeStage === "CHICK") return "CHICK";
  if (birdLifeStage === "PULLET") return "JUVENILE";
  return "ADULT";
}

function dateInputValue(iso: string) {
  return iso.slice(0, 10);
}

interface Props {
  chickenId: string;
  birdLifeStage: string;
  records: HealthRecord[];
  canEdit?: boolean;
  onChanged: () => void;
}

export function BirdHealthLogSection({
  chickenId,
  birdLifeStage,
  records,
  canEdit = true,
  onChanged,
}: Props) {
  const [eventType, setEventType] = useState<string>("CHECKUP");
  const [lifeStage, setLifeStage] = useState(defaultLifeStage(birdLifeStage));
  const [observedOn, setObservedOn] = useState(nowDatetimeLocal);
  const [symptoms, setSymptoms] = useState("");
  const [treatment, setTreatment] = useState("");
  const [medication, setMedication] = useState("");
  const [followUpOn, setFollowUpOn] = useState("");
  const [resolved, setResolved] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const addPhoto = useLogPhotoEdit();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEventType, setEditEventType] = useState<string>("CHECKUP");
  const [editLifeStage, setEditLifeStage] = useState<string>("ADULT");
  const [editObservedOn, setEditObservedOn] = useState("");
  const [editSymptoms, setEditSymptoms] = useState("");
  const [editTreatment, setEditTreatment] = useState("");
  const [editMedication, setEditMedication] = useState("");
  const [editFollowUpOn, setEditFollowUpOn] = useState("");
  const [editResolved, setEditResolved] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const editPhoto = useLogPhotoEdit();

  const resetAddForm = () => {
    setEventType("CHECKUP");
    setLifeStage(defaultLifeStage(birdLifeStage));
    setObservedOn(nowDatetimeLocal());
    setSymptoms("");
    setTreatment("");
    setMedication("");
    setFollowUpOn("");
    setResolved(false);
    setNotes("");
    addPhoto.reset();
  };

  const addEntry = async () => {
    setSaving(true);
    setError("");
    try {
      const photoFields = addPhoto.patchFields();
      await api.health.create({
        chickenId,
        eventType,
        lifeStage,
        observedOn: new Date(observedOn).toISOString(),
        symptoms: symptoms.trim() || undefined,
        treatment: treatment.trim() || undefined,
        medication: medication.trim() || undefined,
        followUpOn: followUpOn || undefined,
        resolved,
        notes: notes.trim() || undefined,
        ...photoFields,
      });
      resetAddForm();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save log entry");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (record: HealthRecord) => {
    setEditingId(record.id);
    setEditEventType(record.eventType);
    setEditLifeStage(record.lifeStage);
    setEditObservedOn(toDatetimeLocal(record.observedOn));
    setEditSymptoms(record.symptoms ?? "");
    setEditTreatment(record.treatment ?? "");
    setEditMedication(record.medication ?? "");
    setEditFollowUpOn(record.followUpOn ? dateInputValue(record.followUpOn) : "");
    setEditResolved(record.resolved);
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
    setEditSaving(true);
    setError("");
    try {
      await api.health.update(editingId, {
        eventType: editEventType,
        lifeStage: editLifeStage,
        observedOn: new Date(editObservedOn).toISOString(),
        symptoms: editSymptoms.trim() || null,
        treatment: editTreatment.trim() || null,
        medication: editMedication.trim() || null,
        followUpOn: editFollowUpOn || null,
        resolved: editResolved,
        notes: editNotes.trim() || null,
        ...editPhoto.patchFields(),
      });
      cancelEdit();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update log entry");
    } finally {
      setEditSaving(false);
    }
  };

  const renderDetailFields = (record: HealthRecord) => (
    <>
      <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
        <Typography level="title-sm">{formatEventType(record.eventType)}</Typography>
        {record.resolved && (
          <Chip size="sm" color="success" variant="soft">
            Resolved
          </Chip>
        )}
      </Stack>
      <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
        {formatWhen(record.observedOn)} · {record.lifeStage.toLowerCase()}
      </Typography>
      {record.symptoms && (
        <Typography level="body-sm">
          <strong>Symptoms:</strong> {record.symptoms}
        </Typography>
      )}
      {record.treatment && (
        <Typography level="body-sm">
          <strong>Treatment:</strong> {record.treatment}
        </Typography>
      )}
      {record.medication && (
        <Typography level="body-sm">
          <strong>Medication:</strong> {record.medication}
        </Typography>
      )}
      {record.followUpOn && (
        <Typography level="body-sm">
          <strong>Follow-up:</strong> {new Date(record.followUpOn).toLocaleDateString()}
        </Typography>
      )}
      {record.notes && (
        <Typography level="body-sm" sx={{ whiteSpace: "pre-wrap" }}>
          {record.notes}
        </Typography>
      )}
      <LogPhotoPreview url={record.photoUrl} alt="Health log photo" />
    </>
  );

  const renderEditFields = () => (
    <>
      <FormControl size="sm">
        <FormLabel>Type</FormLabel>
        <Select value={editEventType} onChange={(_, v) => v && setEditEventType(v)}>
          {ALL_EVENT_TYPES.map((t) => (
            <Option key={t} value={t}>
              {formatEventType(t)}
            </Option>
          ))}
        </Select>
      </FormControl>
      <FormControl size="sm">
        <FormLabel>Life stage</FormLabel>
        <Select value={editLifeStage} onChange={(_, v) => v && setEditLifeStage(v)}>
          {LIFE_STAGES.map((s) => (
            <Option key={s} value={s}>
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </Option>
          ))}
        </Select>
      </FormControl>
      <FormControl size="sm">
        <FormLabel>Date & time</FormLabel>
        <DateInput
          type="datetime-local"
          value={editObservedOn}
          onChange={(e) => setEditObservedOn(e.target.value)}
        />
      </FormControl>
      <FormControl size="sm">
        <FormLabel>Symptoms</FormLabel>
        <Input value={editSymptoms} onChange={(e) => setEditSymptoms(e.target.value)} />
      </FormControl>
      <FormControl size="sm">
        <FormLabel>Treatment</FormLabel>
        <Input value={editTreatment} onChange={(e) => setEditTreatment(e.target.value)} />
      </FormControl>
      <FormControl size="sm">
        <FormLabel>Medication</FormLabel>
        <Input value={editMedication} onChange={(e) => setEditMedication(e.target.value)} />
      </FormControl>
      <FormControl size="sm">
        <FormLabel>Follow-up date</FormLabel>
        <DateInput value={editFollowUpOn} onChange={(e) => setEditFollowUpOn(e.target.value)} />
      </FormControl>
      <Checkbox
        label="Resolved"
        checked={editResolved}
        onChange={(e) => setEditResolved(e.target.checked)}
      />
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
  );

  return (
    <Stack spacing={2} sx={{ pt: 1 }}>
      {canEdit && (
        <Stack spacing={1}>
          <Typography level="title-sm">Add log entry</Typography>
          <FormControl>
            <FormLabel>Type</FormLabel>
            <Select value={eventType} onChange={(_, v) => v && setEventType(v)}>
              {EVENT_TYPES.map((t) => (
                <Option key={t} value={t}>
                  {formatEventType(t)}
                </Option>
              ))}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Life stage</FormLabel>
            <Select value={lifeStage} onChange={(_, v) => v && setLifeStage(v)}>
              {LIFE_STAGES.map((s) => (
                <Option key={s} value={s}>
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </Option>
              ))}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Date & time</FormLabel>
            <DateInput
              type="datetime-local"
              value={observedOn}
              onChange={(e) => setObservedOn(e.target.value)}
            />
          </FormControl>
          <FormControl>
            <FormLabel>Symptoms</FormLabel>
            <Input
              placeholder="Optional — limping, lethargy, etc."
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
            />
          </FormControl>
          <FormControl>
            <FormLabel>Treatment</FormLabel>
            <Input value={treatment} onChange={(e) => setTreatment(e.target.value)} />
          </FormControl>
          <FormControl>
            <FormLabel>Medication</FormLabel>
            <Input value={medication} onChange={(e) => setMedication(e.target.value)} />
          </FormControl>
          <FormControl>
            <FormLabel>Follow-up date</FormLabel>
            <DateInput value={followUpOn} onChange={(e) => setFollowUpOn(e.target.value)} />
          </FormControl>
          <Checkbox label="Resolved" checked={resolved} onChange={(e) => setResolved(e.target.checked)} />
          <Textarea
            minRows={2}
            placeholder="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <LogPhotoField
            previewUrl={addPhoto.previewUrl}
            onChange={(e) => addPhoto.handlePhotoChange(e, setError)}
            onRemove={addPhoto.removePhoto}
          />
          <Button size="sm" loading={saving} onClick={addEntry} sx={{ alignSelf: "flex-start" }}>
            Save to log
          </Button>
        </Stack>
      )}

      {error && <Alert color="danger">{error}</Alert>}

      {records.length === 0 ? (
        <Typography level="body-sm" sx={{ color: "text.tertiary" }}>
          No health log entries yet. Record check-ups, injuries, treatments, and photos here.
        </Typography>
      ) : (
        <List aria-label="Bird health log">
          {records.map((record) => (
            <ListItem key={record.id} sx={{ px: 0 }}>
              <ListItemContent sx={{ width: "100%" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                  <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
                    {editingId === record.id ? renderEditFields() : renderDetailFields(record)}
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
