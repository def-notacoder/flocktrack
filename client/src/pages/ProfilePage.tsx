import { useCallback, useEffect, useState } from "react";
import Typography from "@mui/joy/Typography";
import Card from "@mui/joy/Card";
import CardContent from "@mui/joy/CardContent";
import Stack from "@mui/joy/Stack";
import FormControl from "@mui/joy/FormControl";
import FormLabel from "@mui/joy/FormLabel";
import Input from "@mui/joy/Input";
import Textarea from "@mui/joy/Textarea";
import Button from "@mui/joy/Button";
import Alert from "@mui/joy/Alert";
import CircularProgress from "@mui/joy/CircularProgress";
import { api } from "../api/client";
import { ProfileRemindersSection } from "../components/Reminders";

export default function ProfilePage() {
  const [ownerName, setOwnerName] = useState("");
  const [farmName, setFarmName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.profile
      .get()
      .then((profile) => {
        setOwnerName(profile.ownerName ?? "");
        setFarmName(profile.farmName ?? "");
        setDescription(profile.description ?? "");
        setLocation(profile.location ?? "");
        setEmail(profile.email ?? "");
        setPhone(profile.phone ?? "");
        setError("");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await api.profile.update({
        ownerName: ownerName.trim() || null,
        farmName: farmName.trim() || null,
        description: description.trim() || null,
        location: location.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Stack spacing={2}>
        <Typography level="title-lg">Profile</Typography>
        <CircularProgress />
        <ProfileRemindersSection />
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      <Typography level="title-lg">Profile</Typography>

      <Stack spacing={2} component="form" onSubmit={submit}>
        <Card variant="outlined">
          <CardContent>
          <Stack spacing={2}>
            <FormControl>
              <FormLabel>Your name</FormLabel>
              <Input
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Jane Smith"
              />
            </FormControl>
            <FormControl>
              <FormLabel>Farm name</FormLabel>
              <Input
                value={farmName}
                onChange={(e) => setFarmName(e.target.value)}
                placeholder="Sunny Side Poultry"
              />
            </FormControl>
            <FormControl>
              <FormLabel>Description</FormLabel>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A few words about your flock, breeds, or goals"
                minRows={3}
              />
            </FormControl>
            <FormControl>
              <FormLabel>Location</FormLabel>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Town, state / region"
              />
            </FormControl>
            <FormControl>
              <FormLabel>Email</FormLabel>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </FormControl>
            <FormControl>
              <FormLabel>Phone</FormLabel>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Optional contact number"
              />
            </FormControl>
          </Stack>
          </CardContent>
        </Card>

        {error && <Alert color="danger">{error}</Alert>}
        {saved && <Alert color="success">Profile saved.</Alert>}
        <Button type="submit" loading={saving} size="lg">
          Save profile
        </Button>
      </Stack>

      <ProfileRemindersSection />
    </Stack>
  );
}
