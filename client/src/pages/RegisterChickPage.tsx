import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import Typography from "@mui/joy/Typography";
import Button from "@mui/joy/Button";
import FormControl from "@mui/joy/FormControl";
import FormLabel from "@mui/joy/FormLabel";
import Input from "@mui/joy/Input";
import Select from "@mui/joy/Select";
import Option from "@mui/joy/Option";
import Textarea from "@mui/joy/Textarea";
import Stack from "@mui/joy/Stack";
import Alert from "@mui/joy/Alert";
import { api } from "../api/client";

export default function RegisterChickPage() {
  const { hatchId, eggId } = useParams<{ hatchId: string; eggId: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [healthNotes, setHealthNotes] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [tagNumber, setTagNumber] = useState("");
  const [name, setName] = useState("");
  const [colorMarking, setColorMarking] = useState("");
  const [sex, setSex] = useState("UNKNOWN");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!eggId) return;
    setLoading(true);
    setError("");
    try {
      const chicken = await api.chickens.fromEgg({
        hatchEggId: eggId,
        tagNumber,
        name: name || undefined,
        colorMarking: colorMarking || undefined,
        sex,
        notes: notes || undefined,
        hatchHealth: {
          notes: healthNotes || "Registered at hatch",
          symptoms: symptoms || undefined,
        },
      });
      navigate(`/birds/${chicken.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack spacing={2}>
      <Button component={Link} to={`/hatch/${hatchId}/egg/${eggId}`} variant="plain" size="sm">
        ← Back to egg
      </Button>
      <Typography level="h3">Register chick</Typography>
      <Typography level="body-sm">Step {step + 1} of 3</Typography>

      {step === 0 && (
        <Stack spacing={2}>
          <Typography level="title-md">Health at hatch</Typography>
          <FormLabel>Observations</FormLabel>
          <Textarea
            placeholder="Vigor, naval, legs..."
            value={healthNotes}
            onChange={(e) => setHealthNotes(e.target.value)}
            minRows={3}
            required
          />
          <Textarea
            placeholder="Symptoms (optional)"
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            minRows={2}
          />
          <Button onClick={() => setStep(1)} disabled={!healthNotes.trim()}>
            Next
          </Button>
        </Stack>
      )}

      {step === 1 && (
        <Stack spacing={2}>
          <Typography level="title-md">Identity</Typography>
          <FormControl required>
            <FormLabel>Tag number</FormLabel>
            <Input value={tagNumber} onChange={(e) => setTagNumber(e.target.value)} />
          </FormControl>
          <FormControl>
            <FormLabel>Name</FormLabel>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </FormControl>
          <FormControl>
            <FormLabel>Colour marking</FormLabel>
            <Input value={colorMarking} onChange={(e) => setColorMarking(e.target.value)} />
          </FormControl>
          <FormControl>
            <FormLabel>Sex</FormLabel>
            <Select value={sex} onChange={(_, v) => setSex(v!)}>
              <Option value="HEN">Hen</Option>
              <Option value="ROOSTER">Rooster</Option>
              <Option value="UNKNOWN">Unknown</Option>
            </Select>
          </FormControl>
          <Textarea placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} minRows={2} />
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={() => setStep(0)}>
              Back
            </Button>
            <Button onClick={() => setStep(2)} disabled={!tagNumber.trim()}>
              Next
            </Button>
          </Stack>
        </Stack>
      )}

      {step === 2 && (
        <Stack spacing={2}>
          <Typography level="title-md">Confirm</Typography>
          <Typography>Tag #{tagNumber} {name && `"${name}"`}</Typography>
          <Typography level="body-sm">{colorMarking}</Typography>
          <Typography level="body-sm">Hatch health: {healthNotes}</Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button color="success" loading={loading} onClick={submit}>
              Add to flock
            </Button>
          </Stack>
        </Stack>
      )}

      {error && <Alert color="danger">{error}</Alert>}
    </Stack>
  );
}
