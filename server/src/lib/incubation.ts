export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function incubationDay(setDate: Date, onDate: Date = new Date()): number {
  const set = startOfDay(setDate).getTime();
  const on = startOfDay(onDate).getTime();
  const diff = Math.floor((on - set) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff + 1);
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Set date that makes `incubationDay(setDate, onDate)` equal to `targetDay`. */
export function setDateForIncubationDay(targetDay: number, onDate: Date = new Date()): Date {
  return addDays(startOfDay(onDate), -(targetDay - 1));
}

export function milestoneDates(
  setDate: Date,
  lockdownDay: number,
  incubationDays: number
) {
  const set = startOfDay(setDate);
  return {
    lockdownDate: addDays(set, lockdownDay - 1),
    expectedHatchDate: addDays(set, incubationDays - 1),
    lockdownDay,
    incubationDays,
  };
}

export function daysUntil(target: Date, from: Date = new Date()): number {
  const t = startOfDay(target).getTime();
  const f = startOfDay(from).getTime();
  return Math.ceil((t - f) / (1000 * 60 * 60 * 24));
}

export function enrichHatch<T extends {
  setDate: Date;
  lockdownDay: number;
  incubationDays: number;
  lockdownAt?: Date | null;
  expectedHatchDate?: Date | null;
}>(hatch: T) {
  const milestones = milestoneDates(hatch.setDate, hatch.lockdownDay, hatch.incubationDays);
  const currentDay = incubationDay(hatch.setDate);
  return {
    ...hatch,
    milestones: {
      ...milestones,
      currentIncubationDay: currentDay,
      daysUntilLockdown: daysUntil(milestones.lockdownDate),
      daysUntilHatch: daysUntil(milestones.expectedHatchDate),
    },
  };
}
