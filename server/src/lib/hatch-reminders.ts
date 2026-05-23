import { prisma } from "./prisma.js";
import { milestoneDates } from "./incubation.js";

const REMINDER_HOUR = 8;

function morningOf(date: Date): Date {
  const d = new Date(date);
  d.setHours(REMINDER_HOUR, 0, 0, 0);
  return d;
}

type HatchForReminders = {
  id: string;
  name: string;
  status: string;
  archivedAt: Date | null;
  setDate: Date;
  lockdownDay: number;
  incubationDays: number;
};

async function upsertAutoReminder(data: {
  sourceKey: string;
  title: string;
  category: "LOCKDOWN" | "HATCHING";
  dueAt: Date;
  hatchId: string;
}) {
  const existing = await prisma.reminder.findUnique({ where: { sourceKey: data.sourceKey } });
  if (existing?.completed) return;

  await prisma.reminder.upsert({
    where: { sourceKey: data.sourceKey },
    create: {
      sourceKey: data.sourceKey,
      title: data.title,
      category: data.category,
      dueAt: data.dueAt,
      hatchId: data.hatchId,
    },
    update: {
      title: data.title,
      dueAt: data.dueAt,
      hatchId: data.hatchId,
      notes: null,
      location: null,
    },
  });
}

async function completeAutoReminder(sourceKey: string) {
  await prisma.reminder.updateMany({
    where: { sourceKey, completed: false },
    data: { completed: true, completedAt: new Date() },
  });
}

async function completeAllAutoForHatch(hatchId: string) {
  await prisma.reminder.updateMany({
    where: {
      hatchId,
      sourceKey: { startsWith: `hatch:${hatchId}:` },
      completed: false,
    },
    data: { completed: true, completedAt: new Date() },
  });
}

export async function syncHatchReminders(hatch: HatchForReminders) {
  const lockdownKey = `hatch:${hatch.id}:lockdown`;
  const hatchKey = `hatch:${hatch.id}:hatch`;

  if (hatch.archivedAt || hatch.status === "COMPLETED" || hatch.status === "CANCELLED") {
    await completeAllAutoForHatch(hatch.id);
    return;
  }

  const milestones = milestoneDates(hatch.setDate, hatch.lockdownDay, hatch.incubationDays);

  if (hatch.status === "INCUBATING") {
    await upsertAutoReminder({
      sourceKey: lockdownKey,
      title: `${hatch.name}: Lockdown`,
      category: "LOCKDOWN",
      dueAt: morningOf(milestones.lockdownDate),
      hatchId: hatch.id,
    });
  } else {
    await completeAutoReminder(lockdownKey);
  }

  if (["INCUBATING", "LOCKDOWN", "HATCHING"].includes(hatch.status)) {
    await upsertAutoReminder({
      sourceKey: hatchKey,
      title: `${hatch.name}: Hatch day`,
      category: "HATCHING",
      dueAt: morningOf(milestones.expectedHatchDate),
      hatchId: hatch.id,
    });
  } else {
    await completeAutoReminder(hatchKey);
  }
}

export async function syncAllHatchReminders() {
  const hatches = await prisma.hatch.findMany({
    where: { archivedAt: null },
    select: {
      id: true,
      name: true,
      status: true,
      archivedAt: true,
      setDate: true,
      lockdownDay: true,
      incubationDays: true,
    },
  });
  await Promise.all(hatches.map((h) => syncHatchReminders(h)));
}
