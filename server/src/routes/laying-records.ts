import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { resolveLogPhotoPatch } from "../lib/photos.js";
import { validate, type ValidatedRequest } from "../middleware/validate.js";

export const layingRecordsRouter = Router();

const createSchema = z.object({
  body: z.object({
    chickenId: z.string().optional(),
    recordedOn: z.string(),
    count: z.number().int().min(1),
    location: z.string().optional(),
    notes: z.string().optional(),
    photo: z.string().optional(),
  }),
});

const patchSchema = z.object({
  body: z.object({
    chickenId: z.string().nullable().optional(),
    recordedOn: z.string().optional(),
    count: z.number().int().min(1).optional(),
    location: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    photo: z.string().optional(),
    clearPhoto: z.boolean().optional(),
  }),
});

const recordInclude = {
  chicken: { select: { tagNumber: true, name: true } },
} as const;

layingRecordsRouter.get("/", async (req, res, next) => {
  try {
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const records = await prisma.layingRecord.findMany({
      where: {
        ...(from || to
          ? {
              recordedOn: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      include: recordInclude,
      orderBy: [{ recordedOn: "desc" }, { createdAt: "desc" }],
      take: 100,
    });
    res.json(records);
  } catch (e) {
    next(e);
  }
});

layingRecordsRouter.post("/", validate(createSchema), async (req, res, next) => {
  try {
    const { body } = (req as ValidatedRequest<z.infer<typeof createSchema>>).validated;
    let record = await prisma.layingRecord.create({
      data: {
        chickenId: body.chickenId,
        recordedOn: new Date(body.recordedOn),
        count: body.count,
        location: body.location,
        notes: body.notes,
      },
      include: recordInclude,
    });
    if (body.photo?.trim()) {
      const photoUrl = await resolveLogPhotoPatch(record.id, body.photo.trim());
      if (photoUrl) {
        record = await prisma.layingRecord.update({
          where: { id: record.id },
          data: { photoUrl },
          include: recordInclude,
        });
      }
    }
    res.status(201).json(record);
  } catch (e) {
    next(e);
  }
});

layingRecordsRouter.patch("/:id", validate(patchSchema), async (req, res, next) => {
  try {
    const existing = await prisma.layingRecord.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: "Record not found" });
      return;
    }
    const { body } = (req as ValidatedRequest<z.infer<typeof patchSchema>>).validated;
    const photoUrl = await resolveLogPhotoPatch(req.params.id, body.photo, body.clearPhoto);
    const record = await prisma.layingRecord.update({
      where: { id: req.params.id },
      data: {
        chickenId: body.chickenId,
        recordedOn: body.recordedOn ? new Date(body.recordedOn) : undefined,
        count: body.count,
        location: body.location,
        notes: body.notes,
        ...(photoUrl !== undefined ? { photoUrl } : {}),
      },
      include: recordInclude,
    });
    res.json(record);
  } catch (e) {
    next(e);
  }
});
