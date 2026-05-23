import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Typography from "@mui/joy/Typography";
import Button from "@mui/joy/Button";
import ButtonGroup from "@mui/joy/ButtonGroup";
import Card from "@mui/joy/Card";
import CardContent from "@mui/joy/CardContent";
import Stack from "@mui/joy/Stack";
import Chip from "@mui/joy/Chip";
import FormControl from "@mui/joy/FormControl";
import FormLabel from "@mui/joy/FormLabel";
import Input from "@mui/joy/Input";
import Textarea from "@mui/joy/Textarea";
import IconButton from "@mui/joy/IconButton";
import Sheet from "@mui/joy/Sheet";
import Alert from "@mui/joy/Alert";
import CircularProgress from "@mui/joy/CircularProgress";
import AddIcon from "@mui/icons-material/Add";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";
import UnarchiveIcon from "@mui/icons-material/Unarchive";
import { api, type HatchEgg } from "../api/client";

const EGG_STATUSES = [
  "INCUBATING",
  "LOCKDOWN",
  "HATCHING",
  "HATCHED",
  "NOT_VIABLE",
  "FAILED_HATCH",
  "DISCARDED",
] as const;

type EggView = "active" | "archived" | "all";

export function eggStatusLabel(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function eggStatusColor(status: string): "primary" | "success" | "warning" | "danger" | "neutral" {
  switch (status) {
    case "HATCHED":
      return "success";
    case "HATCHING":
    case "LOCKDOWN":
      return "warning";
    case "NOT_VIABLE":
    case "FAILED_HATCH":
    case "DISCARDED":
      return "danger";
    default:
      return "primary";
  }
}

function latestLogLine(egg: HatchEgg) {
  const lastHatch = egg.hatchingLogs?.[0];
  const lastDev = egg.incubationLogs?.[0];
  if (lastHatch) return `Hatching: ${eggStatusLabel(lastHatch.stage)}`;
  if (lastDev) return `Day ${lastDev.incubationDay}: ${eggStatusLabel(lastDev.assessment)}`;
  return "No logs yet";
}

interface Props {
  hatchId: string;
  canEdit?: boolean;
  onChanged?: () => void;
}

export function HatchEggsSection({ hatchId, canEdit = true, onChanged }: Props) {
  const [view, setView] = useState<EggView>("active");
  const [eggs, setEggs] = useState<HatchEgg[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionEggId, setActionEggId] = useState<string | null>(null);

  const [eggNumber, setEggNumber] = useState(1);
  const [label, setLabel] = useState("");
  const [source, setSource] = useState("");
  const [shellMarking, setShellMarking] = useState("");
  const [notes, setNotes] = useState("");
  const [bulkCount, setBulkCount] = useState(1);

  const load = useCallback(() => {
    setLoading(true);
    api.eggs
      .list(hatchId, view)
      .then(setEggs)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load eggs"))
      .finally(() => setLoading(false));
  }, [hatchId, view]);

  useEffect(() => {
    load();
  }, [load]);

  const nextNumber = eggs.length ? Math.max(...eggs.map((e) => e.eggNumber)) + 1 : 1;

  const resetForm = () => {
    setLabel("");
    setSource("");
    setShellMarking("");
    setNotes("");
    setBulkCount(1);
    setError("");
  };

  const openForm = () => {
    resetForm();
    setEggNumber(nextNumber);
    setShowForm(true);
  };

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      if (mode === "bulk") {
        await api.eggs.create(hatchId, { count: bulkCount });
      } else {
        await api.eggs.create(hatchId, {
          eggNumber: eggNumber || undefined,
          label: label.trim() || undefined,
          source: source.trim() || undefined,
          shellMarking: shellMarking.trim() || undefined,
          notes: notes.trim() || undefined,
        });
      }
      setShowForm(false);
      resetForm();
      load();
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add egg");
    } finally {
      setSaving(false);
    }
  };

  const unarchiveEgg = async (eggId: string) => {
    setActionEggId(eggId);
    setError("");
    try {
      await api.eggs.unarchive(hatchId, eggId);
      load();
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to restore egg");
    } finally {
      setActionEggId(null);
    }
  };

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
        <Typography level="title-md">Eggs {!loading ? `(${eggs.length})` : ""}</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <ButtonGroup size="sm">
            <Button variant={view === "active" ? "solid" : "outlined"} onClick={() => setView("active")}>
              Active
            </Button>
            <Button variant={view === "archived" ? "solid" : "outlined"} onClick={() => setView("archived")}>
              Archived
            </Button>
            <Button variant={view === "all" ? "solid" : "outlined"} onClick={() => setView("all")}>
              All
            </Button>
          </ButtonGroup>
          {canEdit && view === "active" && (
            <Button size="sm" startDecorator={<AddIcon />} onClick={openForm} disabled={showForm}>
              Add egg
            </Button>
          )}
        </Stack>
      </Stack>

      {showForm && view === "active" && (
        <Sheet variant="outlined" sx={{ p: 2, borderRadius: "md" }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
            <Typography level="title-sm">New egg</Typography>
            <IconButton size="sm" variant="plain" onClick={() => setShowForm(false)}>
              <CloseIcon />
            </IconButton>
          </Stack>

          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Button
              size="sm"
              variant={mode === "single" ? "solid" : "outlined"}
              onClick={() => setMode("single")}
            >
              One egg with details
            </Button>
            <Button
              size="sm"
              variant={mode === "bulk" ? "solid" : "outlined"}
              onClick={() => setMode("bulk")}
            >
              Add multiple
            </Button>
          </Stack>

          {mode === "bulk" ? (
            <FormControl>
              <FormLabel>How many eggs?</FormLabel>
              <Input
                type="number"
                slotProps={{ input: { min: 1, max: 200 } }}
                value={bulkCount}
                onChange={(e) => setBulkCount(Math.max(1, Number(e.target.value)))}
              />
            </FormControl>
          ) : (
            <Stack spacing={1.5}>
              <FormControl>
                <FormLabel>Egg number</FormLabel>
                <Input
                  type="number"
                  slotProps={{ input: { min: 1 } }}
                  value={eggNumber}
                  onChange={(e) => setEggNumber(Number(e.target.value))}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Label (optional)</FormLabel>
                <Input placeholder="e.g. Blue Ameraucana" value={label} onChange={(e) => setLabel(e.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel>Source hen (optional)</FormLabel>
                <Input placeholder="Hen tag or name" value={source} onChange={(e) => setSource(e.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel>Shell marking (optional)</FormLabel>
                <Input placeholder="e.g. X in pencil" value={shellMarking} onChange={(e) => setShellMarking(e.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel>Notes (optional)</FormLabel>
                <Textarea minRows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </FormControl>
            </Stack>
          )}

          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button loading={saving} onClick={submit}>
              {mode === "bulk" ? `Add ${bulkCount} eggs` : "Add egg"}
            </Button>
            <Button variant="plain" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </Stack>
        </Sheet>
      )}

      {error && <Alert color="danger">{error}</Alert>}

      {loading ? (
        <CircularProgress size="sm" />
      ) : eggs.length === 0 ? (
        <Typography level="body-sm" sx={{ color: "text.tertiary" }}>
          {view === "archived"
            ? "No archived eggs for this incubator."
            : view === "all"
              ? "No eggs in this incubator yet."
              : "No eggs in this clutch yet. Add eggs to track each one individually."}
        </Typography>
      ) : (
        <Stack spacing={1}>
          {eggs.map((egg) => (
            <Card key={egg.id} variant="outlined">
              <CardContent>
                <Stack direction="row" alignItems="flex-start" spacing={1}>
                  <Stack
                    component={Link}
                    to={`/hatch/${hatchId}/egg/${egg.id}`}
                    spacing={0.5}
                    flex={1}
                    sx={{ textDecoration: "none", color: "inherit" }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      <Typography fontWeight="lg">Egg #{egg.eggNumber}</Typography>
                      {egg.label && (
                        <Typography level="body-sm" sx={{ color: "text.secondary" }}>
                          {egg.label}
                        </Typography>
                      )}
                      <Chip size="sm" color={eggStatusColor(egg.status)} variant="soft">
                        {eggStatusLabel(egg.status)}
                      </Chip>
                      {egg.archivedAt && (
                        <Chip size="sm" variant="outlined" color="neutral">
                          Archived
                        </Chip>
                      )}
                    </Stack>

                    {egg.archivedAt && (
                      <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
                        Archived {new Date(egg.archivedAt).toLocaleDateString()}
                      </Typography>
                    )}

                    {(egg.source || egg.shellMarking) && (
                      <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
                        {[egg.source && `From ${egg.source}`, egg.shellMarking && `Mark: ${egg.shellMarking}`]
                          .filter(Boolean)
                          .join(" · ")}
                      </Typography>
                    )}

                    <Typography level="body-xs">{latestLogLine(egg)}</Typography>

                    {egg.noteLog?.[0] ? (
                      <Typography level="body-xs" sx={{ color: "text.secondary" }}>
                        {egg.noteLog[0].body}
                      </Typography>
                    ) : egg.notes ? (
                      <Typography level="body-xs" sx={{ color: "text.secondary" }}>
                        {egg.notes}
                      </Typography>
                    ) : null}

                    {egg.hatchedChicken && (
                      <Typography level="body-xs" color="success">
                        Chick: {egg.hatchedChicken.tagNumber}
                        {egg.hatchedChicken.name ? ` (${egg.hatchedChicken.name})` : ""}
                      </Typography>
                    )}
                  </Stack>

                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    {egg.archivedAt && (
                      <IconButton
                        size="sm"
                        variant="soft"
                        color="neutral"
                        loading={actionEggId === egg.id}
                        onClick={() => unarchiveEgg(egg.id)}
                        aria-label="Restore egg"
                      >
                        <UnarchiveIcon />
                      </IconButton>
                    )}
                    <IconButton
                      component={Link}
                      to={`/hatch/${hatchId}/egg/${egg.id}`}
                      size="sm"
                      variant="plain"
                      aria-label="View egg"
                    >
                      <ChevronRightIcon />
                    </IconButton>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

export { EGG_STATUSES };
