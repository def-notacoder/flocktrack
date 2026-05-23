import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const poultryPresetsRouter = Router();

poultryPresetsRouter.get("/", async (_req, res, next) => {
  try {
    const presets = await prisma.poultryPreset.findMany({
      where: { isCustom: false },
      orderBy: { name: "asc" },
    });
    res.json(presets);
  } catch (e) {
    next(e);
  }
});
