import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { resolveLogPhotoPatch } from "../lib/photos.js";
import { validate, type ValidatedRequest } from "../middleware/validate.js";

export const hatchEggNotesRouter = Router({ mergeParams: true });

const noteSchema = z.object({
  body: z.object({
    body: z.string().min(1).max(5000),
    loggedAt: z.string().optional(),
    photo: z.string().optional(),
  }),
});

const patchNoteSchema = z.object({
  body: z.object({
    body: z.string().min(1).max(5000).optional(),
    loggedAt: z.string().optional(),
    photo: z.string().optional(),
    clearPhoto: z.boolean().optional(),
  }),
});

async function assertEgg(hatchId: string, eggId: string) {
  const egg = await prisma.hatchEgg.findFirst({ where: { id: eggId, hatchId } });
  if (!egg) return null;
  return egg;
}

hatchEggNotesRouter.get("/:eggId/notes", async (req, res, next) => {
  try {
    const { id: hatchId, eggId } = req.params as { id: string; eggId: string };
    const egg = await prisma.hatchEgg.findFirst({ where: { id: eggId, hatchId } });
    if (!egg) {
      res.status(404).json({ error: "Egg not found" });
      return;
    }
    const notes = await prisma.hatchEggNote.findMany({
      where: { hatchEggId: eggId },
      orderBy: { loggedAt: "desc" },
    });
    res.json(notes);
  } catch (e) {
    next(e);
  }
});

hatchEggNotesRouter.post("/:eggId/notes", validate(noteSchema), async (req, res, next) => {
  try {
    const { id: hatchId, eggId } = req.params as { id: string; eggId: string };
    if (!(await assertEgg(hatchId, eggId))) {
      res.status(404).json({ error: "Egg not found" });
      return;
    }
    const { body } = (req as ValidatedRequest<z.infer<typeof noteSchema>>).validated;
    let note = await prisma.hatchEggNote.create({
      data: {
        hatchEggId: eggId,
        body: body.body.trim(),
        loggedAt: body.loggedAt ? new Date(body.loggedAt) : new Date(),
      },
    });
    if (body.photo?.trim()) {
      const photoUrl = await resolveLogPhotoPatch(note.id, body.photo.trim());
      if (photoUrl) {
        note = await prisma.hatchEggNote.update({
          where: { id: note.id },
          data: { photoUrl },
        });
      }
    }
    res.status(201).json(note);
  } catch (e) {
    next(e);
  }
});

hatchEggNotesRouter.patch("/:eggId/notes/:noteId", validate(patchNoteSchema), async (req, res, next) => {
  try {
    const { id: hatchId, eggId, noteId } = req.params as {
      id: string;
      eggId: string;
      noteId: string;
    };
    if (!(await assertEgg(hatchId, eggId))) {
      res.status(404).json({ error: "Egg not found" });
      return;
    }
    const existing = await prisma.hatchEggNote.findFirst({
      where: { id: noteId, hatchEggId: eggId },
    });
    if (!existing) {
      res.status(404).json({ error: "Note not found" });
      return;
    }
    const { body } = (req as ValidatedRequest<z.infer<typeof patchNoteSchema>>).validated;
    const photoUrl = await resolveLogPhotoPatch(noteId, body.photo, body.clearPhoto);
    const note = await prisma.hatchEggNote.update({
      where: { id: noteId },
      data: {
        body: body.body?.trim(),
        loggedAt: body.loggedAt ? new Date(body.loggedAt) : undefined,
        ...(photoUrl !== undefined ? { photoUrl } : {}),
      },
    });
    res.json(note);
  } catch (e) {
    next(e);
  }
});
