import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { saveChickenPhoto, deleteChickenPhoto } from "../lib/photos.js";
import { validate, type ValidatedRequest } from "../middleware/validate.js";

export const chickensRouter = Router();

const createChickenSchema = z.object({
  body: z
    .object({
      origin: z.enum(["PURCHASED", "HATCHED_ELSEWHERE", "OTHER"]).default("PURCHASED"),
      originDetail: z.string().optional(),
      poultryLabel: z.string().min(1),
      tagNumber: z.string().min(1),
      name: z.string().optional(),
      colorMarking: z.string().optional(),
      sex: z.enum(["HEN", "ROOSTER", "UNKNOWN"]),
      breed: z.string().optional(),
      notes: z.string().optional(),
      photo: z.string().optional(),
      acquiredOn: z.string(),
      lifeStage: z.enum(["CHICK", "PULLET", "ADULT"]).optional(),
      initialHealth: z
        .object({
          notes: z.string().optional(),
          symptoms: z.string().optional(),
          treatment: z.string().optional(),
        })
        .optional(),
    })
    .refine((data) => data.origin !== "OTHER" || Boolean(data.originDetail?.trim()), {
      message: "Describe the origin when Other is selected",
      path: ["originDetail"],
    }),
});

const fromEggSchema = z.object({
  body: z.object({
    hatchEggId: z.string(),
    tagNumber: z.string().min(1),
    name: z.string().optional(),
    colorMarking: z.string().optional(),
    sex: z.enum(["HEN", "ROOSTER", "UNKNOWN"]),
    breed: z.string().optional(),
    notes: z.string().optional(),
    hatchedAt: z.string().optional(),
    hatchHealth: z.object({
      observedOn: z.string().optional(),
      symptoms: z.string().optional(),
      treatment: z.string().optional(),
      medication: z.string().optional(),
      notes: z.string().min(1),
    }),
  }),
});

const updateChickenSchema = z.object({
  body: z.object({
    photo: z.string().optional(),
    clearPhoto: z.boolean().optional(),
    tagNumber: z.string().min(1).optional(),
    name: z.string().optional(),
    colorMarking: z.string().optional(),
    sex: z.enum(["HEN", "ROOSTER", "UNKNOWN"]).optional(),
    breed: z.string().optional(),
    notes: z.string().optional(),
    lifeStage: z.enum(["CHICK", "PULLET", "ADULT"]).optional(),
    poultryLabel: z.string().min(1).optional(),
  }),
});

chickensRouter.get("/", async (req, res, next) => {
  try {
    const q = (req.query.q as string)?.trim();
    const status = req.query.status as string | undefined;
    const origin = req.query.origin as string | undefined;
    const chickens = await prisma.chicken.findMany({
      where: {
        tagNumber: { not: "000" },
        ...(status ? { status: status as never } : {}),
        ...(origin ? { origin: origin as never } : {}),
        ...(q
          ? {
              OR: [
                { tagNumber: { contains: q, mode: "insensitive" } },
                { name: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        hatch: { select: { id: true, name: true } },
        hatchEgg: { select: { id: true, eggNumber: true } },
      },
      orderBy: { tagNumber: "asc" },
    });
    res.json(chickens);
  } catch (e) {
    next(e);
  }
});

chickensRouter.post("/", validate(createChickenSchema), async (req, res, next) => {
  try {
    const { body } = (req as ValidatedRequest<z.infer<typeof createChickenSchema>>).validated;
    const acquiredOn = new Date(body.acquiredOn);
    let chicken = await prisma.chicken.create({
      data: {
        origin: body.origin,
        originDetail: body.origin === "OTHER" ? body.originDetail?.trim() : null,
        poultryLabel: body.poultryLabel,
        tagNumber: body.tagNumber.trim(),
        name: body.name,
        colorMarking: body.colorMarking,
        sex: body.sex,
        breed: body.breed,
        notes: body.notes,
        acquiredOn,
        lifeStage: body.lifeStage ?? "ADULT",
        status: "ACTIVE",
        healthRecords: body.initialHealth
          ? {
              create: {
                lifeStage: body.lifeStage === "CHICK" ? "CHICK" : "ADULT",
                eventType: "CHECKUP",
                observedOn: acquiredOn,
                notes: body.initialHealth.notes,
                symptoms: body.initialHealth.symptoms,
                treatment: body.initialHealth.treatment,
              },
            }
          : undefined,
      },
      include: { hatch: true, hatchEgg: true, healthRecords: true },
    });
    if (body.photo?.trim()) {
      const photoUrl = await saveChickenPhoto(chicken.id, body.photo.trim());
      chicken = await prisma.chicken.update({
        where: { id: chicken.id },
        data: { photoUrl },
        include: { hatch: true, hatchEgg: true, healthRecords: true },
      });
    }
    res.status(201).json(chicken);
  } catch (e) {
    next(e);
  }
});

chickensRouter.post("/from-egg", validate(fromEggSchema), async (req, res, next) => {
  try {
    const { body } = (req as ValidatedRequest<z.infer<typeof fromEggSchema>>).validated;
    const egg = await prisma.hatchEgg.findUnique({
      where: { id: body.hatchEggId },
      include: { hatch: true },
    });
    if (!egg) {
      res.status(404).json({ error: "Egg not found" });
      return;
    }
    const existingBird = await prisma.chicken.findUnique({ where: { hatchEggId: egg.id } });
    if (existingBird) {
      res.status(409).json({ error: "Egg already registered as a chicken" });
      return;
    }
    const hatchedAt = body.hatchedAt ? new Date(body.hatchedAt) : new Date();
    const chicken = await prisma.$transaction(async (tx) => {
      const bird = await tx.chicken.create({
        data: {
          origin: "FROM_EGG",
          hatchEggId: egg.id,
          hatchId: egg.hatchId,
          poultryLabel: egg.hatch.poultryLabel,
          tagNumber: body.tagNumber.trim(),
          name: body.name,
          colorMarking: body.colorMarking,
          sex: body.sex,
          breed: body.breed ?? egg.hatch.breed ?? undefined,
          notes: body.notes,
          acquiredOn: hatchedAt,
          hatchedAt,
          lifeStage: "CHICK",
          status: "ACTIVE",
          healthRecords: {
            create: {
              lifeStage: "CHICK",
              eventType: "HATCH",
              observedOn: body.hatchHealth.observedOn
                ? new Date(body.hatchHealth.observedOn)
                : hatchedAt,
              symptoms: body.hatchHealth.symptoms,
              treatment: body.hatchHealth.treatment,
              medication: body.hatchHealth.medication,
              notes: body.hatchHealth.notes,
            },
          },
        },
        include: { healthRecords: true, hatch: true, hatchEgg: true },
      });
      await tx.hatchEgg.update({
        where: { id: egg.id },
        data: { status: "HATCHED" },
      });
      return bird;
    });
    res.status(201).json(chicken);
  } catch (e) {
    next(e);
  }
});

chickensRouter.get("/:id", async (req, res, next) => {
  try {
    const chicken = await prisma.chicken.findUnique({
      where: { id: req.params.id },
      include: {
        hatch: true,
        hatchEgg: true,
        healthRecords: { orderBy: { observedOn: "desc" } },
      },
    });
    if (!chicken) {
      res.status(404).json({ error: "Chicken not found" });
      return;
    }
    res.json(chicken);
  } catch (e) {
    next(e);
  }
});

chickensRouter.get("/:id/timeline", async (req, res, next) => {
  try {
    const chicken = await prisma.chicken.findUnique({
      where: { id: req.params.id },
      include: {
        hatch: true,
        hatchEgg: {
          include: {
            incubationLogs: { orderBy: { loggedAt: "asc" } },
            hatchingLogs: { orderBy: { loggedAt: "asc" } },
          },
        },
        healthRecords: { orderBy: { observedOn: "asc" } },
      },
    });
    if (!chicken) {
      res.status(404).json({ error: "Chicken not found" });
      return;
    }

    type TimelineEntry = {
      type: string;
      date: string;
      title: string;
      detail?: string;
      meta?: Record<string, unknown>;
    };

    const entries: TimelineEntry[] = [];

    if (chicken.hatchEgg) {
      for (const log of chicken.hatchEgg.incubationLogs) {
        entries.push({
          type: "incubation",
          date: log.loggedAt.toISOString(),
          title: `Day ${log.incubationDay} — ${log.assessment.replace(/_/g, " ")}`,
          detail: log.notes ?? undefined,
        });
      }
      for (const log of chicken.hatchEgg.hatchingLogs) {
        entries.push({
          type: "hatching",
          date: log.loggedAt.toISOString(),
          title: log.stage.replace(/_/g, " "),
          detail: log.notes ?? undefined,
          meta: { chickHealth: log.chickHealth },
        });
      }
    } else {
      entries.push({
        type: "acquired",
        date: chicken.acquiredOn.toISOString(),
        title:
          chicken.origin === "OTHER" && chicken.originDetail
            ? `Added to flock — ${chicken.originDetail}`
            : `Added to flock — ${chicken.origin.replace(/_/g, " ")}`,
        detail: chicken.notes ?? undefined,
      });
    }

    for (const hr of chicken.healthRecords) {
      entries.push({
        type: "health",
        date: hr.observedOn.toISOString(),
        title: hr.eventType.replace(/_/g, " "),
        detail: hr.notes ?? hr.symptoms ?? undefined,
        meta: { id: hr.id, resolved: hr.resolved, lifeStage: hr.lifeStage },
      });
    }

    if (chicken.deceasedAt) {
      entries.push({
        type: "status",
        date: chicken.deceasedAt.toISOString(),
        title: "Deceased",
      });
    }

    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    res.json({ chickenId: chicken.id, origin: chicken.origin, entries });
  } catch (e) {
    next(e);
  }
});

chickensRouter.patch("/:id", validate(updateChickenSchema), async (req, res, next) => {
  try {
    const { body } = (req as ValidatedRequest<z.infer<typeof updateChickenSchema>>).validated;
    const { photo, clearPhoto, ...fields } = body;

    let photoUrl: string | null | undefined;
    if (clearPhoto) {
      await deleteChickenPhoto(req.params.id);
      photoUrl = null;
    } else if (typeof photo === "string" && photo.trim()) {
      await deleteChickenPhoto(req.params.id);
      photoUrl = await saveChickenPhoto(req.params.id, photo.trim());
    }

    const chicken = await prisma.chicken.update({
      where: { id: req.params.id },
      data: {
        tagNumber: fields.tagNumber,
        name: fields.name,
        colorMarking: fields.colorMarking,
        sex: fields.sex,
        breed: fields.breed,
        notes: fields.notes,
        lifeStage: fields.lifeStage,
        poultryLabel: fields.poultryLabel,
        ...(photoUrl !== undefined ? { photoUrl } : {}),
      },
    });
    res.json(chicken);
  } catch (e) {
    next(e);
  }
});

chickensRouter.patch("/:id/deceased", async (req, res, next) => {
  try {
    const deceasedAt = req.body.deceasedAt ? new Date(req.body.deceasedAt) : new Date();
    const chicken = await prisma.$transaction(async (tx) => {
      const bird = await tx.chicken.update({
        where: { id: req.params.id },
        data: { status: "DECEASED", deceasedAt },
      });
      if (req.body.notes) {
        await tx.healthRecord.create({
          data: {
            chickenId: req.params.id,
            lifeStage: "ADULT",
            eventType: "DEATH",
            observedOn: deceasedAt,
            notes: req.body.notes,
          },
        });
      }
      return bird;
    });
    res.json(chicken);
  } catch (e) {
    next(e);
  }
});

chickensRouter.delete("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.chicken.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: "Chicken not found" });
      return;
    }
    if (existing.tagNumber === "000") {
      res.status(403).json({ error: "This bird cannot be deleted" });
      return;
    }
    await prisma.$transaction(async (tx) => {
      await tx.layingRecord.updateMany({
        where: { chickenId: req.params.id },
        data: { chickenId: null },
      });
      await tx.chicken.delete({ where: { id: req.params.id } });
    });
    await deleteChickenPhoto(req.params.id);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});
