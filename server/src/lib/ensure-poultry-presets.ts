import { prisma } from "./prisma.js";
import { DEFAULT_POULTRY_PRESETS, POULTRY_PRESET_IDS } from "./poultry-presets.js";

/** Idempotent upsert so presets exist even when `db seed` was never run. */
export async function ensurePoultryPresets() {
  for (const preset of DEFAULT_POULTRY_PRESETS) {
    await prisma.poultryPreset.upsert({
      where: { name: preset.name },
      create: {
        id: POULTRY_PRESET_IDS[preset.name],
        ...preset,
        isCustom: preset.isCustom ?? false,
      },
      update: {
        poultryLabel: preset.poultryLabel,
        incubationDays: preset.incubationDays,
        lockdownDay: preset.lockdownDay,
        isCustom: preset.isCustom ?? false,
      },
    });
  }
}
