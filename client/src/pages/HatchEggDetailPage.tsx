import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Typography from "@mui/joy/Typography";
import Button from "@mui/joy/Button";
import Tabs from "@mui/joy/Tabs";
import TabList from "@mui/joy/TabList";
import Tab from "@mui/joy/Tab";
import TabPanel from "@mui/joy/TabPanel";
import FormControl from "@mui/joy/FormControl";
import FormLabel from "@mui/joy/FormLabel";
import Input from "@mui/joy/Input";
import Select from "@mui/joy/Select";
import Option from "@mui/joy/Option";
import Textarea from "@mui/joy/Textarea";
import Stack from "@mui/joy/Stack";
import Chip from "@mui/joy/Chip";
import Modal from "@mui/joy/Modal";
import ModalDialog from "@mui/joy/ModalDialog";
import DialogTitle from "@mui/joy/DialogTitle";
import DialogContent from "@mui/joy/DialogContent";
import DialogActions from "@mui/joy/DialogActions";
import CircularProgress from "@mui/joy/CircularProgress";
import Alert from "@mui/joy/Alert";
import ArchiveIcon from "@mui/icons-material/Archive";
import UnarchiveIcon from "@mui/icons-material/Unarchive";
import { api, type HatchEgg } from "../api/client";
import { EGG_STATUSES, eggStatusLabel, eggStatusColor } from "../components/HatchEggsSection";
import { EggLogSection } from "../components/EggLogSection";
import { EggIncubationSection } from "../components/EggIncubationSection";
import { EggHatchingSection } from "../components/EggHatchingSection";

type EggDetail = HatchEgg & {
  incubationLogs?: { id: string; incubationDay: number; assessment: string; notes?: string; loggedAt: string }[];
  hatchingLogs?: { id: string; stage: string; notes?: string; loggedAt: string }[];
  noteLog?: { id: string; body: string; loggedAt: string }[];
  hatchedChicken?: { id: string; tagNumber: string; name?: string | null };
};

export default function HatchEggDetailPage() {
  const { hatchId, eggId } = useParams<{ hatchId: string; eggId: string }>();
  const navigate = useNavigate();
  const [egg, setEgg] = useState<EggDetail | null>(null);
  const [tab, setTab] = useState(0);
  const [incDay, setIncDay] = useState(1);
  const [error, setError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const [confirmArchiveOpen, setConfirmArchiveOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [unarchiving, setUnarchiving] = useState(false);

  const [label, setLabel] = useState("");
  const [source, setSource] = useState("");
  const [shellMarking, setShellMarking] = useState("");
  const [status, setStatus] = useState("INCUBATING");
  const [eggNumber, setEggNumber] = useState(1);

  const applyEgg = (detail: EggDetail) => {
    setEgg(detail);
    setLabel(detail.label ?? "");
    setSource(detail.source ?? "");
    setShellMarking(detail.shellMarking ?? "");
    setStatus(detail.status);
    setEggNumber(detail.eggNumber);
    const m = (detail as { hatch?: { milestones?: { currentIncubationDay: number } } }).hatch;
    if (m?.milestones?.currentIncubationDay) setIncDay(m.milestones.currentIncubationDay);
  };

  const load = () => {
    if (!hatchId || !eggId) return;
    api.eggs
      .get(hatchId, eggId)
      .then((e) => applyEgg(e as EggDetail))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load egg"));
  };

  useEffect(load, [hatchId, eggId]);

  const saveDetails = async () => {
    if (!hatchId || !eggId) return;
    if (!Number.isFinite(eggNumber) || eggNumber < 1) {
      setError("Egg number must be at least 1");
      setSaveSuccess(false);
      return;
    }
    setSavingDetails(true);
    setError("");
    setSaveSuccess(false);
    try {
      const updated = await api.eggs.patch(hatchId, eggId, {
        eggNumber,
        label: label.trim() || null,
        source: source.trim() || null,
        shellMarking: shellMarking.trim() || null,
        status,
      });
      applyEgg(updated as EggDetail);
      setSaveSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSavingDetails(false);
    }
  };

  const confirmRemoveEgg = async () => {
    setRemoving(true);
    setError("");
    try {
      await api.eggs.delete(hatchId!, eggId!);
      setConfirmRemoveOpen(false);
      navigate(`/hatch/${hatchId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove egg");
    } finally {
      setRemoving(false);
    }
  };

  const confirmArchiveEgg = async () => {
    setArchiving(true);
    setError("");
    try {
      await api.eggs.archive(hatchId!, eggId!);
      setConfirmArchiveOpen(false);
      navigate(`/hatch/${hatchId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to archive egg");
    } finally {
      setArchiving(false);
    }
  };

  const restoreEgg = async () => {
    setUnarchiving(true);
    setError("");
    try {
      await api.eggs.unarchive(hatchId!, eggId!);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to restore egg");
    } finally {
      setUnarchiving(false);
    }
  };

  if (!egg) return <CircularProgress />;

  const incLogs = egg.incubationLogs ?? [];
  const hatchLogs = egg.hatchingLogs ?? [];
  const noteLog = egg.noteLog ?? [];
  const isArchived = Boolean(egg.archivedAt);

  return (
    <Stack spacing={2}>
      <Button component={Link} to={`/hatch/${hatchId}`} variant="plain" size="sm">
        ← Back to clutch
      </Button>

      {isArchived && (
        <Alert color="neutral" variant="soft">
          This egg was archived on {new Date(egg.archivedAt!).toLocaleDateString()}. Restore it to
          track it in the active list again.
        </Alert>
      )}

      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
        <Typography level="h2">Egg #{egg.eggNumber}</Typography>
        <Chip size="sm" color={eggStatusColor(egg.status)} variant="soft">
          {eggStatusLabel(egg.status)}
        </Chip>
        {isArchived && (
          <Chip size="sm" variant="outlined" color="neutral">
            Archived
          </Chip>
        )}
      </Stack>

      {egg.hatchedChicken ? (
        <Button component={Link} to={`/birds/${egg.hatchedChicken.id}`} variant="soft" color="success">
          View chick {egg.hatchedChicken.tagNumber}
          {egg.hatchedChicken.name ? ` (${egg.hatchedChicken.name})` : ""}
        </Button>
      ) : !isArchived && egg.status !== "HATCHED" ? (
        <Button
          component={Link}
          to={`/hatch/${hatchId}/egg/${eggId}/register`}
          size="lg"
          color="success"
        >
          Register chick →
        </Button>
      ) : null}

      <Tabs value={tab} onChange={(_, v) => setTab(v as number)}>
        <TabList>
          <Tab>Details</Tab>
          <Tab>Log</Tab>
          <Tab>Incubation</Tab>
          <Tab>Hatching</Tab>
        </TabList>

        <TabPanel value={0}>
          <Stack spacing={2} sx={{ pt: 2 }}>
            <FormControl>
              <FormLabel>Egg number</FormLabel>
              <Input
                type="number"
                slotProps={{ input: { min: 1 } }}
                value={eggNumber}
                disabled={isArchived}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  setEggNumber(Number.isFinite(n) && n > 0 ? n : 1);
                }}
              />
            </FormControl>
            <FormControl>
              <FormLabel>Status</FormLabel>
              <Select
                value={status}
                disabled={isArchived}
                onChange={(_, v) => v && setStatus(v)}
              >
                {EGG_STATUSES.map((s) => (
                  <Option key={s} value={s}>
                    {eggStatusLabel(s)}
                  </Option>
                ))}
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel>Label</FormLabel>
              <Input
                placeholder="Breed or identifier"
                value={label}
                disabled={isArchived}
                onChange={(e) => setLabel(e.target.value)}
              />
            </FormControl>
            <FormControl>
              <FormLabel>Source hen</FormLabel>
              <Input
                placeholder="Hen tag or name"
                value={source}
                disabled={isArchived}
                onChange={(e) => setSource(e.target.value)}
              />
            </FormControl>
            <FormControl>
              <FormLabel>Shell marking</FormLabel>
              <Input
                placeholder="Pencil mark or code"
                value={shellMarking}
                disabled={isArchived}
                onChange={(e) => setShellMarking(e.target.value)}
              />
            </FormControl>
            {error && (
              <Alert color="danger" sx={{ mt: 0 }}>
                {error}
              </Alert>
            )}
            {saveSuccess && (
              <Alert color="success" variant="soft">
                Details saved.
              </Alert>
            )}
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {!isArchived && (
                <Button type="button" loading={savingDetails} onClick={saveDetails}>
                  Save details
                </Button>
              )}
              {isArchived ? (
                <Button
                  variant="soft"
                  color="neutral"
                  startDecorator={<UnarchiveIcon />}
                  loading={unarchiving}
                  onClick={restoreEgg}
                >
                  Restore to active
                </Button>
              ) : (
                <>
                  <Button
                    variant="soft"
                    color="neutral"
                    startDecorator={<ArchiveIcon />}
                    onClick={() => setConfirmArchiveOpen(true)}
                  >
                    Archive egg
                  </Button>
                  {!egg.hatchedChicken && (
                    <Button variant="soft" color="danger" onClick={() => setConfirmRemoveOpen(true)}>
                      Remove egg
                    </Button>
                  )}
                </>
              )}
            </Stack>
          </Stack>
        </TabPanel>

        <TabPanel value={1}>
          <EggLogSection
            hatchId={hatchId!}
            eggId={eggId!}
            notes={noteLog}
            canEdit={!isArchived}
            onChanged={load}
          />
        </TabPanel>

        <TabPanel value={2}>
          <EggIncubationSection
            hatchId={hatchId!}
            eggId={eggId!}
            logs={incLogs}
            defaultDay={incDay}
            canEdit={!isArchived}
            onChanged={load}
          />
        </TabPanel>

        <TabPanel value={3}>
          <EggHatchingSection
            hatchId={hatchId!}
            eggId={eggId!}
            logs={hatchLogs}
            canEdit={!isArchived}
            onChanged={load}
          />
        </TabPanel>
      </Tabs>

      <Modal open={confirmRemoveOpen} onClose={() => !removing && setConfirmRemoveOpen(false)}>
        <ModalDialog variant="outlined" role="alertdialog" aria-labelledby="remove-egg-title">
          <DialogTitle id="remove-egg-title">Remove egg?</DialogTitle>
          <DialogContent>
            Remove egg #{egg.eggNumber} from this incubator? All development and hatching logs for
            this egg will be permanently deleted.
          </DialogContent>
          <DialogActions>
            <Button variant="plain" color="neutral" disabled={removing} onClick={() => setConfirmRemoveOpen(false)}>
              Cancel
            </Button>
            <Button variant="solid" color="danger" loading={removing} onClick={confirmRemoveEgg}>
              Remove egg
            </Button>
          </DialogActions>
        </ModalDialog>
      </Modal>

      <Modal open={confirmArchiveOpen} onClose={() => !archiving && setConfirmArchiveOpen(false)}>
        <ModalDialog variant="outlined" role="alertdialog" aria-labelledby="archive-egg-title">
          <DialogTitle id="archive-egg-title">Archive egg?</DialogTitle>
          <DialogContent>
            Archive egg #{egg.eggNumber}? It will be hidden from the active egg list but kept with
            all logs. You can restore it from the Archived tab anytime.
          </DialogContent>
          <DialogActions>
            <Button variant="plain" color="neutral" disabled={archiving} onClick={() => setConfirmArchiveOpen(false)}>
              Cancel
            </Button>
            <Button variant="solid" color="neutral" loading={archiving} onClick={confirmArchiveEgg}>
              Archive egg
            </Button>
          </DialogActions>
        </ModalDialog>
      </Modal>
    </Stack>
  );
}
