import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { validate, type ValidatedRequest } from "../middleware/validate.js";

export const remindersRouter = Router();

const createSchema = z.object({
  body: z.object({
    title: z.string().min(1),
    category: z.enum([
      "LOCKDOWN",
      "MEDICATION",
      "INCUBATION",
      "HATCHING",
      "FEEDING",
      "GENERAL",
    ]),
    dueAt: z.string(),
    notes: z.string().optional(),
    location: z.string().optional(),
    hatchId: z.string().optional(),
  }),
});

const patchSchema = z.object({
  body: z.object({
    title: z.string().min(1).optional(),
    category: z
      .enum(["LOCKDOWN", "MEDICATION", "INCUBATION", "HATCHING", "FEEDING", "GENERAL"])
      .optional(),
    dueAt: z.string().optional(),
    notes: z.string().optional(),
    location: z.string().optional(),
    completed: z.boolean().optional(),
  }),
});

remindersRouter.get("/", async (req, res, next) => {
  try {
    const completed = req.query.completed === "true";
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    const reminders = await prisma.reminder.findMany({
      where: { completed },
      include: { hatch: { select: { id: true, name: true } } },
      orderBy: { dueAt: "asc" },
      take: limit,
    });
    res.json(reminders);
  } catch (e) {
    next(e);
  }
});

remindersRouter.post("/", validate(createSchema), async (req, res, next) => {
  try {
    const { body } = (req as ValidatedRequest<z.infer<typeof createSchema>>).validated;
    const reminder = await prisma.reminder.create({
      data: {
        title: body.title,
        category: body.category,
        dueAt: new Date(body.dueAt),
        notes: body.notes,
        location: body.location,
        hatchId: body.hatchId,
      },
      include: { hatch: { select: { id: true, name: true } } },
    });
    res.status(201).json(reminder);
  } catch (e) {
    next(e);
  }
});

remindersRouter.patch("/:id", validate(patchSchema), async (req, res, next) => {
  try {
    const { body } = (req as ValidatedRequest<z.infer<typeof patchSchema>>).validated;
    const reminder = await prisma.reminder.update({
      where: { id: req.params.id },
      data: {
        title: body.title,
        category: body.category,
        dueAt: body.dueAt ? new Date(body.dueAt) : undefined,
        notes: body.notes,
        location: body.location,
        completed: body.completed,
        completedAt: body.completed === true ? new Date() : body.completed === false ? null : undefined,
      },
      include: { hatch: { select: { id: true, name: true } } },
    });
    res.json(reminder);
  } catch (e) {
    next(e);
  }
});

remindersRouter.delete("/:id", async (req, res, next) => {
  try {
    await prisma.reminder.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});
