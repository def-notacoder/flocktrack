import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import Typography from "@mui/joy/Typography";
import Button from "@mui/joy/Button";
import Box from "@mui/joy/Box";
import FormControl from "@mui/joy/FormControl";
import FormLabel from "@mui/joy/FormLabel";
import Input from "@mui/joy/Input";
import Select from "@mui/joy/Select";
import Option from "@mui/joy/Option";
import Textarea from "@mui/joy/Textarea";
import Stack from "@mui/joy/Stack";
import Alert from "@mui/joy/Alert";
import Modal from "@mui/joy/Modal";
import ModalDialog from "@mui/joy/ModalDialog";
import DialogTitle from "@mui/joy/DialogTitle";
import DialogContent from "@mui/joy/DialogContent";
import DialogActions from "@mui/joy/DialogActions";
import { PhotoPickerButtons, readImageFileFromInput } from "../components/PhotoPickerButtons";
import { DateInput } from "../components/DateInput";
import { api } from "../api/client";

export default function ChickenFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [tagNumberColour, setTagNumberColour] = useState("");
  const [name, setName] = useState("");
  const [colorMarking, setColorMarking] = useState("");
  const [sex, setSex] = useState("HEN");
  const [poultryLabel, setPoultryLabel] = useState("Chicken");
  const [origin, setOrigin] = useState("PURCHASED");
  const [originDetail, setOriginDetail] = useState("");
  const [acquiredOn, setAcquiredOn] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [healthNote, setHealthNote] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      api.chickens.get(id).then((c) => {
        setTagNumberColour(c.tagNumber);
        setName(c.name ?? "");
        setColorMarking(c.colorMarking ?? "");
        setSex(c.sex);
        setPoultryLabel(c.poultryLabel);
        setNotes(c.notes ?? "");
        setExistingPhotoUrl(c.photoUrl ?? null);
      });
    }
  }, [id]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    readImageFileFromInput(
      e,
      (dataUrl) => {
        setPhotoDataUrl(dataUrl);
        setPhotoRemoved(false);
        setError("");
      },
      (msg) => setError(msg)
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (isEdit && id) {
        await api.chickens.patch(id, {
          tagNumber: tagNumberColour,
          name,
          colorMarking,
          sex,
          poultryLabel,
          notes,
          ...(photoDataUrl ? { photo: photoDataUrl } : photoRemoved ? { clearPhoto: true } : {}),
        });
        navigate(`/birds/${id}`);
      } else {
        if (origin === "OTHER" && !originDetail.trim()) {
          setError("Describe the origin when Other is selected");
          setLoading(false);
          return;
        }
        if (!tagNumberColour.trim()) {
          setError("Tag number/colour is required");
          setLoading(false);
          return;
        }
        const chicken = await api.chickens.create({
          origin,
          originDetail: origin === "OTHER" ? originDetail.trim() : undefined,
          poultryLabel,
          tagNumber: tagNumberColour.trim(),
          name: name || undefined,
          sex,
          acquiredOn,
          notes: notes || undefined,
          photo: photoDataUrl ?? undefined,
          initialHealth: healthNote ? { notes: healthNote } : undefined,
        });
        navigate(`/birds/${chicken.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const previewPhotoUrl = photoDataUrl ?? (photoRemoved ? null : existingPhotoUrl);

  const confirmDeleteBird = async () => {
    if (!id) return;
    setDeleting(true);
    setError("");
    try {
      await api.chickens.delete(id);
      navigate("/birds");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete bird");
    } finally {
      setDeleting(false);
      setConfirmDeleteOpen(false);
    }
  };

  return (
    <Stack spacing={2} component="form" onSubmit={submit}>
      {isEdit && id && (
        <Button component={Link} to={`/birds/${id}`} variant="plain" size="sm" sx={{ alignSelf: "flex-start", px: 0 }}>
          ← Bird
        </Button>
      )}
      <Typography level="h3">{isEdit ? "Edit bird" : "Add bird"}</Typography>
      {!isEdit && (
        <Typography level="body-sm">
          Add a purchased or adult bird without going through the incubator.
        </Typography>
      )}

      {!isEdit && (
        <FormControl>
          <FormLabel>Origin</FormLabel>
          <Select
            value={origin}
            onChange={(_, v) => {
              if (v) {
                setOrigin(v);
                if (v !== "OTHER") setOriginDetail("");
              }
            }}
          >
            <Option value="PURCHASED">Purchased</Option>
            <Option value="HATCHED_ELSEWHERE">Hatched elsewhere</Option>
            <Option value="OTHER">Other</Option>
          </Select>
        </FormControl>
      )}

      {!isEdit && origin === "OTHER" && (
        <FormControl required>
          <FormLabel>Describe origin</FormLabel>
          <Input
            placeholder="e.g. Gift from neighbor, rescue, trade…"
            value={originDetail}
            onChange={(e) => setOriginDetail(e.target.value)}
          />
        </FormControl>
      )}

      {isEdit ? (
        <>
          <FormControl required>
            <FormLabel>Tag number</FormLabel>
            <Input value={tagNumberColour} onChange={(e) => setTagNumberColour(e.target.value)} />
          </FormControl>
          <FormControl>
            <FormLabel>Colour marking</FormLabel>
            <Input value={colorMarking} onChange={(e) => setColorMarking(e.target.value)} />
          </FormControl>
        </>
      ) : (
        <FormControl required>
          <FormLabel>Tag number/colour</FormLabel>
          <Input
            placeholder="e.g. 12 · red band"
            value={tagNumberColour}
            onChange={(e) => setTagNumberColour(e.target.value)}
          />
        </FormControl>
      )}
      <FormControl>
        <FormLabel>Photo</FormLabel>
        <Stack spacing={1}>
          <PhotoPickerButtons hasPhoto={Boolean(previewPhotoUrl)} onChange={handlePhotoChange} size="md" />
          {previewPhotoUrl && (
            <Stack spacing={0.5} alignItems="flex-start">
              <Box
                component="img"
                src={previewPhotoUrl}
                alt="Bird preview"
                sx={{
                  maxWidth: "100%",
                  maxHeight: 220,
                  borderRadius: "md",
                  objectFit: "cover",
                }}
              />
              <Button
                size="sm"
                variant="plain"
                onClick={() => {
                  setPhotoDataUrl(null);
                  setPhotoRemoved(true);
                }}
              >
                Remove photo
              </Button>
            </Stack>
          )}
        </Stack>
      </FormControl>
      <FormControl>
        <FormLabel>Name</FormLabel>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </FormControl>
      <FormControl>
        <FormLabel>Poultry type</FormLabel>
        <Input value={poultryLabel} onChange={(e) => setPoultryLabel(e.target.value)} />
      </FormControl>
      <FormControl>
        <FormLabel>Sex</FormLabel>
        <Select value={sex} onChange={(_, v) => setSex(v!)}>
          <Option value="HEN">Hen</Option>
          <Option value="ROOSTER">Rooster</Option>
          <Option value="UNKNOWN">Unknown</Option>
        </Select>
      </FormControl>
      {!isEdit && (
        <FormControl required>
          <FormLabel>Acquired date</FormLabel>
          <DateInput value={acquiredOn} onChange={(e) => setAcquiredOn(e.target.value)} />
        </FormControl>
      )}
      <Textarea placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} minRows={2} />
      {!isEdit && (
        <Textarea
          placeholder="Initial health note (optional)"
          value={healthNote}
          onChange={(e) => setHealthNote(e.target.value)}
          minRows={2}
        />
      )}

      {error && <Alert color="danger">{error}</Alert>}
      <Button type="submit" loading={loading} size="lg">
        {isEdit ? "Save" : "Add to flock"}
      </Button>
      {!isEdit ? (
        <Button component={Link} to="/birds" variant="plain">
          Cancel
        </Button>
      ) : (
        <>
          <Button component={Link} to={`/birds/${id}`} variant="plain">
            Cancel
          </Button>
          <Button
            type="button"
            variant="soft"
            color="danger"
            onClick={() => setConfirmDeleteOpen(true)}
          >
            Delete bird
          </Button>
        </>
      )}

      <Modal open={confirmDeleteOpen} onClose={() => !deleting && setConfirmDeleteOpen(false)}>
        <ModalDialog variant="outlined" role="alertdialog" aria-labelledby="delete-bird-title">
          <DialogTitle id="delete-bird-title">Delete bird?</DialogTitle>
          <DialogContent>
            Permanently delete #{tagNumberColour}
            {name ? ` ${name}` : ""}? Health logs and photos will be removed. Egg collection
            entries will be kept without a linked hen. This cannot be undone.
          </DialogContent>
          <DialogActions>
            <Button
              variant="plain"
              color="neutral"
              disabled={deleting}
              onClick={() => setConfirmDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="solid" color="danger" loading={deleting} onClick={confirmDeleteBird}>
              Delete bird
            </Button>
          </DialogActions>
        </ModalDialog>
      </Modal>
    </Stack>
  );
}
