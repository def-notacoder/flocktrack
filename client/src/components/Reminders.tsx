import { useCallback, useEffect, useState } from "react";
import Box from "@mui/joy/Box";
import Typography from "@mui/joy/Typography";
import Card from "@mui/joy/Card";
import CardContent from "@mui/joy/CardContent";
import Chip from "@mui/joy/Chip";
import FormControl from "@mui/joy/FormControl";
import FormLabel from "@mui/joy/FormLabel";
import Input from "@mui/joy/Input";
import Select from "@mui/joy/Select";
import Option from "@mui/joy/Option";
import Textarea from "@mui/joy/Textarea";
import Button from "@mui/joy/Button";
import Stack from "@mui/joy/Stack";
import Alert from "@mui/joy/Alert";
import CircularProgress from "@mui/joy/CircularProgress";
import { DateInput } from "./DateInput";
import { api, type Hatch, type Reminder, type ReminderCategory } from "../api/client";

export const REMINDER_CATEGORIES: { value: ReminderCategory; label: string }[] = [
  { value: "LOCKDOWN", label: "Incubator lockdown" },
  { value: "MEDICATION", label: "Coop medication" },
  { value: "INCUBATION", label: "Incubation check" },
  { value: "HATCHING", label: "Hatch day" },
  { value: "FEEDING", label: "Feeding / supplies" },
  { value: "GENERAL", label: "Other" },
];

export function categoryLabel(cat: ReminderCategory) {
  return REMINDER_CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
}

function formatDue(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDay = new Date(d);
  dueDay.setHours(0, 0, 0, 0);
  const diff = Math.round((dueDay.getTime() - today.getTime()) / 86400000);
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (diff === 0) return `Today ${time}`;
  if (diff === 1) return `Tomorrow ${time}`;
  if (diff === -1) return `Yesterday ${time}`;
  if (diff < 0) return `${Math.abs(diff)} days overdue`;
  return `${d.toLocaleDateString()} ${time}`;
}

type ReminderFormProps = {
  onSaved: () => void;
  compact?: boolean;
};

export function ReminderForm({ onSaved, compact }: ReminderFormProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ReminderCategory>("GENERAL");
  const [dueAt, setDueAt] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [notes, setNotes] = useState("");
  const [location, setLocation] = useState("");
  const [hatchId, setHatchId] = useState("");
  const [hatches, setHatches] = useState<Hatch[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.hatches.list().then(setHatches);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.reminders.create({
        title,
        category,
        dueAt: new Date(dueAt).toISOString(),
        notes: notes || undefined,
        location: location || undefined,
        hatchId: hatchId || undefined,
      });
      setTitle("");
      setNotes("");
      setLocation("");
      setHatchId("");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack spacing={2} component="form" onSubmit={submit}>
      <FormControl required>
        <FormLabel>What to do</FormLabel>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Put incubator in lockdown"
        />
      </FormControl>
      <FormControl>
        <FormLabel>Type</FormLabel>
        <Select value={category} onChange={(_, v) => v && setCategory(v)}>
          {REMINDER_CATEGORIES.map((c) => (
            <Option key={c.value} value={c.value}>
              {c.label}
            </Option>
          ))}
        </Select>
      </FormControl>
      <FormControl required>
        <FormLabel>Due</FormLabel>
        <DateInput type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
      </FormControl>
      {!compact && (
        <>
          <Input
            placeholder="Coop / location (optional)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <Select
            placeholder="Link to incubator (optional)"
            value={hatchId}
            onChange={(_, v) => setHatchId(v ?? "")}
          >
            <Option value="">—</Option>
            {hatches.map((h) => (
              <Option key={h.id} value={h.id}>
                {h.name}
              </Option>
            ))}
          </Select>
          <Textarea
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            minRows={2}
          />
        </>
      )}
      {error && <Alert color="danger">{error}</Alert>}
      <Button type="submit" loading={loading}>
        Save reminder
      </Button>
    </Stack>
  );
}

type ReminderListProps = {
  reminders: Reminder[];
  onChange: () => void;
  emptyMessage?: string;
  allowComplete?: boolean;
  allowUndo?: boolean;
};

export const REMINDER_PAGE_SIZE = 4;

export function ReminderList({
  reminders,
  onChange,
  emptyMessage,
  allowComplete = true,
  allowUndo = false,
}: ReminderListProps) {
  const [visibleCount, setVisibleCount] = useState(REMINDER_PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(REMINDER_PAGE_SIZE);
  }, [reminders]);

  const complete = async (id: string) => {
    await api.reminders.patch(id, { completed: true });
    onChange();
  };

  const undoComplete = async (id: string) => {
    await api.reminders.patch(id, { completed: false });
    onChange();
  };

  if (!reminders.length) {
    return (
      <Typography level="body-sm" textColor="neutral.500">
        {emptyMessage ?? "No reminders yet."}
      </Typography>
    );
  }

  const visibleReminders = reminders.slice(0, visibleCount);
  const canShowMore = reminders.length > visibleCount;

  return (
    <Stack spacing={1}>
      {visibleReminders.map((r) => {
        const overdue = !r.completed && new Date(r.dueAt) < new Date();
        return (
          <Card key={r.id} variant="outlined" color={overdue ? "warning" : "neutral"}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
                <Box sx={{ flex: 1 }}>
                  <Typography fontWeight="lg">{r.title}</Typography>
                  {r.sourceKey ? (
                    <Typography level="body-xs" sx={{ mt: 0.5 }}>
                      {formatDue(r.dueAt)}
                    </Typography>
                  ) : (
                    <>
                      <Chip size="sm" sx={{ mt: 0.5 }}>
                        {categoryLabel(r.category)}
                      </Chip>
                      <Typography level="body-xs" sx={{ mt: 0.5 }}>
                        {formatDue(r.dueAt)}
                        {r.location ? ` · ${r.location}` : ""}
                        {r.hatch ? ` · ${r.hatch.name}` : ""}
                      </Typography>
                      {r.notes && (
                        <Typography level="body-sm" sx={{ mt: 0.5 }}>
                          {r.notes}
                        </Typography>
                      )}
                    </>
                  )}
                </Box>
                {allowComplete && !r.completed && (
                  <Button size="sm" variant="soft" color="success" onClick={() => complete(r.id)}>
                    Done
                  </Button>
                )}
                {allowUndo && r.completed && (
                  <Button size="sm" variant="soft" color="neutral" onClick={() => undoComplete(r.id)}>
                    Undo
                  </Button>
                )}
              </Stack>
            </CardContent>
          </Card>
        );
      })}
      {canShowMore && (
        <Button
          size="sm"
          variant="plain"
          color="neutral"
          onClick={() => setVisibleCount((count) => count + REMINDER_PAGE_SIZE)}
          sx={{ alignSelf: "flex-start" }}
        >
          Show more
        </Button>
      )}
    </Stack>
  );
}

export function ProfileRemindersSection() {
  const [upcoming, setUpcoming] = useState<Reminder[]>([]);
  const [completed, setCompleted] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([api.reminders.list(false), api.reminders.list(true)])
      .then(([open, done]) => {
        setUpcoming(open);
        setCompleted(
          [...done].sort((a, b) => new Date(b.dueAt).getTime() - new Date(a.dueAt).getTime())
        );
        setError("");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load reminders"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  return (
    <Stack spacing={2}>
      <Typography level="title-md">Reminders</Typography>
      {error && <Alert color="danger">{error}</Alert>}
      {loading ? (
        <CircularProgress size="sm" />
      ) : (
        <>
          <Stack spacing={1}>
            <Typography level="title-sm">Upcoming</Typography>
            <ReminderList
              reminders={upcoming}
              onChange={load}
              emptyMessage="No upcoming reminders."
            />
          </Stack>
          <Stack spacing={1}>
            <Typography level="title-sm">Completed</Typography>
            <ReminderList
              reminders={completed}
              onChange={load}
              allowComplete={false}
              allowUndo
              emptyMessage="No completed reminders."
            />
          </Stack>
        </>
      )}
    </Stack>
  );
}
