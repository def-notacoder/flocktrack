import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { enrichHatch } from "../lib/incubation.js";
import { syncAllHatchReminders } from "../lib/hatch-reminders.js";

export const dashboardRouter = Router();

dashboardRouter.get("/", async (_req, res, next) => {
  try {
    await syncAllHatchReminders();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [activeHatches, todayLaying, openFollowUps, reminders] = await Promise.all([
      prisma.hatch.findMany({
        where: {
          archivedAt: null,
          status: { in: ["INCUBATING", "LOCKDOWN", "HATCHING"] },
        },
        include: { _count: { select: { eggs: { where: { archivedAt: null } } } } },
        take: 3,
      }),
      prisma.layingRecord.aggregate({
        where: { recordedOn: { gte: today, lt: tomorrow } },
        _sum: { count: true },
      }),
      prisma.healthRecord.findMany({
        where: {
          resolved: false,
          followUpOn: { lte: new Date() },
          chicken: { status: "ACTIVE" },
        },
        include: { chicken: { select: { tagNumber: true, name: true } } },
        take: 5,
      }),
      prisma.reminder.findMany({
        where: { completed: false },
        include: { hatch: { select: { id: true, name: true } } },
        orderBy: { dueAt: "asc" },
        take: 20,
      }),
    ]);

    res.json({
      activeHatches: activeHatches.map((h) => enrichHatch(h)),
      todayEggCount: todayLaying._sum.count ?? 0,
      healthFollowUps: openFollowUps,
      reminders,
    });
  } catch (e) {
    next(e);
  }
});
