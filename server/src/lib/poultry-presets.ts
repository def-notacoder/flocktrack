export type PoultryPresetSeed = {
  name: string;
  poultryLabel: string;
  incubationDays: number;
  lockdownDay: number;
  isCustom?: boolean;
};

/** Standard incubation timings for common poultry types. */
export const DEFAULT_POULTRY_PRESETS: PoultryPresetSeed[] = [
  { name: "Chicken", poultryLabel: "Chicken", incubationDays: 21, lockdownDay: 18 },
  { name: "Duck", poultryLabel: "Duck", incubationDays: 28, lockdownDay: 25 },
  { name: "Goose", poultryLabel: "Goose", incubationDays: 30, lockdownDay: 25 },
  { name: "Quail", poultryLabel: "Quail", incubationDays: 18, lockdownDay: 15 },
  { name: "Turkey", poultryLabel: "Turkey", incubationDays: 28, lockdownDay: 25 },
  { name: "Custom", poultryLabel: "Custom", incubationDays: 21, lockdownDay: 18, isCustom: true },
];

export const POULTRY_PRESET_IDS: Record<string, string> = {
  Chicken: "preset_chicken",
  Duck: "preset_duck",
  Goose: "preset_goose",
  Quail: "preset_quail",
  Turkey: "preset_turkey",
  Custom: "preset_custom",
};
