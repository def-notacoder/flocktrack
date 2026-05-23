import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { resolveLogPhotoPatch } from "../lib/photos.js";
import { validate, type ValidatedRequest } from "../middleware/validate.js";

export const hatchEggLogsRouter = Router({ mergeParams: true });

const logSchema = z.object({
  body: z.object({
    incubationDay: z.number().int().min(1),
    assessment: z.enum([
      "DEVELOPING_WELL",
      "STALLED",
      "INFERTILE",
      "BLOOD_RING",
      "DEAD_EMBRYO",
      "UNKNOWN",
    ]),
    notes: z.string().optional(),
    loggedAt: z.string().optional(),
    photo: z.string().optional(),
  }),
});

const patchLogSchema = z.object({
  body: z.object({
    incubationDay: z.number().int().min(1).optional(),
    assessment: z
      .enum(["DEVELOPING_WELL", "STALLED", "INFERTILE", "BLOOD_RING", "DEAD_EMBRYO", "UNKNOWN"])
      .optional(),
    notes: z.string().nullable().optional(),
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

hatchEggLogsRouter.get("/:eggId/logs", async (req, res, next) => {
  try {
    const logs = await prisma.hatchEggLog.findMany({
      where: { hatchEggId: req.params.eggId },
      orderBy: { loggedAt: "desc" },
    });
    res.json(logs);
  } catch (e) {
    next(e);
  }
});

hatchEggLogsRouter.post(
  "/:eggId/logs",
  validate(logSchema),
  async (req, res, next) => {
    try {
      const { id: hatchId, eggId } = req.params as { id: string; eggId: string };
      if (!(await assertEgg(hatchId, eggId))) {
        res.status(404).json({ error: "Egg not found" });
        return;
      }
      const { body } = (req as ValidatedRequest<z.infer<typeof logSchema>>).validated;
      let log = await prisma.hatchEggLog.create({
        data: {
          hatchEggId: req.params.eggId,
          incubationDay: body.incubationDay,
          assessment: body.assessment,
          notes: body.notes,
          loggedAt: body.loggedAt ? new Date(body.loggedAt) : new Date(),
        },
      });
      if (body.photo?.trim()) {
        const photoUrl = await resolveLogPhotoPatch(log.id, body.photo.trim());
        if (photoUrl) {
          log = await prisma.hatchEggLog.update({
            where: { id: log.id },
            data: { photoUrl },
          });
        }
      }
      if (body.notes) {
        await prisma.hatchEggNote.create({
          data: {
            hatchEggId: req.params.eggId,
            body: `Day ${body.incubationDay} — ${body.notes}`,
            loggedAt: body.loggedAt ? new Date(body.loggedAt) : new Date(),
          },
        });
      }
      res.status(201).json(log);
    } catch (e) {
      next(e);
    }
  }
);

hatchEggLogsRouter.patch(
  "/:eggId/logs/:logId",
  validate(patchLogSchema),
  async (req, res, next) => {
    try {
      const { id: hatchId, eggId, logId } = req.params as {
        id: string;
        eggId: string;
        logId: string;
      };
      if (!(await assertEgg(hatchId, eggId))) {
        res.status(404).json({ error: "Egg not found" });
        return;
      }
      const existing = await prisma.hatchEggLog.findFirst({
        where: { id: logId, hatchEggId: eggId },
      });
      if (!existing) {
        res.status(404).json({ error: "Log not found" });
        return;
      }
      const { body } = (req as ValidatedRequest<z.infer<typeof patchLogSchema>>).validated;
      const photoUrl = await resolveLogPhotoPatch(logId, body.photo, body.clearPhoto);
      const log = await prisma.hatchEggLog.update({
        where: { id: logId },
        data: {
          incubationDay: body.incubationDay,
          assessment: body.assessment,
          notes: body.notes,
          loggedAt: body.loggedAt ? new Date(body.loggedAt) : undefined,
          ...(photoUrl !== undefined ? { photoUrl } : {}),
        },
      });
      res.json(log);
    } catch (e) {
      next(e);
    }
  }
);
