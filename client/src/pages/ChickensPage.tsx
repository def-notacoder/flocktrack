import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import Typography from "@mui/joy/Typography";
import Button from "@mui/joy/Button";
import Input from "@mui/joy/Input";
import Card from "@mui/joy/Card";
import CardContent from "@mui/joy/CardContent";
import Stack from "@mui/joy/Stack";
import Chip from "@mui/joy/Chip";
import CircularProgress from "@mui/joy/CircularProgress";
import Alert from "@mui/joy/Alert";
import AddIcon from "@mui/icons-material/Add";
import { api, type Chicken } from "../api/client";
import { formatBirdOrigin } from "../lib/bird-origin";
import { BirdPhoto } from "../components/BirdPhoto";

type StatusFilter = "" | "ACTIVE" | "DECEASED" | "SOLD" | "REHOMED";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "DECEASED", label: "Deceased" },
  { value: "SOLD", label: "Sold" },
  { value: "REHOMED", label: "Rehomed" },
];

function statusLabel(status: string) {
  return STATUS_FILTERS.find((f) => f.value === status)?.label ?? status.replace(/_/g, " ");
}

function statusColor(status: string): "success" | "neutral" | "warning" | "primary" | undefined {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "DECEASED":
      return "neutral";
    case "SOLD":
      return "warning";
    case "REHOMED":
      return "primary";
    default:
      return undefined;
  }
}

export default function ChickensPage() {
  const [birds, setBirds] = useState<Chicken[]>([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ACTIVE");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    api.chickens
      .list({
        q: q.trim() || undefined,
        status: statusFilter || undefined,
      })
      .then(setBirds)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [q, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Stack spacing={2}>
      <Button component={Link} to="/" variant="plain" size="sm" sx={{ alignSelf: "flex-start", px: 0 }}>
        ← Home
      </Button>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography level="h3">Flock</Typography>
        <Button component={Link} to="/birds/new" startDecorator={<AddIcon />} size="sm">
          Add bird
        </Button>
      </Stack>

      <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap", gap: 0.75 }}>
        {STATUS_FILTERS.map((f) => (
          <Chip
            key={f.value || "all"}
            variant={statusFilter === f.value ? "solid" : "outlined"}
            color={statusFilter === f.value ? "primary" : "neutral"}
            onClick={() => setStatusFilter(f.value)}
            sx={{ cursor: "pointer" }}
          >
            {f.label}
          </Chip>
        ))}
      </Stack>

      <Input
        placeholder="Search tag or name"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && load()}
      />
      <Button variant="outlined" size="sm" onClick={load}>
        Search
      </Button>

      {error && <Alert color="danger">{error}</Alert>}
      {loading && <CircularProgress />}

      {!loading && !birds.length && !error && (
        <Typography level="body-sm" textColor="neutral.500">
          No birds match this filter.
        </Typography>
      )}

      {!loading &&
        birds.map((b) => (
          <Card key={b.id} component={Link} to={`/birds/${b.id}`} sx={{ textDecoration: "none" }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1} sx={{ mb: 0.5 }}>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
                  <BirdPhoto photoUrl={b.photoUrl} />
                  <Typography fontWeight="lg" sx={{ minWidth: 0 }}>
                    #{b.tagNumber} {b.name}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                  <Chip size="sm" color={statusColor(b.status)} variant="soft">
                    {statusLabel(b.status)}
                  </Chip>
                  <Chip size="sm" variant="outlined">
                    {formatBirdOrigin(b.origin, b.originDetail)}
                  </Chip>
                </Stack>
              </Stack>
              <Typography level="body-sm">
                {b.poultryLabel} · {b.sex}
                {b.colorMarking ? ` · ${b.colorMarking}` : ""}
              </Typography>
              {b.hatchEgg && (
                <Typography level="body-xs">From egg #{b.hatchEgg.eggNumber}</Typography>
              )}
            </CardContent>
          </Card>
        ))}
    </Stack>
  );
}
