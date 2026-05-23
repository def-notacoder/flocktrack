import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { resolveHealthRecordPhotoPatch } from "../lib/photos.js";
import { validate, type ValidatedRequest } from "../middleware/validate.js";

export const healthRecordsRouter = Router();

const eventTypes = [
  "HATCH",
  "CHECKUP",
  "ILLNESS",
  "TREATMENT",
  "VACCINATION",
  "INJURY",
  "DEATH",
  "OTHER",
] as const;

const lifeStages = ["CHICK", "JUVENILE", "ADULT"] as const;

const createSchema = z.object({
  body: z.object({
    chickenId: z.string(),
    lifeStage: z.enum(lifeStages).optional(),
    eventType: z.enum(eventTypes),
    observedOn: z.string().optional(),
    symptoms: z.string().optional(),
    treatment: z.string().optional(),
    medication: z.string().optional(),
    followUpOn: z.string().optional(),
    resolved: z.boolean().optional(),
    notes: z.string().optional(),
    photo: z.string().optional(),
  }),
});

const patchSchema = z.object({
  body: z.object({
    lifeStage: z.enum(lifeStages).optional(),
    eventType: z.enum(eventTypes).optional(),
    observedOn: z.string().optional(),
    symptoms: z.string().nullable().optional(),
    treatment: z.string().nullable().optional(),
    medication: z.string().nullable().optional(),
    followUpOn: z.string().nullable().optional(),
    resolved: z.boolean().optional(),
    notes: z.string().nullable().optional(),
    photo: z.string().optional(),
    clearPhoto: z.boolean().optional(),
  }),
});

healthRecordsRouter.get("/", async (req, res, next) => {
  try {
    const chickenId = req.query.chickenId as string | undefined;
    const records = await prisma.healthRecord.findMany({
      where: chickenId ? { chickenId } : undefined,
      include: { chicken: { select: { id: true, tagNumber: true, name: true } } },
      orderBy: { observedOn: "desc" },
      take: 50,
    });
    res.json(records);
  } catch (e) {
    next(e);
  }
});

healthRecordsRouter.post("/", validate(createSchema), async (req, res, next) => {
  try {
    const { body } = (req as ValidatedRequest<z.infer<typeof createSchema>>).validated;
    let record = await prisma.healthRecord.create({
      data: {
        chickenId: body.chickenId,
        lifeStage: body.lifeStage ?? "ADULT",
        eventType: body.eventType,
        observedOn: body.observedOn ? new Date(body.observedOn) : new Date(),
        symptoms: body.symptoms?.trim() || undefined,
        treatment: body.treatment?.trim() || undefined,
        medication: body.medication?.trim() || undefined,
        followUpOn: body.followUpOn ? new Date(body.followUpOn) : undefined,
        resolved: body.resolved ?? false,
        notes: body.notes?.trim() || undefined,
      },
    });
    if (body.photo?.trim()) {
      const photoUrl = await resolveHealthRecordPhotoPatch(record.id, body.photo.trim());
      if (photoUrl) {
        record = await prisma.healthRecord.update({
          where: { id: record.id },
          data: { photoUrl },
        });
      }
    }
    res.status(201).json(record);
  } catch (e) {
    next(e);
  }
});

healthRecordsRouter.patch("/:id", validate(patchSchema), async (req, res, next) => {
  try {
    const existing = await prisma.healthRecord.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: "Record not found" });
      return;
    }
    const { body } = (req as ValidatedRequest<z.infer<typeof patchSchema>>).validated;
    const photoUrl = await resolveHealthRecordPhotoPatch(req.params.id, body.photo, body.clearPhoto);
    const record = await prisma.healthRecord.update({
      where: { id: req.params.id },
      data: {
        lifeStage: body.lifeStage,
        eventType: body.eventType,
        observedOn: body.observedOn ? new Date(body.observedOn) : undefined,
        symptoms: body.symptoms,
        treatment: body.treatment,
        medication: body.medication,
        followUpOn: body.followUpOn ? new Date(body.followUpOn) : body.followUpOn === null ? null : undefined,
        resolved: body.resolved,
        notes: body.notes,
        ...(photoUrl !== undefined ? { photoUrl } : {}),
      },
    });
    res.json(record);
  } catch (e) {
    next(e);
  }
});
