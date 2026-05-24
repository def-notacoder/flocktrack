import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Typography from "@mui/joy/Typography";
import Button from "@mui/joy/Button";
import Stack from "@mui/joy/Stack";
import Chip from "@mui/joy/Chip";
import List from "@mui/joy/List";
import ListItem from "@mui/joy/ListItem";
import ListItemContent from "@mui/joy/ListItemContent";
import Tabs from "@mui/joy/Tabs";
import TabList from "@mui/joy/TabList";
import Tab from "@mui/joy/Tab";
import TabPanel from "@mui/joy/TabPanel";
import CircularProgress from "@mui/joy/CircularProgress";
import Alert from "@mui/joy/Alert";
import { api, type ChickenDetail, type TimelineResponse } from "../api/client";
import { formatBirdOrigin } from "../lib/bird-origin";
import { BirdPhoto } from "../components/BirdPhoto";
import { BirdHealthLogSection } from "../components/BirdHealthLogSection";

export default function ChickenDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [bird, setBird] = useState<ChickenDetail | null>(null);
  const [timeline, setTimeline] = useState<TimelineResponse | null>(null);
  const [tab, setTab] = useState(0);
  const [error, setError] = useState("");

  const load = () => {
    if (!id) return;
    Promise.all([api.chickens.get(id), api.chickens.timeline(id)])
      .then(([b, t]) => {
        setBird(b);
        setTimeline(t);
      })
      .catch((e) => setError(e.message));
  };

  useEffect(load, [id]);

  const markDeceased = async () => {
    const notes = prompt("Notes for end of life (optional)") ?? undefined;
    if (!id) return;
    await api.chickens.deceased(id, { notes });
    load();
  };

  if (error) return <Alert color="danger">{error}</Alert>;
  if (!bird || !id) return <CircularProgress />;

  const isActive = bird.status === "ACTIVE";
  const healthRecords = [...bird.healthRecords].sort(
    (a, b) => new Date(b.observedOn).getTime() - new Date(a.observedOn).getTime()
  );

  return (
    <Stack spacing={2}>
      <Button component={Link} to="/birds" variant="plain" size="sm" sx={{ alignSelf: "flex-start", px: 0 }}>
        ← Flock
      </Button>

      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
          <BirdPhoto
            photoUrl={bird.photoUrl}
            size={72}
            alt={bird.name ? `${bird.name} photo` : `Bird ${bird.tagNumber} photo`}
          />
          <Typography level="h2" sx={{ minWidth: 0 }}>
            {bird.name?.trim() || `#${bird.tagNumber}`}
          </Typography>
        </Stack>
        <Button component={Link} to={`/birds/${id}/edit`} size="sm" variant="outlined" sx={{ flexShrink: 0 }}>
          Edit
        </Button>
      </Stack>

      {bird.colorMarking && <Chip>{bird.colorMarking}</Chip>}
      <Typography level="body-sm">
        #{bird.tagNumber} · {bird.poultryLabel} · {bird.sex} · {bird.lifeStage}
      </Typography>

      {bird.hatch && bird.hatchEgg ? (
        <Typography level="body-sm">
          Origin:{" "}
          <Link to={`/hatch/${bird.hatch.id}`}>{bird.hatch.name}</Link> · Egg #{bird.hatchEgg.eggNumber}
        </Typography>
      ) : (
        <Typography level="body-sm">
          Origin: Added to flock · {formatBirdOrigin(bird.origin, bird.originDetail)} ·{" "}
          {new Date(bird.acquiredOn).toLocaleDateString()}
        </Typography>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v as number)}>
        <TabList>
          <Tab>Overview</Tab>
          <Tab>Log</Tab>
        </TabList>

        <TabPanel value={0}>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography level="title-md">Lifecycle</Typography>
            <List aria-label="timeline">
              {timeline?.entries.map((e, i) => (
                <ListItem key={i} sx={{ px: 0 }}>
                  <ListItemContent>
                    <Typography level="body-xs" textColor="neutral.500">
                      {new Date(e.date).toLocaleString()} · {e.type}
                    </Typography>
                    <Typography level="title-sm">{e.title}</Typography>
                    {e.detail && <Typography level="body-sm">{e.detail}</Typography>}
                  </ListItemContent>
                </ListItem>
              ))}
            </List>

            {isActive && (
              <Button color="danger" variant="soft" onClick={markDeceased}>
                Mark deceased
              </Button>
            )}
          </Stack>
        </TabPanel>

        <TabPanel value={1}>
          <BirdHealthLogSection
            chickenId={id}
            birdLifeStage={bird.lifeStage}
            records={healthRecords}
            canEdit={isActive}
            onChanged={load}
          />
        </TabPanel>
      </Tabs>
    </Stack>
  );
}
