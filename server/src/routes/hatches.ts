import { Router } from "express";
import { z } from "zod";
import { HatchStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { enrichHatch, addDays, incubationDay, setDateForIncubationDay } from "../lib/incubation.js";
import { syncHatchReminders } from "../lib/hatch-reminders.js";
import { validate, type ValidatedRequest } from "../middleware/validate.js";

export const hatchesRouter = Router();

const createHatchSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    poultryLabel: z.string().min(1),
    presetId: z.string().optional(),
    incubationDays: z.number().int().min(1),
    lockdownDay: z.number().int().min(1),
    setDate: z.string(),
    breed: z.string().optional(),
    source: z.string().optional(),
    notes: z.string().optional(),
    eggCount: z.number().int().min(0).max(200).default(0),
  }),
});

hatchesRouter.get("/", async (req, res, next) => {
  try {
    const status = req.query.status as string | undefined;
    const archived = req.query.archived === "true";
    const hatches = await prisma.hatch.findMany({
      where: {
        archivedAt: archived ? { not: null } : null,
        ...(status ? { status: status as never } : {}),
      },
      include: { _count: { select: { eggs: { where: { archivedAt: null } } } } },
      orderBy: { setDate: "desc" },
    });
    res.json(hatches.map((h) => enrichHatch(h)));
  } catch (e) {
    next(e);
  }
});

hatchesRouter.post("/", validate(createHatchSchema), async (req, res, next) => {
  try {
    const { body } = (req as ValidatedRequest<z.infer<typeof createHatchSchema>>).validated;
    if (body.lockdownDay >= body.incubationDays) {
      res.status(400).json({ error: "Lockdown day must be before hatch day" });
      return;
    }
    const setDate = new Date(body.setDate);
    const hatch = await prisma.hatch.create({
      data: {
        name: body.name,
        poultryLabel: body.poultryLabel,
        presetId: body.presetId,
        incubationDays: body.incubationDays,
        lockdownDay: body.lockdownDay,
        setDate,
        expectedHatchDate: addDays(setDate, body.incubationDays - 1),
        breed: body.breed,
        source: body.source,
        notes: body.notes,
        eggs:
          body.eggCount > 0
            ? {
                create: Array.from({ length: body.eggCount }, (_, i) => ({
                  eggNumber: i + 1,
                })),
              }
            : undefined,
        events: { create: { eventType: "SET", incubationDay: 0, notes: "Eggs set" } },
      },
      include: {
        eggs: {
          include: {
            incubationLogs: { orderBy: { loggedAt: "desc" }, take: 1 },
            hatchingLogs: { orderBy: { loggedAt: "desc" }, take: 1 },
          },
        },
        events: true,
      },
    });
    await syncHatchReminders(hatch);
    res.status(201).json(enrichHatch(hatch));
  } catch (e) {
    next(e);
  }
});

hatchesRouter.get("/:id", async (req, res, next) => {
  try {
    const hatch = await prisma.hatch.findUnique({
      where: { id: req.params.id },
      include: {
        eggs: {
          where: { archivedAt: null },
          orderBy: { eggNumber: "asc" },
          include: {
            incubationLogs: { orderBy: { loggedAt: "desc" }, take: 1 },
            hatchingLogs: { orderBy: { loggedAt: "desc" }, take: 1 },
            hatchedChicken: { select: { id: true, tagNumber: true, name: true } },
          },
        },
        events: { orderBy: { occurredAt: "asc" } },
      },
    });
    if (!hatch) {
      res.status(404).json({ error: "Hatch not found" });
      return;
    }
    res.json(enrichHatch(hatch));
  } catch (e) {
    next(e);
  }
});

hatchesRouter.patch("/:id", async (req, res, next) => {
  try {
    const hatch = await prisma.hatch.update({
      where: { id: req.params.id },
      data: req.body,
      include: { eggs: true, events: true },
    });
    res.json(enrichHatch(hatch));
  } catch (e) {
    next(e);
  }
});

const setDaySchema = z.object({
  body: z.object({
    incubationDay: z.number().int().min(1),
  }),
});

hatchesRouter.patch("/:id/day", validate(setDaySchema), async (req, res, next) => {
  try {
    const hatch = await prisma.hatch.findUnique({ where: { id: req.params.id } });
    if (!hatch) {
      res.status(404).json({ error: "Hatch not found" });
      return;
    }
    if (hatch.archivedAt) {
      res.status(400).json({ error: "Cannot edit an archived hatch" });
      return;
    }
    const { body } = (req as ValidatedRequest<z.infer<typeof setDaySchema>>).validated;
    const previousDay = incubationDay(hatch.setDate);
    if (body.incubationDay === previousDay) {
      const current = await prisma.hatch.findUnique({
        where: { id: req.params.id },
        include: { eggs: true, events: true },
      });
      res.json(enrichHatch(current!));
      return;
    }
    const newSetDate = setDateForIncubationDay(body.incubationDay);
    await prisma.hatch.update({
      where: { id: req.params.id },
      data: {
        setDate: newSetDate,
        expectedHatchDate: addDays(newSetDate, hatch.incubationDays - 1),
      },
    });
    await logHatchEvent(
      req.params.id,
      "OTHER",
      `Incubation day adjusted from ${previousDay} to ${body.incubationDay}`,
      newSetDate,
      body.incubationDay
    );
    const refreshed = await prisma.hatch.findUnique({
      where: { id: req.params.id },
      include: { eggs: true, events: { orderBy: { occurredAt: "asc" } } },
    });
    await syncHatchReminders(refreshed!);
    res.json(enrichHatch(refreshed!));
  } catch (e) {
    next(e);
  }
});

const hatchStageSchema = z.object({
  body: z.object({
    stage: z.enum(["LOCKDOWN", "HATCHING", "COMPLETED", "CANCELLED"]),
  }),
});

const stageRank: Record<string, number> = {
  INCUBATING: 0,
  LOCKDOWN: 1,
  HATCHING: 2,
  COMPLETED: 3,
  CANCELLED: 3,
};

const previousStage: Record<string, string | null> = {
  LOCKDOWN: "INCUBATING",
  HATCHING: "LOCKDOWN",
  COMPLETED: "HATCHING",
  CANCELLED: "HATCHING",
};

function stageLabel(status: string) {
  if (status === "CANCELLED") return "Failed";
  if (status === "INCUBATING") return "Incubating";
  if (status === "LOCKDOWN") return "Lockdown";
  if (status === "HATCHING") return "Hatching";
  if (status === "COMPLETED") return "Completed";
  return status;
}

async function logHatchEvent(
  hatchId: string,
  eventType: "SET" | "CANDLING" | "LOCKDOWN" | "HATCH" | "OTHER",
  notes: string,
  setDate?: Date,
  incubationDayOverride?: number
) {
  await prisma.hatchEvent.create({
    data: {
      hatchId,
      eventType,
      notes,
      incubationDay:
        incubationDayOverride ?? (setDate ? incubationDay(setDate) : undefined),
    },
  });
}

function eventTypeForStage(stage: string): "LOCKDOWN" | "HATCH" | "OTHER" {
  if (stage === "LOCKDOWN") return "LOCKDOWN";
  if (stage === "HATCHING") return "HATCH";
  return "OTHER";
}

async function applyHatchStage(hatchId: string, stage: "LOCKDOWN" | "HATCHING" | "COMPLETED" | "CANCELLED") {
  const hatch = await prisma.hatch.findUnique({ where: { id: hatchId } });
  if (!hatch) return null;

  const movingForward = stageRank[stage] > stageRank[hatch.status];
  const data: {
    status: typeof stage;
    lockdownAt?: Date | null;
    actualHatchDate?: Date | null;
  } = { status: stage };

  if (stage === "LOCKDOWN" && !hatch.lockdownAt) {
    data.lockdownAt = new Date();
  }

  if (stage === "COMPLETED") {
    data.actualHatchDate = new Date();
  } else if (hatch.status === "COMPLETED" || hatch.status === "CANCELLED") {
    data.actualHatchDate = null;
  }

  await prisma.hatch.update({
    where: { id: hatchId },
    data,
  });

  if (stage === "LOCKDOWN") {
    await prisma.hatchEgg.updateMany({
      where: { hatchId, status: "INCUBATING", archivedAt: null },
      data: { status: "LOCKDOWN" },
    });
    if (stageRank[hatch.status] > stageRank.LOCKDOWN) {
      await prisma.hatchEgg.updateMany({
        where: { hatchId, status: "HATCHING", archivedAt: null },
        data: { status: "LOCKDOWN" },
      });
    }
  } else if (stage === "HATCHING") {
    await prisma.hatchEgg.updateMany({
      where: {
        hatchId,
        status: { in: ["INCUBATING", "LOCKDOWN"] },
        archivedAt: null,
      },
      data: { status: "HATCHING" },
    });
  }

  if (hatch.status !== stage) {
    const notes =
      stage === "COMPLETED"
        ? "Batch marked completed"
        : stage === "CANCELLED"
          ? "Batch marked failed"
          : movingForward
            ? `Stage set to ${stageLabel(stage)}`
            : `Stage changed to ${stageLabel(stage)} (from ${stageLabel(hatch.status)})`;
    await logHatchEvent(hatchId, eventTypeForStage(stage), notes, hatch.setDate);
  }

  const result = await prisma.hatch.findUnique({
    where: { id: hatchId },
    include: {
      eggs: {
        where: { archivedAt: null },
        orderBy: { eggNumber: "asc" },
        include: {
          incubationLogs: { orderBy: { loggedAt: "desc" }, take: 1 },
          hatchingLogs: { orderBy: { loggedAt: "desc" }, take: 1 },
          hatchedChicken: { select: { id: true, tagNumber: true, name: true } },
        },
      },
      events: { orderBy: { occurredAt: "asc" } },
    },
  });
  if (result) await syncHatchReminders(result);
  return result;
}

hatchesRouter.post("/:id/stage", validate(hatchStageSchema), async (req, res, next) => {
  try {
    const { body } = (req as ValidatedRequest<z.infer<typeof hatchStageSchema>>).validated;
    const hatch = await applyHatchStage(req.params.id, body.stage);
    if (!hatch) {
      res.status(404).json({ error: "Hatch not found" });
      return;
    }
    res.json(enrichHatch(hatch));
  } catch (e) {
    next(e);
  }
});

hatchesRouter.post("/:id/stage/undo", async (req, res, next) => {
  try {
    const hatch = await prisma.hatch.findUnique({ where: { id: req.params.id } });
    if (!hatch) {
      res.status(404).json({ error: "Hatch not found" });
      return;
    }
    const prev = previousStage[hatch.status] as HatchStatus;
    if (!prev) {
      res.status(400).json({ error: "Nothing to undo at this stage" });
      return;
    }

    const data: {
      status: HatchStatus;
      lockdownAt?: Date | null;
      actualHatchDate?: Date | null;
    } = { status: prev };

    if (prev === "INCUBATING") {
      data.lockdownAt = null;
    }
    if (hatch.status === "COMPLETED" || hatch.status === "CANCELLED") {
      data.actualHatchDate = null;
    }

    await prisma.hatch.update({
      where: { id: req.params.id },
      data,
    });

    if (prev === "LOCKDOWN" && hatch.status === "HATCHING") {
      await prisma.hatchEgg.updateMany({
        where: { hatchId: req.params.id, status: "HATCHING", archivedAt: null },
        data: { status: "LOCKDOWN" },
      });
    } else if (prev === "INCUBATING" && hatch.status === "LOCKDOWN") {
      await prisma.hatchEgg.updateMany({
        where: { hatchId: req.params.id, status: "LOCKDOWN", archivedAt: null },
        data: { status: "INCUBATING" },
      });
    }

    await logHatchEvent(
      req.params.id,
      "OTHER",
      `Undid stage: ${stageLabel(hatch.status)} → ${stageLabel(prev)}`,
      hatch.setDate
    );

    const withEvents = await prisma.hatch.findUnique({
      where: { id: req.params.id },
      include: {
        eggs: {
          where: { archivedAt: null },
          orderBy: { eggNumber: "asc" },
          include: {
            incubationLogs: { orderBy: { loggedAt: "desc" }, take: 1 },
            hatchingLogs: { orderBy: { loggedAt: "desc" }, take: 1 },
            hatchedChicken: { select: { id: true, tagNumber: true, name: true } },
          },
        },
        events: { orderBy: { occurredAt: "asc" } },
      },
    });

    await syncHatchReminders(withEvents!);
    res.json(enrichHatch(withEvents!));
  } catch (e) {
    next(e);
  }
});

hatchesRouter.post("/:id/lockdown", async (req, res, next) => {
  try {
    const hatch = await prisma.hatch.update({
      where: { id: req.params.id },
      data: {
        status: "LOCKDOWN",
        lockdownAt: new Date(),
        events: {
          create: {
            eventType: "LOCKDOWN",
            notes: req.body?.notes,
          },
        },
      },
      include: { eggs: true, events: true },
    });
    await prisma.hatchEgg.updateMany({
      where: { hatchId: req.params.id, status: "INCUBATING", archivedAt: null },
      data: { status: "LOCKDOWN" },
    });
    res.json(enrichHatch(hatch));
  } catch (e) {
    next(e);
  }
});

hatchesRouter.post("/:id/start-hatching", async (req, res, next) => {
  try {
    const hatch = await prisma.hatch.update({
      where: { id: req.params.id },
      data: {
        status: "HATCHING",
        events: { create: { eventType: "HATCH", notes: "Hatch window started" } },
      },
      include: { eggs: true, events: true },
    });
    await prisma.hatchEgg.updateMany({
      where: {
        hatchId: req.params.id,
        status: { in: ["INCUBATING", "LOCKDOWN"] },
        archivedAt: null,
      },
      data: { status: "HATCHING" },
    });
    res.json(enrichHatch(hatch));
  } catch (e) {
    next(e);
  }
});

hatchesRouter.post("/:id/complete", async (req, res, next) => {
  try {
    const hatch = await prisma.hatch.update({
      where: { id: req.params.id },
      data: {
        status: "COMPLETED",
        actualHatchDate: new Date(),
      },
      include: { eggs: true, events: true },
    });
    res.json(enrichHatch(hatch));
  } catch (e) {
    next(e);
  }
});

hatchesRouter.post("/:id/archive", async (req, res, next) => {
  try {
    const existing = await prisma.hatch.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: "Hatch not found" });
      return;
    }
    if (existing.status !== "COMPLETED" && existing.status !== "CANCELLED") {
      res.status(400).json({ error: "Only completed or cancelled hatches can be archived" });
      return;
    }
    if (existing.archivedAt) {
      res.status(409).json({ error: "Hatch is already archived" });
      return;
    }
    const hatch = await prisma.hatch.update({
      where: { id: req.params.id },
      data: { archivedAt: new Date() },
      include: { eggs: true, events: true },
    });
    await logHatchEvent(req.params.id, "OTHER", "Incubator archived", hatch.setDate);
    const refreshed = await prisma.hatch.findUnique({
      where: { id: req.params.id },
      include: { eggs: true, events: { orderBy: { occurredAt: "asc" } } },
    });
    await syncHatchReminders(refreshed!);
    res.json(enrichHatch(refreshed!));
  } catch (e) {
    next(e);
  }
});

hatchesRouter.post("/:id/events", async (req, res, next) => {
  try {
    const event = await prisma.hatchEvent.create({
      data: {
        hatchId: req.params.id,
        eventType: req.body.eventType,
        incubationDay: req.body.incubationDay,
        notes: req.body.notes,
        occurredAt: req.body.occurredAt ? new Date(req.body.occurredAt) : new Date(),
      },
    });
    res.status(201).json(event);
  } catch (e) {
    next(e);
  }
});

const patchEventSchema = z.object({
  body: z.object({
    notes: z.string().nullable().optional(),
    occurredAt: z.string().optional(),
    incubationDay: z.number().int().nullable().optional(),
  }),
});

hatchesRouter.patch("/:id/events/:eventId", validate(patchEventSchema), async (req, res, next) => {
  try {
    const { id: hatchId, eventId } = req.params;
    const existing = await prisma.hatchEvent.findFirst({
      where: { id: eventId, hatchId },
    });
    if (!existing) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
    const { body } = (req as ValidatedRequest<z.infer<typeof patchEventSchema>>).validated;
    const event = await prisma.hatchEvent.update({
      where: { id: eventId },
      data: {
        notes: body.notes,
        occurredAt: body.occurredAt ? new Date(body.occurredAt) : undefined,
        incubationDay: body.incubationDay,
      },
    });
    res.json(event);
  } catch (e) {
    next(e);
  }
});

hatchesRouter.delete("/:id", async (req, res, next) => {
  try {
    const hatchId = req.params.id;
    const existing = await prisma.hatch.findUnique({ where: { id: hatchId } });
    if (!existing) {
      res.status(404).json({ error: "Hatch not found" });
      return;
    }
    const registeredBirds = await prisma.chicken.count({
      where: {
        OR: [{ hatchId }, { hatchEgg: { hatchId } }],
      },
    });
    if (registeredBirds > 0) {
      res.status(409).json({
        error: "Cannot delete an incubator with registered birds. Remove or reassign those birds first.",
      });
      return;
    }
    await prisma.hatch.delete({ where: { id: hatchId } });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});
