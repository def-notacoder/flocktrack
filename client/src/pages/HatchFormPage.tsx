import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Typography from "@mui/joy/Typography";
import Button from "@mui/joy/Button";
import FormControl from "@mui/joy/FormControl";
import FormLabel from "@mui/joy/FormLabel";
import Input from "@mui/joy/Input";
import Select from "@mui/joy/Select";
import Option from "@mui/joy/Option";
import Stack from "@mui/joy/Stack";
import Alert from "@mui/joy/Alert";
import Chip from "@mui/joy/Chip";
import { api, type PoultryPreset } from "../api/client";

export default function HatchFormPage() {
  const navigate = useNavigate();
  const [presets, setPresets] = useState<PoultryPreset[]>([]);
  const [presetId, setPresetId] = useState("");
  const [name, setName] = useState("");
  const [poultryLabel, setPoultryLabel] = useState("Chicken");
  const [incubationDays, setIncubationDays] = useState(21);
  const [lockdownDay, setLockdownDay] = useState(18);
  const [setDate, setSetDate] = useState(new Date().toISOString().slice(0, 10));
  const [eggCount, setEggCount] = useState(6);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.presets().then(setPresets);
  }, []);

  const onPreset = (id: string | null) => {
    if (!id) return;
    setPresetId(id);
    const p = presets.find((x) => x.id === id);
    if (p) {
      setPoultryLabel(p.poultryLabel);
      setIncubationDays(p.incubationDays);
      setLockdownDay(p.lockdownDay);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const hatch = await api.hatches.create({
        name: name || `${poultryLabel} clutch`,
        poultryLabel,
        presetId: presetId || undefined,
        incubationDays,
        lockdownDay,
        setDate,
        eggCount,
      });
      navigate(`/hatch/${hatch.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack spacing={2} component="form" onSubmit={submit}>
      <Button component={Link} to="/hatch" variant="plain" size="sm" sx={{ alignSelf: "flex-start", px: 0 }}>
        ← Hatch
      </Button>
      <Typography level="h3">New incubator clutch</Typography>

      <FormControl>
        <FormLabel>Poultry preset</FormLabel>
        <Select value={presetId} onChange={(_, v) => onPreset(v)} placeholder="Choose preset">
          {presets.map((p) => (
            <Option key={p.id} value={p.id}>
              {p.name} ({p.incubationDays}d / lockdown {p.lockdownDay})
            </Option>
          ))}
        </Select>
      </FormControl>

      <FormControl>
        <FormLabel>Poultry type</FormLabel>
        <Input value={poultryLabel} onChange={(e) => setPoultryLabel(e.target.value)} />
      </FormControl>

      <FormControl required>
        <FormLabel>Incubation length (days until hatch)</FormLabel>
        <Input
          type="number"
          value={incubationDays}
          onChange={(e) => setIncubationDays(Number(e.target.value))}
          slotProps={{ input: { min: 1 } }}
        />
      </FormControl>

      <FormControl required>
        <FormLabel>Lockdown day</FormLabel>
        <Input
          type="number"
          value={lockdownDay}
          onChange={(e) => setLockdownDay(Number(e.target.value))}
          slotProps={{ input: { min: 1 } }}
        />
        <Typography level="body-xs">Day to stop turning / raise humidity</Typography>
      </FormControl>

      <Chip variant="soft" color="primary">
        Hatch day {incubationDays} · Lockdown day {lockdownDay}
      </Chip>

      <FormControl>
        <FormLabel>Clutch name</FormLabel>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Incubator A" />
      </FormControl>

      <FormControl required>
        <FormLabel>Set date (day 0)</FormLabel>
        <Input type="date" value={setDate} onChange={(e) => setSetDate(e.target.value)} />
      </FormControl>

      <FormControl>
        <FormLabel>Number of eggs</FormLabel>
        <Input
          type="number"
          value={eggCount}
          onChange={(e) => setEggCount(Number(e.target.value))}
          slotProps={{ input: { min: 0 } }}
        />
      </FormControl>

      {error && <Alert color="danger">{error}</Alert>}
      <Button type="submit" loading={loading} size="lg">
        Start clutch
      </Button>
    </Stack>
  );
}
