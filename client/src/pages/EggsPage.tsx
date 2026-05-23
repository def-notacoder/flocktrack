import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Typography from "@mui/joy/Typography";
import Button from "@mui/joy/Button";
import Card from "@mui/joy/Card";
import CardContent from "@mui/joy/CardContent";
import Stack from "@mui/joy/Stack";
import CircularProgress from "@mui/joy/CircularProgress";
import Alert from "@mui/joy/Alert";
import { api, type Chicken, type LayingRecord } from "../api/client";
import { EggCollectionSection } from "../components/EggCollectionSection";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function EggsPage() {
  const [birds, setBirds] = useState<Chicken[]>([]);
  const [records, setRecords] = useState<LayingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    const from = new Date();
    from.setDate(from.getDate() - 90);
    Promise.all([
      api.chickens.list({ status: "ACTIVE" }),
      api.laying.list({ from: from.toISOString().slice(0, 10) }),
    ])
      .then(([birdList, layingList]) => {
        setBirds(birdList);
        setRecords(layingList);
        setError("");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const todayTotal = useMemo(() => {
    const today = todayIso();
    return records
      .filter((r) => r.recordedOn.slice(0, 10) === today)
      .reduce((sum, r) => sum + r.count, 0);
  }, [records]);

  if (loading && records.length === 0) return <CircularProgress />;

  return (
    <Stack spacing={2}>
      <Button component={Link} to="/" variant="plain" size="sm" sx={{ alignSelf: "flex-start", px: 0 }}>
        ← Home
      </Button>
      <Typography level="h3">Eggs</Typography>

      <Card variant="soft">
        <CardContent>
          <Typography level="title-md">Collected today</Typography>
          <Typography level="h2">{todayTotal}</Typography>
        </CardContent>
      </Card>

      {error && !records.length && <Alert color="danger">{error}</Alert>}

      <EggCollectionSection birds={birds} records={records} onChanged={load} />
    </Stack>
  );
}
