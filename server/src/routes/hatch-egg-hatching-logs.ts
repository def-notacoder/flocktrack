import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { resolveLogPhotoPatch } from "../lib/photos.js";
import { validate, type ValidatedRequest } from "../middleware/validate.js";

export const hatchEggHatchingLogsRouter = Router({ mergeParams: true });

const hatchingLogSchema = z.object({
  body: z.object({
    stage: z.enum([
      "PIPPED",
      "ZIPPED",
      "HATCHED",
      "DRYING",
      "ASSISTED",
      "STUCK",
      "DIED_IN_SHELL",
      "OTHER",
    ]),
    hatchingDay: z.number().int().optional(),
    chickHealth: z
      .enum(["STRONG", "WEAK", "NAVAL_ISSUE", "SPLAY_LEG", "INJURY", "UNKNOWN"])
      .optional(),
    notes: z.string().optional(),
    loggedAt: z.string().optional(),
    photo: z.string().optional(),
  }),
});

const patchHatchingLogSchema = z.object({
  body: z.object({
    stage: z
      .enum(["PIPPED", "ZIPPED", "HATCHED", "DRYING", "ASSISTED", "STUCK", "DIED_IN_SHELL", "OTHER"])
      .optional(),
    hatchingDay: z.number().int().nullable().optional(),
    chickHealth: z
      .enum(["STRONG", "WEAK", "NAVAL_ISSUE", "SPLAY_LEG", "INJURY", "UNKNOWN"])
      .nullable()
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

hatchEggHatchingLogsRouter.get("/:eggId/hatching-logs", async (req, res, next) => {
  try {
    const logs = await prisma.hatchEggHatchingLog.findMany({
      where: { hatchEggId: req.params.eggId },
      orderBy: { loggedAt: "desc" },
    });
    res.json(logs);
  } catch (e) {
    next(e);
  }
});

hatchEggHatchingLogsRouter.post(
  "/:eggId/hatching-logs",
  validate(hatchingLogSchema),
  async (req, res, next) => {
    try {
      const { id: hatchId, eggId } = req.params as { id: string; eggId: string };
      if (!(await assertEgg(hatchId, eggId))) {
        res.status(404).json({ error: "Egg not found" });
        return;
      }
      const { body } = (req as ValidatedRequest<z.infer<typeof hatchingLogSchema>>)
        .validated;
      let log = await prisma.hatchEggHatchingLog.create({
        data: {
          hatchEggId: req.params.eggId,
          stage: body.stage,
          hatchingDay: body.hatchingDay,
          chickHealth: body.chickHealth,
          notes: body.notes,
          loggedAt: body.loggedAt ? new Date(body.loggedAt) : new Date(),
        },
      });
      if (body.photo?.trim()) {
        const photoUrl = await resolveLogPhotoPatch(log.id, body.photo.trim());
        if (photoUrl) {
          log = await prisma.hatchEggHatchingLog.update({
            where: { id: log.id },
            data: { photoUrl },
          });
        }
      }
      if (body.stage === "HATCHED") {
        await prisma.hatchEgg.update({
          where: { id: req.params.eggId },
          data: { status: "HATCHED" },
        });
      } else if (body.stage === "DIED_IN_SHELL") {
        await prisma.hatchEgg.update({
          where: { id: req.params.eggId },
          data: { status: "FAILED_HATCH" },
        });
      }
      if (body.notes?.trim()) {
        await prisma.hatchEggNote.create({
          data: {
            hatchEggId: eggId,
            body: `${body.stage.replace(/_/g, " ")}: ${body.notes.trim()}`,
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

hatchEggHatchingLogsRouter.patch(
  "/:eggId/hatching-logs/:logId",
  validate(patchHatchingLogSchema),
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
      const existing = await prisma.hatchEggHatchingLog.findFirst({
        where: { id: logId, hatchEggId: eggId },
      });
      if (!existing) {
        res.status(404).json({ error: "Log not found" });
        return;
      }
      const { body } = (req as ValidatedRequest<z.infer<typeof patchHatchingLogSchema>>).validated;
      const photoUrl = await resolveLogPhotoPatch(logId, body.photo, body.clearPhoto);
      const log = await prisma.hatchEggHatchingLog.update({
        where: { id: logId },
        data: {
          stage: body.stage,
          hatchingDay: body.hatchingDay,
          chickHealth: body.chickHealth,
          notes: body.notes,
          loggedAt: body.loggedAt ? new Date(body.loggedAt) : undefined,
          ...(photoUrl !== undefined ? { photoUrl } : {}),
        },
      });
      if (body.stage === "HATCHED") {
        await prisma.hatchEgg.update({
          where: { id: eggId },
          data: { status: "HATCHED" },
        });
      } else if (body.stage === "DIED_IN_SHELL") {
        await prisma.hatchEgg.update({
          where: { id: eggId },
          data: { status: "FAILED_HATCH" },
        });
      }
      res.json(log);
    } catch (e) {
      next(e);
    }
  }
);
