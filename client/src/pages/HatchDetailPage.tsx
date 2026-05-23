import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import Typography from "@mui/joy/Typography";
import Button from "@mui/joy/Button";
import ButtonGroup from "@mui/joy/ButtonGroup";
import Stack from "@mui/joy/Stack";
import Chip from "@mui/joy/Chip";
import LinearProgress from "@mui/joy/LinearProgress";
import CircularProgress from "@mui/joy/CircularProgress";
import Alert from "@mui/joy/Alert";
import Tabs from "@mui/joy/Tabs";
import TabList from "@mui/joy/TabList";
import Tab from "@mui/joy/Tab";
import TabPanel from "@mui/joy/TabPanel";
import FormControl from "@mui/joy/FormControl";
import FormLabel from "@mui/joy/FormLabel";
import Input from "@mui/joy/Input";
import ArchiveIcon from "@mui/icons-material/Archive";
import UndoIcon from "@mui/icons-material/Undo";
import { api, type HatchDetail, type HatchStage } from "../api/client";
import { HatchEggsSection } from "../components/HatchEggsSection";
import { HatchLogSection } from "../components/HatchLogSection";

const STAGE_BUTTONS: { stage: HatchStage; label: string; color?: "success" | "warning" | "danger" | "neutral" }[] = [
  { stage: "LOCKDOWN", label: "Lockdown" },
  { stage: "HATCHING", label: "Hatching", color: "warning" },
  { stage: "COMPLETED", label: "Completed", color: "success" },
  { stage: "CANCELLED", label: "Failed", color: "danger" },
];

function hatchStatusLabel(status: string) {
  if (status === "CANCELLED") return "Failed";
  if (status === "INCUBATING") return "Incubating";
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function hatchStatusColor(status: string): "primary" | "success" | "warning" | "danger" | "neutral" {
  switch (status) {
    case "COMPLETED":
      return "success";
    case "HATCHING":
    case "LOCKDOWN":
      return "warning";
    case "CANCELLED":
      return "danger";
    default:
      return "primary";
  }
}

export default function HatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [hatch, setHatch] = useState<HatchDetail | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState(0);
  const [stageLoading, setStageLoading] = useState<HatchStage | "undo" | null>(null);
  const [editingDay, setEditingDay] = useState(false);
  const [dayValue, setDayValue] = useState(1);
  const [daySaving, setDaySaving] = useState(false);

  const load = () => {
    if (!id) return;
    api.hatches.get(id).then(setHatch).catch((e) => setError(e.message));
  };

  useEffect(load, [id]);

  const setStage = async (stage: HatchStage) => {
    if (!id || hatch?.status === stage) return;
    setStageLoading(stage);
    setError("");
    try {
      await api.hatches.setStage(id, stage);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update stage");
    } finally {
      setStageLoading(null);
    }
  };

  const undoStage = async () => {
    if (!id) return;
    setStageLoading("undo");
    setError("");
    try {
      await api.hatches.undoStage(id);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to undo stage");
    } finally {
      setStageLoading(null);
    }
  };

  const archive = async () => {
    if (!id || !confirm("Archive this hatch? It will be removed from the Hatch list.")) return;
    try {
      await api.hatches.archive(id);
      navigate("/hatch");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to archive");
    }
  };

  const startEditDay = () => {
    if (!hatch?.milestones) return;
    setDayValue(hatch.milestones.currentIncubationDay);
    setEditingDay(true);
    setError("");
  };

  const cancelEditDay = () => {
    setEditingDay(false);
  };

  const saveDay = async () => {
    if (!id) return;
    if (!Number.isFinite(dayValue) || dayValue < 1) {
      setError("Incubation day must be at least 1");
      return;
    }
    setDaySaving(true);
    setError("");
    try {
      const updated = await api.hatches.setIncubationDay(id, dayValue);
      setHatch(updated);
      setEditingDay(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update incubation day");
    } finally {
      setDaySaving(false);
    }
  };

  if (error && !hatch) return <Alert color="danger">{error}</Alert>;
  if (!hatch) return <CircularProgress />;

  const m = hatch.milestones;
  const progress = m ? (m.currentIncubationDay / m.incubationDays) * 100 : 0;
  const isArchived = Boolean(hatch.archivedAt);
  const canChangeStage = !isArchived;
  const canUndo = canChangeStage && hatch.status !== "INCUBATING";
  const canArchive =
    !isArchived && (hatch.status === "COMPLETED" || hatch.status === "CANCELLED");

  return (
    <Stack spacing={2}>
      <Button component={Link} to="/hatch" variant="plain" size="sm" sx={{ alignSelf: "flex-start", px: 0 }}>
        ← Hatch
      </Button>
      <Typography level="h3">{hatch.name}</Typography>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
        <Chip>{hatch.poultryLabel}</Chip>
        <Chip size="sm" color={hatchStatusColor(hatch.status)} variant="soft">
          {hatchStatusLabel(hatch.status)}
        </Chip>
      </Stack>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
        {editingDay ? (
          <>
            <FormControl size="sm" sx={{ minWidth: 120 }}>
              <FormLabel>Incubation day</FormLabel>
              <Input
                type="number"
                slotProps={{ input: { min: 1 } }}
                value={dayValue}
                onChange={(e) => setDayValue(Number(e.target.value))}
              />
            </FormControl>
            <Typography level="body-md" sx={{ alignSelf: "flex-end", pb: 0.75 }}>
              of {hatch.incubationDays}
            </Typography>
            <Stack direction="row" spacing={0.5} sx={{ alignSelf: "flex-end", pb: 0.5 }}>
              <Button size="sm" variant="solid" loading={daySaving} onClick={saveDay}>
                Save
              </Button>
              <Button size="sm" variant="plain" disabled={daySaving} onClick={cancelEditDay}>
                Cancel
              </Button>
            </Stack>
          </>
        ) : (
          <>
            <Typography level="title-lg">
              Day {m?.currentIncubationDay ?? "?"} of {hatch.incubationDays}
            </Typography>
            {!isArchived && (
              <Button size="sm" variant="plain" onClick={startEditDay}>
                Edit
              </Button>
            )}
          </>
        )}
      </Stack>
      {!editingDay && (
        <Typography level="body-xs" sx={{ color: "text.tertiary", mt: -1 }}>
          Eggs set {new Date(hatch.setDate).toLocaleDateString()}
        </Typography>
      )}
      <LinearProgress determinate value={Math.min(progress, 100)} />

      <Stack direction="row" spacing={1} flexWrap="wrap">
        <Chip size="sm" variant="outlined">
          Lockdown day {hatch.lockdownDay}
          {m && m.daysUntilLockdown > 0 ? ` (in ${m.daysUntilLockdown}d)` : ""}
        </Chip>
        <Chip size="sm" variant="outlined">
          Hatch day {hatch.incubationDays}
          {m && m.daysUntilHatch > 0 ? ` (in ${m.daysUntilHatch}d)` : ""}
        </Chip>
      </Stack>

      <Stack spacing={1}>
        <Typography level="title-sm">Stage</Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
          <ButtonGroup size="sm">
            {STAGE_BUTTONS.map(({ stage, label, color }) => (
              <Button
                key={stage}
                variant={hatch.status === stage ? "solid" : "outlined"}
                color={hatch.status === stage ? (color ?? "primary") : "neutral"}
                disabled={!canChangeStage || stageLoading !== null}
                loading={stageLoading === stage}
                onClick={() => setStage(stage)}
              >
                {label}
              </Button>
            ))}
          </ButtonGroup>
          <Button
            size="sm"
            variant="soft"
            color="neutral"
            startDecorator={<UndoIcon />}
            disabled={!canUndo || stageLoading !== null}
            loading={stageLoading === "undo"}
            onClick={undoStage}
          >
            Undo
          </Button>
        </Stack>
        {hatch.status === "INCUBATING" && (
          <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
            Incubating — select Lockdown when you enter lockdown, or use Undo after changing stage.
          </Typography>
        )}
      </Stack>

      {canArchive && (
        <Button
          size="sm"
          variant="soft"
          color="neutral"
          startDecorator={<ArchiveIcon />}
          onClick={archive}
          sx={{ alignSelf: "flex-start" }}
        >
          Archive
        </Button>
      )}

      {error && <Alert color="danger">{error}</Alert>}

      <Tabs value={tab} onChange={(_, v) => setTab(v as number)}>
        <TabList>
          <Tab>Eggs</Tab>
          <Tab>Log</Tab>
        </TabList>
        <TabPanel value={0}>
          <HatchEggsSection
            hatchId={id!}
            canEdit={hatch.status !== "COMPLETED" && hatch.status !== "CANCELLED" && !hatch.archivedAt}
            onChanged={load}
          />
        </TabPanel>
        <TabPanel value={1}>
          <HatchLogSection
            hatchId={id!}
            events={hatch.events}
            canEdit={!hatch.archivedAt}
            onChanged={load}
          />
        </TabPanel>
      </Tabs>
    </Stack>
  );
}
