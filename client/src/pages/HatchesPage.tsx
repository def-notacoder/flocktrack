import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import Box from "@mui/joy/Box";
import Typography from "@mui/joy/Typography";
import Button from "@mui/joy/Button";
import ButtonGroup from "@mui/joy/ButtonGroup";
import Card from "@mui/joy/Card";
import CardContent from "@mui/joy/CardContent";
import Stack from "@mui/joy/Stack";
import Chip from "@mui/joy/Chip";
import CircularProgress from "@mui/joy/CircularProgress";
import Alert from "@mui/joy/Alert";
import AddIcon from "@mui/icons-material/Add";
import ArchiveIcon from "@mui/icons-material/Archive";
import { api, type Hatch } from "../api/client";

type ViewMode = "active" | "archived";

function HatchCard({
  hatch,
  onArchive,
  showArchivedDate,
}: {
  hatch: Hatch;
  onArchive?: (id: string) => void;
  showArchivedDate?: boolean;
}) {
  const canArchive =
    (hatch.status === "COMPLETED" || hatch.status === "CANCELLED") && onArchive;

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" alignItems="flex-start" gap={1}>
          <Box
            component={Link}
            to={`/hatch/${hatch.id}`}
            sx={{ flex: 1, textDecoration: "none", color: "inherit" }}
          >
            <Stack direction="row" justifyContent="space-between" mb={0.5}>
              <Typography fontWeight="lg">{hatch.name}</Typography>
              <Chip size="sm" variant="soft">
                {hatch.status === "CANCELLED" ? "Failed" : hatch.status === "INCUBATING" ? "Incubating" : hatch.status.charAt(0) + hatch.status.slice(1).toLowerCase()}
              </Chip>
            </Stack>
            <Typography level="body-sm" textColor="neutral.600">
              {hatch.poultryLabel} · Day {hatch.milestones?.currentIncubationDay ?? "?"} of{" "}
              {hatch.incubationDays}
            </Typography>
            <Typography level="body-xs">
              Lockdown day {hatch.lockdownDay} · Hatch day {hatch.incubationDays}
            </Typography>
            {showArchivedDate && hatch.archivedAt && (
              <Typography level="body-xs" textColor="neutral.500" sx={{ mt: 0.5 }}>
                Archived {new Date(hatch.archivedAt).toLocaleDateString()}
              </Typography>
            )}
          </Box>
          {canArchive && (
            <Button
              size="sm"
              variant="soft"
              color="neutral"
              startDecorator={<ArchiveIcon />}
              onClick={() => onArchive(hatch.id)}
            >
              Archive
            </Button>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function HatchesPage() {
  const [hatches, setHatches] = useState<Hatch[]>([]);
  const [view, setView] = useState<ViewMode>("active");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    api.hatches
      .list({ archived: view === "archived" })
      .then(setHatches)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [view]);

  useEffect(load, [load]);

  const archive = async (id: string) => {
    if (!confirm("Archive this hatch? It will be removed from the Hatch list.")) return;
    try {
      await api.hatches.archive(id);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to archive");
    }
  };

  const active = hatches.filter((h) => !["COMPLETED", "CANCELLED"].includes(h.status));
  const completed = hatches.filter((h) => h.status === "COMPLETED" || h.status === "CANCELLED");

  return (
    <Stack spacing={2}>
      <Button component={Link} to="/" variant="plain" size="sm" sx={{ alignSelf: "flex-start", px: 0 }}>
        ← Home
      </Button>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography level="h3">Hatch</Typography>
        {view === "active" && (
          <Button component={Link} to="/hatch/new" startDecorator={<AddIcon />} size="sm">
            New clutch
          </Button>
        )}
      </Stack>

      <ButtonGroup sx={{ alignSelf: "flex-start" }}>
        <Button
          variant={view === "active" ? "solid" : "outlined"}
          onClick={() => setView("active")}
        >
          Active
        </Button>
        <Button
          variant={view === "archived" ? "solid" : "outlined"}
          onClick={() => setView("archived")}
          startDecorator={<ArchiveIcon />}
        >
          Archived
        </Button>
      </ButtonGroup>

      {error && <Alert color="danger">{error}</Alert>}
      {loading && <CircularProgress />}

      {view === "active" && !loading && (
        <>
          {active.length > 0 && (
            <Stack spacing={1}>
              {active.map((h) => (
                <HatchCard key={h.id} hatch={h} />
              ))}
            </Stack>
          )}

          {completed.length > 0 && (
            <Stack spacing={1}>
              <Typography level="title-md">Completed</Typography>
              {completed.map((h) => (
                <HatchCard key={h.id} hatch={h} onArchive={archive} />
              ))}
            </Stack>
          )}

          {!hatches.length && !error && (
            <Typography level="body-sm" textColor="neutral.500">
              No active hatches. Start a new clutch to begin tracking.
            </Typography>
          )}
        </>
      )}

      {view === "archived" && !loading && (
        <>
          {hatches.length > 0 ? (
            <Stack spacing={1}>
              {hatches.map((h) => (
                <HatchCard key={h.id} hatch={h} showArchivedDate />
              ))}
            </Stack>
          ) : (
            !error && (
              <Typography level="body-sm" textColor="neutral.500">
                No archived hatches.
              </Typography>
            )
          )}
        </>
      )}
    </Stack>
  );
}
