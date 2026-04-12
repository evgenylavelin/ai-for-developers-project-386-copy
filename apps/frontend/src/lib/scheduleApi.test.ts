import { afterEach, describe, expect, it, vi } from "vitest";

import type { OwnerSchedule } from "../types";

import { getSchedule, resetScheduleCache, updateSchedule } from "./scheduleApi";

const validSchedule: OwnerSchedule = {
  workingDays: ["monday", "wednesday"],
  startTime: "09:00",
  endTime: "18:00",
};

describe("scheduleApi", () => {
  afterEach(() => {
    resetScheduleCache();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("uses the same-origin schedule path by default", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => validSchedule,
    });

    vi.stubGlobal("fetch", fetchMock);

    await getSchedule();

    expect(fetchMock).toHaveBeenCalledWith("/schedule");
  });

  it("uses VITE_API_BASE_URL when provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => validSchedule,
    });

    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com/");

    await getSchedule();

    expect(fetchMock).toHaveBeenCalledWith("https://api.example.com/schedule");
  });

  it("normalizes rejected save requests to a localized message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Failed to fetch")));

    await expect(updateSchedule(validSchedule)).rejects.toThrow(
      "Не удалось сохранить расписание.",
    );
  });

  it("rejects malformed successful responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ workingDays: "monday" }),
      }),
    );

    await expect(getSchedule()).rejects.toThrow("Не удалось загрузить расписание.");
  });

  it("reuses the cached schedule between repeated reads", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => validSchedule,
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(getSchedule()).resolves.toEqual(validSchedule);
    await expect(getSchedule()).resolves.toEqual(validSchedule);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
