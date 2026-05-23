const BASE = "/api";

function apiErrorMessage(err: { error?: string; details?: { fieldErrors?: Record<string, string[]> } }) {
  const fieldErrors = err.details?.fieldErrors;
  if (fieldErrors) {
    const first = Object.values(fieldErrors).flat().find(Boolean);
    if (first) return first;
  }
  return err.error ?? "Request failed";
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(apiErrorMessage(err));
  }
  if (res.status === 204) {
    return undefined as T;
  }
  const text = await res.text();
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}

export const api = {
  ping: () => request<{ ok: boolean }>("/health"),
  dashboard: () => request<Dashboard>("/dashboard"),
  presets: () => request<PoultryPreset[]>("/poultry-presets"),
  hatches: {
    list: (params?: { status?: string; archived?: boolean }) => {
      const sp = new URLSearchParams();
      if (params?.status) sp.set("status", params.status);
      if (params?.archived) sp.set("archived", "true");
      const q = sp.toString();
      return request<Hatch[]>(`/hatches${q ? `?${q}` : ""}`);
    },
    get: (id: string) => request<HatchDetail>(`/hatches/${id}`),
    create: (body: CreateHatch) =>
      request<HatchDetail>("/hatches", { method: "POST", body: JSON.stringify(body) }),
    lockdown: (id: string) => request<HatchDetail>(`/hatches/${id}/lockdown`, { method: "POST" }),
    startHatching: (id: string) =>
      request<HatchDetail>(`/hatches/${id}/start-hatching`, { method: "POST" }),
    complete: (id: string) => request<HatchDetail>(`/hatches/${id}/complete`, { method: "POST" }),
    setStage: (id: string, stage: HatchStage) =>
      request<HatchDetail>(`/hatches/${id}/stage`, {
        method: "POST",
        body: JSON.stringify({ stage }),
      }),
    undoStage: (id: string) => request<HatchDetail>(`/hatches/${id}/stage/undo`, { method: "POST" }),
    setIncubationDay: (id: string, incubationDay: number) =>
      request<HatchDetail>(`/hatches/${id}/day`, {
        method: "PATCH",
        body: JSON.stringify({ incubationDay }),
      }),
    addEvent: (id: string, body: { notes: string; eventType?: string; incubationDay?: number }) =>
      request<HatchEvent>(`/hatches/${id}/events`, {
        method: "POST",
        body: JSON.stringify({ eventType: body.eventType ?? "OTHER", ...body }),
      }),
    updateEvent: (
      id: string,
      eventId: string,
      body: { notes?: string | null; occurredAt?: string; incubationDay?: number | null }
    ) =>
      request<HatchEvent>(`/hatches/${id}/events/${eventId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    archive: (id: string) => request<HatchDetail>(`/hatches/${id}/archive`, { method: "POST" }),
  },
  eggs: {
    list: (hatchId: string, filter: "active" | "archived" | "all" = "active") => {
      const q =
        filter === "archived" ? "?archived=true" : filter === "all" ? "?archived=all" : "";
      return request<HatchEgg[]>(`/hatches/${hatchId}/eggs${q}`);
    },
    create: (hatchId: string, body: CreateHatchEgg | { count: number }) =>
      request<HatchEgg | HatchEgg[]>(`/hatches/${hatchId}/eggs`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    get: (hatchId: string, eggId: string) => request<HatchEgg>(`/hatches/${hatchId}/eggs/${eggId}`),
    patch: (hatchId: string, eggId: string, body: Partial<CreateHatchEgg> & { status?: string }) =>
      request<HatchEgg>(`/hatches/${hatchId}/eggs/${eggId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    delete: (hatchId: string, eggId: string) =>
      request(`/hatches/${hatchId}/eggs/${eggId}`, { method: "DELETE" }),
    archive: (hatchId: string, eggId: string) =>
      request<HatchEgg>(`/hatches/${hatchId}/eggs/${eggId}/archive`, { method: "POST" }),
    unarchive: (hatchId: string, eggId: string) =>
      request<HatchEgg>(`/hatches/${hatchId}/eggs/${eggId}/unarchive`, { method: "POST" }),
    addLog: (hatchId: string, eggId: string, body: LogPhotoPatch & Record<string, unknown>) =>
      request(`/hatches/${hatchId}/eggs/${eggId}/logs`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    updateLog: (hatchId: string, eggId: string, logId: string, body: LogPhotoPatch & Record<string, unknown>) =>
      request(`/hatches/${hatchId}/eggs/${eggId}/logs/${logId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    addHatchingLog: (hatchId: string, eggId: string, body: LogPhotoPatch & Record<string, unknown>) =>
      request(`/hatches/${hatchId}/eggs/${eggId}/hatching-logs`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    updateHatchingLog: (hatchId: string, eggId: string, logId: string, body: LogPhotoPatch & Record<string, unknown>) =>
      request(`/hatches/${hatchId}/eggs/${eggId}/hatching-logs/${logId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    addNote: (hatchId: string, eggId: string, body: LogPhotoPatch & { body: string; loggedAt?: string }) =>
      request<HatchEggNote>(`/hatches/${hatchId}/eggs/${eggId}/notes`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    updateNote: (
      hatchId: string,
      eggId: string,
      noteId: string,
      body: LogPhotoPatch & { body?: string; loggedAt?: string }
    ) =>
      request<HatchEggNote>(`/hatches/${hatchId}/eggs/${eggId}/notes/${noteId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
  },
  chickens: {
    list: (params?: { q?: string; status?: string }) => {
      const sp = new URLSearchParams();
      if (params?.q) sp.set("q", params.q);
      if (params?.status) sp.set("status", params.status);
      const q = sp.toString();
      return request<Chicken[]>(`/chickens${q ? `?${q}` : ""}`);
    },
    get: (id: string) => request<ChickenDetail>(`/chickens/${id}`),
    timeline: (id: string) => request<TimelineResponse>(`/chickens/${id}/timeline`),
    create: (body: CreateChicken) =>
      request<Chicken>("/chickens", { method: "POST", body: JSON.stringify(body) }),
    fromEgg: (body: FromEggBody) =>
      request<Chicken>("/chickens/from-egg", { method: "POST", body: JSON.stringify(body) }),
    patch: (id: string, body: UpdateChicken) =>
      request<Chicken>(`/chickens/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    deceased: (id: string, body: { notes?: string; deceasedAt?: string }) =>
      request(`/chickens/${id}/deceased`, { method: "PATCH", body: JSON.stringify(body) }),
  },
  health: {
    list: (chickenId?: string) =>
      request<HealthRecord[]>(
        `/health-records${chickenId ? `?chickenId=${encodeURIComponent(chickenId)}` : ""}`
      ),
    create: (body: CreateHealthRecord) =>
      request<HealthRecord>("/health-records", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: UpdateHealthRecord) =>
      request<HealthRecord>(`/health-records/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  },
  laying: {
    list: (params?: { from?: string; to?: string }) => {
      const sp = new URLSearchParams();
      if (params?.from) sp.set("from", params.from);
      if (params?.to) sp.set("to", params.to);
      const q = sp.toString();
      return request<LayingRecord[]>(`/laying-records${q ? `?${q}` : ""}`);
    },
    create: (body: CreateLayingRecord) =>
      request<LayingRecord>("/laying-records", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: UpdateLayingRecord) =>
      request<LayingRecord>(`/laying-records/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  },
  reminders: {
    list: (completed?: boolean) =>
      request<Reminder[]>(`/reminders${completed !== undefined ? `?completed=${completed}` : ""}`),
    create: (body: CreateReminder) =>
      request<Reminder>("/reminders", { method: "POST", body: JSON.stringify(body) }),
    patch: (id: string, body: Partial<CreateReminder> & { completed?: boolean }) =>
      request<Reminder>(`/reminders/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    delete: (id: string) => request(`/reminders/${id}`, { method: "DELETE" }),
  },
};

export interface PoultryPreset {
  id: string;
  name: string;
  poultryLabel: string;
  incubationDays: number;
  lockdownDay: number;
}

export interface HatchMilestones {
  currentIncubationDay: number;
  lockdownDate: string;
  expectedHatchDate: string;
  lockdownDay: number;
  incubationDays: number;
  daysUntilLockdown: number;
  daysUntilHatch: number;
}

export type HatchStage = "LOCKDOWN" | "HATCHING" | "COMPLETED" | "CANCELLED";

export interface Hatch {
  id: string;
  name: string;
  poultryLabel: string;
  incubationDays: number;
  lockdownDay: number;
  setDate: string;
  status: string;
  archivedAt?: string | null;
  milestones?: HatchMilestones;
  _count?: { eggs: number };
}

export interface HatchEvent {
  id: string;
  eventType: string;
  occurredAt: string;
  incubationDay?: number | null;
  notes?: string | null;
}

export interface HatchDetail extends Hatch {
  eggs: HatchEgg[];
  events: HatchEvent[];
}

export interface HatchEggNote {
  id: string;
  body: string;
  loggedAt: string;
  photoUrl?: string | null;
}

export interface LogPhotoPatch {
  photo?: string;
  clearPhoto?: boolean;
}

export interface HatchEgg {
  id: string;
  eggNumber: number;
  label?: string | null;
  source?: string | null;
  shellMarking?: string | null;
  status: string;
  notes?: string | null;
  archivedAt?: string | null;
  noteLog?: HatchEggNote[];
  incubationLogs?: {
    id: string;
    incubationDay: number;
    assessment: string;
    notes?: string;
    loggedAt: string;
    photoUrl?: string | null;
  }[];
  hatchingLogs?: {
    id: string;
    stage: string;
    notes?: string;
    loggedAt: string;
    chickHealth?: string;
    photoUrl?: string | null;
  }[];
  hatchedChicken?: { id: string; tagNumber: string; name?: string | null };
}

export interface CreateHatchEgg {
  eggNumber?: number;
  label?: string | null;
  source?: string | null;
  shellMarking?: string | null;
  notes?: string | null;
  status?: string;
}

export interface CreateHatch {
  name: string;
  poultryLabel: string;
  presetId?: string;
  incubationDays: number;
  lockdownDay: number;
  setDate: string;
  eggCount: number;
  breed?: string;
  source?: string;
}

export interface Chicken {
  id: string;
  tagNumber: string;
  name?: string;
  colorMarking?: string;
  sex: string;
  poultryLabel: string;
  origin: string;
  originDetail?: string | null;
  status: string;
  lifeStage: string;
  photoUrl?: string | null;
  hatch?: { id: string; name: string };
  hatchEgg?: { id: string; eggNumber: number };
}

export interface ChickenDetail extends Chicken {
  notes?: string;
  breed?: string;
  acquiredOn: string;
  hatchedAt?: string;
  healthRecords: HealthRecord[];
}

export interface HealthRecord {
  id: string;
  chickenId: string;
  lifeStage: string;
  eventType: string;
  observedOn: string;
  symptoms?: string | null;
  treatment?: string | null;
  medication?: string | null;
  followUpOn?: string | null;
  resolved: boolean;
  notes?: string | null;
  photoUrl?: string | null;
}

export interface CreateHealthRecord {
  chickenId: string;
  lifeStage?: string;
  eventType: string;
  observedOn?: string;
  symptoms?: string;
  treatment?: string;
  medication?: string;
  followUpOn?: string;
  resolved?: boolean;
  notes?: string;
  photo?: string;
}

export interface UpdateHealthRecord {
  lifeStage?: string;
  eventType?: string;
  observedOn?: string;
  symptoms?: string | null;
  treatment?: string | null;
  medication?: string | null;
  followUpOn?: string | null;
  resolved?: boolean;
  notes?: string | null;
  photo?: string;
  clearPhoto?: boolean;
}

export interface CreateChicken {
  origin?: string;
  originDetail?: string;
  photo?: string;
  poultryLabel: string;
  tagNumber: string;
  name?: string;
  colorMarking?: string;
  sex: string;
  acquiredOn: string;
  notes?: string;
  lifeStage?: string;
  initialHealth?: { notes?: string };
}

export interface UpdateChicken {
  tagNumber?: string;
  name?: string;
  colorMarking?: string;
  sex?: string;
  poultryLabel?: string;
  notes?: string;
  photo?: string;
  clearPhoto?: boolean;
}

export interface FromEggBody {
  hatchEggId: string;
  tagNumber: string;
  name?: string;
  colorMarking?: string;
  sex: string;
  notes?: string;
  hatchHealth: { notes: string; symptoms?: string; treatment?: string };
}

export interface TimelineResponse {
  chickenId: string;
  origin: string;
  entries: { type: string; date: string; title: string; detail?: string }[];
}

export interface Dashboard {
  activeHatches: Hatch[];
  todayEggCount: number;
  healthFollowUps: { id: string; notes?: string; chicken: { tagNumber: string; name?: string } }[];
  reminders: Reminder[];
}

export type ReminderCategory =
  | "LOCKDOWN"
  | "MEDICATION"
  | "INCUBATION"
  | "HATCHING"
  | "FEEDING"
  | "GENERAL";

export interface Reminder {
  id: string;
  title: string;
  category: ReminderCategory;
  dueAt: string;
  notes?: string;
  location?: string;
  completed: boolean;
  sourceKey?: string | null;
  hatch?: { id: string; name: string };
}

export interface CreateReminder {
  title: string;
  category: ReminderCategory;
  dueAt: string;
  notes?: string;
  location?: string;
  hatchId?: string;
}

export interface LayingRecord {
  id: string;
  recordedOn: string;
  count: number;
  location?: string | null;
  notes?: string | null;
  photoUrl?: string | null;
  chickenId?: string | null;
  chicken?: { tagNumber: string; name?: string | null } | null;
}

export interface CreateLayingRecord {
  count: number;
  recordedOn: string;
  location?: string;
  notes?: string;
  chickenId?: string;
  photo?: string;
}

export interface UpdateLayingRecord {
  count?: number;
  recordedOn?: string;
  location?: string | null;
  notes?: string | null;
  chickenId?: string | null;
  photo?: string;
  clearPhoto?: boolean;
}
