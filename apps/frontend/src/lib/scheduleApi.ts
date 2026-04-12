import type { OwnerSchedule } from "../types";

const schedulePath = "/schedule";
let cachedSchedule: OwnerSchedule | null = null;
let inFlightScheduleRequest: Promise<OwnerSchedule> | null = null;
const dayOfWeekValues = new Set([
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const);

function getScheduleUrl(): string {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

  if (!configuredBaseUrl) {
    return schedulePath;
  }

  return `${configuredBaseUrl.replace(/\/$/, "")}${schedulePath}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getErrorMessage(payload: unknown): string | null {
  if (typeof payload === "string") {
    return payload.trim() || null;
  }

  if (!isRecord(payload)) {
    return null;
  }

  const message = payload.message;
  if (typeof message === "string" && message.trim()) {
    return message;
  }

  const error = payload.error;
  if (typeof error === "string" && error.trim()) {
    return error;
  }

  const detail = payload.detail;
  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  return null;
}

async function readErrorMessage(response: Response): Promise<string | null> {
  try {
    const text = await response.text();

    if (!text.trim()) {
      return null;
    }

    try {
      return getErrorMessage(JSON.parse(text));
    } catch {
      return text.trim();
    }
  } catch {
    return null;
  }
}

function isOwnerSchedule(value: unknown): value is OwnerSchedule {
  if (!isRecord(value)) {
    return false;
  }

  const { workingDays, startTime, endTime } = value;

  return (
    Array.isArray(workingDays) &&
    workingDays.every((day) => typeof day === "string" && dayOfWeekValues.has(day as never)) &&
    typeof startTime === "string" &&
    typeof endTime === "string"
  );
}

async function fetchSchedule(): Promise<OwnerSchedule> {
  let response: Response;

  try {
    response = await fetch(getScheduleUrl());
  } catch {
    throw new Error("Не удалось загрузить расписание.");
  }

  if (!response.ok) {
    throw new Error("Не удалось загрузить расписание.");
  }

  const payload = await response.json();

  if (!isOwnerSchedule(payload)) {
    throw new Error("Не удалось загрузить расписание.");
  }

  cachedSchedule = payload;

  return payload;
}

export async function getSchedule(): Promise<OwnerSchedule> {
  if (cachedSchedule) {
    return cachedSchedule;
  }

  if (!inFlightScheduleRequest) {
    inFlightScheduleRequest = fetchSchedule().finally(() => {
      inFlightScheduleRequest = null;
    });
  }

  return inFlightScheduleRequest;
}

export async function updateSchedule(schedule: OwnerSchedule): Promise<OwnerSchedule> {
  let response: Response;

  try {
    response = await fetch(getScheduleUrl(), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(schedule),
    });
  } catch {
    throw new Error("Не удалось сохранить расписание.");
  }

  if (!response.ok) {
    const backendMessage = await readErrorMessage(response);
    throw new Error(backendMessage ?? "Не удалось сохранить расписание.");
  }

  const payload = await response.json();

  if (!isOwnerSchedule(payload)) {
    throw new Error("Не удалось сохранить расписание.");
  }

  cachedSchedule = payload;

  return payload;
}

export function warmScheduleCache(): void {
  void getSchedule().catch(() => undefined);
}

export function resetScheduleCache(): void {
  cachedSchedule = null;
  inFlightScheduleRequest = null;
}
