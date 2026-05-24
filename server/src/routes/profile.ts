import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { validate, type ValidatedRequest } from "../middleware/validate.js";

export const profileRouter = Router();

const PROFILE_ID = "default";

const optionalText = z.preprocess(
  (v) => (v === "" ? null : v),
  z.string().nullable().optional()
);

const patchSchema = z.object({
  body: z.object({
    ownerName: optionalText,
    farmName: optionalText,
    description: optionalText,
    location: optionalText,
    email: optionalText,
    phone: optionalText,
  }),
});

async function getOrCreateProfile() {
  return prisma.farmProfile.upsert({
    where: { id: PROFILE_ID },
    create: { id: PROFILE_ID },
    update: {},
  });
}

profileRouter.get("/", async (_req, res, next) => {
  try {
    const profile = await getOrCreateProfile();
    res.json(profile);
  } catch (e) {
    next(e);
  }
});

profileRouter.patch("/", validate(patchSchema), async (req, res, next) => {
  try {
    const body = (req as ValidatedRequest<typeof patchSchema>).validated.body;
    const profile = await prisma.farmProfile.upsert({
      where: { id: PROFILE_ID },
      create: { id: PROFILE_ID, ...body },
      update: body,
    });
    res.json(profile);
  } catch (e) {
    next(e);
  }
});
