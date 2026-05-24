import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import {
  DEFAULT_POULTRY_PRESETS,
  POULTRY_PRESET_IDS,
} from "../server/src/lib/poultry-presets.ts";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  for (const p of DEFAULT_POULTRY_PRESETS) {
    await prisma.poultryPreset.upsert({
      where: { name: p.name },
      create: {
        id: POULTRY_PRESET_IDS[p.name],
        ...p,
        isCustom: p.isCustom ?? false,
      },
      update: {
        poultryLabel: p.poultryLabel,
        incubationDays: p.incubationDays,
        lockdownDay: p.lockdownDay,
        isCustom: p.isCustom ?? false,
      },
    });
  }

  const chickenPreset = await prisma.poultryPreset.findUnique({ where: { name: "Chicken" } });
  const duckPreset = await prisma.poultryPreset.findUnique({ where: { name: "Duck" } });

  const setDate = new Date();
  setDate.setDate(setDate.getDate() - 16);

  const chickenHatch = await prisma.hatch.create({
    data: {
      name: "Incubator A — Spring chickens",
      poultryLabel: "Chicken",
      presetId: chickenPreset!.id,
      incubationDays: 21,
      lockdownDay: 18,
      setDate,
      expectedHatchDate: addDays(setDate, 20),
      status: "HATCHING",
      lockdownAt: addDays(setDate, 17),
      breed: "Rhode Island Red",
      eggs: {
        create: Array.from({ length: 6 }, (_, i) => ({
          eggNumber: i + 1,
          status: i === 0 ? "HATCHING" : "LOCKDOWN",
        })),
      },
      events: {
        create: [
          { eventType: "SET", incubationDay: 0, notes: "Eggs set" },
          { eventType: "LOCKDOWN", incubationDay: 18, notes: "Removed turner" },
        ],
      },
    },
    include: { eggs: true },
  });

  const egg1 = chickenHatch.eggs.find((e) => e.eggNumber === 1)!;
  const egg3 = chickenHatch.eggs.find((e) => e.eggNumber === 3)!;

  await prisma.hatchEggLog.createMany({
    data: [
      { hatchEggId: egg1.id, incubationDay: 3, assessment: "DEVELOPING_WELL", notes: "Veins visible" },
      { hatchEggId: egg1.id, incubationDay: 5, assessment: "DEVELOPING_WELL", notes: "Developing well" },
      { hatchEggId: egg3.id, incubationDay: 5, assessment: "STALLED", notes: "Slightly behind" },
    ],
  });

  await prisma.hatchEggHatchingLog.create({
    data: {
      hatchEggId: egg1.id,
      stage: "PIPPED",
      hatchingDay: 0,
      chickHealth: "STRONG",
      notes: "Small pip visible",
    },
  });

  const duckSet = addDays(new Date(), -10);
  await prisma.hatch.create({
    data: {
      name: "Incubator B — April ducks",
      poultryLabel: "Duck",
      presetId: duckPreset!.id,
      incubationDays: 28,
      lockdownDay: 25,
      setDate: duckSet,
      expectedHatchDate: addDays(duckSet, 27),
      status: "INCUBATING",
      eggs: { create: Array.from({ length: 4 }, (_, i) => ({ eggNumber: i + 1 })) },
      events: { create: [{ eventType: "SET", incubationDay: 0 }] },
    },
  });

  const completedSet = addDays(new Date(), -30);
  const completedHatch = await prisma.hatch.create({
    data: {
      name: "Winter hatch",
      poultryLabel: "Chicken",
      incubationDays: 21,
      lockdownDay: 18,
      setDate: completedSet,
      expectedHatchDate: addDays(completedSet, 20),
      actualHatchDate: addDays(completedSet, 21),
      status: "COMPLETED",
      eggs: {
        create: [{ eggNumber: 3, status: "HATCHED" }],
      },
    },
    include: { eggs: true },
  });

  const hatchedEgg = completedHatch.eggs[0];
  const hatchedAt = addDays(completedSet, 21);

  const chicken101 = await prisma.chicken.create({
    data: {
      origin: "FROM_EGG",
      hatchEggId: hatchedEgg.id,
      hatchId: completedHatch.id,
      poultryLabel: "Chicken",
      tagNumber: "101",
      name: "Red",
      colorMarking: "Red band",
      sex: "HEN",
      lifeStage: "PULLET",
      status: "ACTIVE",
      acquiredOn: hatchedAt,
      hatchedAt,
      healthRecords: {
        create: [
          {
            lifeStage: "CHICK",
            eventType: "HATCH",
            observedOn: hatchedAt,
            notes: "Strong chick at hatch",
          },
          {
            lifeStage: "CHICK",
            eventType: "CHECKUP",
            observedOn: addDays(hatchedAt, 7),
            notes: "Growing well",
            resolved: true,
          },
        ],
      },
    },
  });

  await prisma.hatchEgg.update({
    where: { id: hatchedEgg.id },
    data: { status: "HATCHED" },
  });

  await prisma.chicken.create({
    data: {
      origin: "PURCHASED",
      poultryLabel: "Chicken",
      tagNumber: "202",
      name: "Betty",
      colorMarking: "Blue band",
      sex: "HEN",
      lifeStage: "ADULT",
      status: "ACTIVE",
      acquiredOn: addDays(new Date(), -14),
      notes: "Bought at swap meet",
      healthRecords: {
        create: {
          lifeStage: "ADULT",
          eventType: "CHECKUP",
          observedOn: addDays(new Date(), -7),
          notes: "Healthy on arrival",
          resolved: true,
        },
      },
    },
  });

  await prisma.chicken.create({
    data: {
      origin: "OTHER",
      poultryLabel: "Chicken",
      tagNumber: "000",
      name: "Flock",
      sex: "UNKNOWN",
      lifeStage: "ADULT",
      status: "ACTIVE",
      acquiredOn: new Date(),
      notes: "Placeholder for barn-wide health notes",
    },
  });

  const tomorrow = addDays(new Date(), 1);
  tomorrow.setHours(9, 0, 0, 0);

  await prisma.reminder.createMany({
    data: [
      {
        title: "Put incubator in lockdown",
        category: "LOCKDOWN",
        dueAt: tomorrow,
        hatchId: chickenHatch.id,
        notes: "Stop turning, raise humidity",
      },
      {
        title: "Add medication to Coop A",
        category: "MEDICATION",
        dueAt: addDays(new Date(), 3),
        location: "Coop A",
        notes: "Water-soluble vitamins",
      },
    ],
  });

  console.log("Seed complete");
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
