import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import Typography from "@mui/joy/Typography";
import Card from "@mui/joy/Card";
import CardContent from "@mui/joy/CardContent";
import Stack from "@mui/joy/Stack";
import Chip from "@mui/joy/Chip";
import Button from "@mui/joy/Button";
import CircularProgress from "@mui/joy/CircularProgress";
import Alert from "@mui/joy/Alert";
import AddIcon from "@mui/icons-material/Add";
import { api, type Dashboard } from "../api/client";
import { ReminderForm, ReminderList } from "../components/Reminders";

export default function HomePage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(() => {
    api.dashboard().then(setData).catch((e) => setError(e.message));
  }, []);

  useEffect(load, [load]);

  if (error) return <Alert color="danger">{error}</Alert>;
  if (!data) return <CircularProgress />;

  return (
    <Stack spacing={2}>
      <Card component={Link} to="/eggs" sx={{ textDecoration: "none" }}>
        <CardContent>
          <Typography level="title-md">Eggs collected today</Typography>
          <Typography level="h2">{data.todayEggCount}</Typography>
        </CardContent>
      </Card>

      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Stack spacing={0.25}>
          <Typography level="title-lg">Reminders</Typography>
          <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
            Lockdown and hatch-day reminders are created automatically for active incubators.
          </Typography>
        </Stack>
        <Button
          size="sm"
          variant={showAdd ? "soft" : "solid"}
          startDecorator={<AddIcon />}
          onClick={() => setShowAdd((v) => !v)}
        >
          {showAdd ? "Cancel" : "Add"}
        </Button>
      </Stack>

      {showAdd && (
        <Card variant="soft">
          <CardContent>
            <ReminderForm
              compact
              onSaved={() => {
                setShowAdd(false);
                load();
              }}
            />
          </CardContent>
        </Card>
      )}

      <ReminderList
        reminders={data.reminders}
        onChange={load}
        emptyMessage="No reminders yet — active incubators will get lockdown and hatch-day reminders automatically."
      />

      {data.activeHatches.length > 0 && (
        <Stack spacing={1}>
          <Typography level="title-md">Incubators</Typography>
          {data.activeHatches.map((h) => (
            <Card key={h.id} component={Link} to={`/hatch/${h.id}`} sx={{ textDecoration: "none" }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between">
                  <Typography fontWeight="lg">{h.name}</Typography>
                  <Chip size="sm">{h.status}</Chip>
                </Stack>
                <Typography level="body-sm">
                  Day {h.milestones?.currentIncubationDay ?? "?"} of {h.incubationDays} ·{" "}
                  {h.poultryLabel}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {data.healthFollowUps.length > 0 && (
        <Stack spacing={1}>
          <Typography level="title-md">Health follow-ups</Typography>
          {data.healthFollowUps.map((hr) => (
            <Card key={hr.id} variant="outlined" color="warning">
              <CardContent>
                <Typography level="body-sm">
                  #{hr.chicken.tagNumber} {hr.chicken.name} — {hr.notes}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
