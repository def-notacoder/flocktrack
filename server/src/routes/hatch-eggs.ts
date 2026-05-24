import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { validate, type ValidatedRequest } from "../middleware/validate.js";

export const hatchEggsRouter = Router({ mergeParams: true });

const eggStatuses = [
  "INCUBATING",
  "LOCKDOWN",
  "HATCHING",
  "HATCHED",
  "NOT_VIABLE",
  "FAILED_HATCH",
  "DISCARDED",
] as const;

const createEggSchema = z.object({
  body: z.union([
    z.object({
      count: z.number().int().min(1).max(200),
    }),
    z.object({
      eggNumber: z.number().int().min(1).optional(),
      label: z.string().optional(),
      source: z.string().optional(),
      shellMarking: z.string().optional(),
      notes: z.string().optional(),
      status: z.enum(eggStatuses).optional(),
    }),
  ]),
});

const patchEggSchema = z.object({
  body: z.object({
    eggNumber: z.coerce.number().int().min(1).optional(),
    label: z.string().nullable().optional(),
    source: z.string().nullable().optional(),
    shellMarking: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    status: z.enum(eggStatuses).optional(),
  }),
});

hatchEggsRouter.get("/", async (req, res, next) => {
  try {
    const { id: hatchId } = req.params as { id: string };
    const archivedFilter = req.query.archived;
    const where =
      archivedFilter === "all"
        ? { hatchId }
        : {
            hatchId,
            archivedAt: archivedFilter === "true" ? { not: null } : null,
          };
    const eggs = await prisma.hatchEgg.findMany({
      where,
      orderBy: { eggNumber: "asc" },
      include: {
        incubationLogs: { orderBy: { loggedAt: "desc" }, take: 1 },
        hatchingLogs: { orderBy: { loggedAt: "desc" }, take: 1 },
        noteLog: { orderBy: { loggedAt: "desc" }, take: 1 },
        hatchedChicken: { select: { id: true, tagNumber: true, name: true } },
      },
    });
    res.json(eggs);
  } catch (e) {
    next(e);
  }
});

hatchEggsRouter.post("/", validate(createEggSchema), async (req, res, next) => {
  try {
    const { id: hatchId } = req.params as { id: string };
    const { body } = (req as ValidatedRequest<z.infer<typeof createEggSchema>>).validated;

    if ("count" in body) {
      const existing = await prisma.hatchEgg.count({ where: { hatchId } });
      const eggs = await prisma.$transaction(
        Array.from({ length: body.count }, (_, i) =>
          prisma.hatchEgg.create({
            data: { hatchId, eggNumber: existing + i + 1 },
          })
        )
      );
      res.status(201).json(eggs);
      return;
    }

    const existing = await prisma.hatchEgg.count({ where: { hatchId } });
    const eggNumber = body.eggNumber ?? existing + 1;
    const egg = await prisma.hatchEgg.create({
      data: {
        hatchId,
        eggNumber,
        label: body.label,
        source: body.source,
        shellMarking: body.shellMarking,
        status: body.status ?? "INCUBATING",
        ...(body.notes
          ? { noteLog: { create: { body: body.notes.trim() } } }
          : {}),
      },
      include: { noteLog: { orderBy: { loggedAt: "desc" } } },
    });
    res.status(201).json(egg);
  } catch (e) {
    next(e);
  }
});

hatchEggsRouter.get("/:eggId", async (req, res, next) => {
  try {
    const { id: hatchId, eggId } = req.params as { id: string; eggId: string };
    const egg = await prisma.hatchEgg.findFirst({
      where: { id: eggId, hatchId },
      include: {
        hatch: true,
        incubationLogs: { orderBy: { loggedAt: "desc" } },
        hatchingLogs: { orderBy: { loggedAt: "desc" } },
        noteLog: { orderBy: { loggedAt: "desc" }, take: 1 },
        hatchedChicken: { select: { id: true, tagNumber: true, name: true } },
      },
    });
    if (!egg) {
      res.status(404).json({ error: "Egg not found" });
      return;
    }
    res.json(egg);
  } catch (e) {
    next(e);
  }
});

hatchEggsRouter.patch("/:eggId", validate(patchEggSchema), async (req, res, next) => {
  try {
    const { id: hatchId, eggId } = req.params as { id: string; eggId: string };
    const existing = await prisma.hatchEgg.findFirst({ where: { id: eggId, hatchId } });
    if (!existing) {
      res.status(404).json({ error: "Egg not found" });
      return;
    }
    const { body } = (req as ValidatedRequest<z.infer<typeof patchEggSchema>>).validated;
    const data: {
      eggNumber?: number;
      label?: string | null;
      source?: string | null;
      shellMarking?: string | null;
      notes?: string | null;
      status?: (typeof eggStatuses)[number];
    } = {};
    if (body.eggNumber !== undefined) data.eggNumber = body.eggNumber;
    if (body.label !== undefined) data.label = body.label;
    if (body.source !== undefined) data.source = body.source;
    if (body.shellMarking !== undefined) data.shellMarking = body.shellMarking;
    if (body.notes !== undefined) data.notes = body.notes;
    if (body.status !== undefined) data.status = body.status;

    const egg = await prisma.hatchEgg.update({
      where: { id: eggId },
      data,
      include: {
        hatch: true,
        incubationLogs: { orderBy: { loggedAt: "desc" } },
        hatchingLogs: { orderBy: { loggedAt: "desc" } },
        noteLog: { orderBy: { loggedAt: "desc" }, take: 1 },
        hatchedChicken: { select: { id: true, tagNumber: true, name: true } },
      },
    });
    res.json(egg);
  } catch (e) {
    next(e);
  }
});

hatchEggsRouter.post("/:eggId/archive", async (req, res, next) => {
  try {
    const { id: hatchId, eggId } = req.params as { id: string; eggId: string };
    const existing = await prisma.hatchEgg.findFirst({ where: { id: eggId, hatchId } });
    if (!existing) {
      res.status(404).json({ error: "Egg not found" });
      return;
    }
    if (existing.archivedAt) {
      res.status(409).json({ error: "Egg is already archived" });
      return;
    }
    const egg = await prisma.hatchEgg.update({
      where: { id: eggId },
      data: { archivedAt: new Date() },
      include: {
        incubationLogs: { orderBy: { loggedAt: "desc" }, take: 1 },
        hatchingLogs: { orderBy: { loggedAt: "desc" }, take: 1 },
        hatchedChicken: { select: { id: true, tagNumber: true, name: true } },
      },
    });
    res.json(egg);
  } catch (e) {
    next(e);
  }
});

hatchEggsRouter.post("/:eggId/unarchive", async (req, res, next) => {
  try {
    const { id: hatchId, eggId } = req.params as { id: string; eggId: string };
    const existing = await prisma.hatchEgg.findFirst({ where: { id: eggId, hatchId } });
    if (!existing) {
      res.status(404).json({ error: "Egg not found" });
      return;
    }
    if (!existing.archivedAt) {
      res.status(409).json({ error: "Egg is not archived" });
      return;
    }
    const egg = await prisma.hatchEgg.update({
      where: { id: eggId },
      data: { archivedAt: null },
      include: {
        incubationLogs: { orderBy: { loggedAt: "desc" }, take: 1 },
        hatchingLogs: { orderBy: { loggedAt: "desc" }, take: 1 },
        hatchedChicken: { select: { id: true, tagNumber: true, name: true } },
      },
    });
    res.json(egg);
  } catch (e) {
    next(e);
  }
});

hatchEggsRouter.delete("/:eggId", async (req, res, next) => {
  try {
    const { id: hatchId, eggId } = req.params as { id: string; eggId: string };
    const existing = await prisma.hatchEgg.findFirst({
      where: { id: eggId, hatchId },
      include: { hatchedChicken: true },
    });
    if (!existing) {
      res.status(404).json({ error: "Egg not found" });
      return;
    }
    if (existing.hatchedChicken) {
      res.status(409).json({ error: "Cannot remove an egg linked to a registered bird" });
      return;
    }
    await prisma.hatchEgg.delete({ where: { id: eggId } });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});
