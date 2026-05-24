-- Seed default poultry presets for new clutch (idempotent).
INSERT INTO "PoultryPreset" ("id", "name", "poultryLabel", "incubationDays", "lockdownDay", "isCustom")
VALUES
  ('preset_chicken', 'Chicken', 'Chicken', 21, 18, false),
  ('preset_duck', 'Duck', 'Duck', 28, 25, false),
  ('preset_goose', 'Goose', 'Goose', 30, 25, false),
  ('preset_quail', 'Quail', 'Quail', 18, 15, false),
  ('preset_turkey', 'Turkey', 'Turkey', 28, 25, false),
  ('preset_custom', 'Custom', 'Custom', 21, 18, true)
ON CONFLICT ("name") DO UPDATE SET
  "poultryLabel" = EXCLUDED."poultryLabel",
  "incubationDays" = EXCLUDED."incubationDays",
  "lockdownDay" = EXCLUDED."lockdownDay",
  "isCustom" = EXCLUDED."isCustom";
