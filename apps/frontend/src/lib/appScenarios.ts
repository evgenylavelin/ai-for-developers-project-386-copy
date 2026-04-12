import {
  bookingSchedule,
  multiEventTypes,
  noEventTypes,
  publicBookings,
  singleEventType,
} from "../data/mockGuestFlow";
import { mockOwnerEventTypes } from "../data/mockOwnerEventTypes";
import type {
  AvailabilityByEventType,
  Booking,
  BookingDraft,
  CreateBookingRequest,
  EventType,
  OwnerEventType,
  ScheduleDay,
} from "../types";

export type AppScenario = "none" | "single" | "multi" | "public";

export type ScenarioData = {
  bookings: Booking[];
  eventTypes: EventType[];
  schedule: ScheduleDay[];
};

export function getScenarioData(scenario: AppScenario): ScenarioData {
  if (scenario === "none") {
    return cloneScenarioData({
      bookings: [],
      eventTypes: noEventTypes,
      schedule: bookingSchedule,
    });
  }

  if (scenario === "single") {
    return cloneScenarioData({
      bookings: [],
      eventTypes: singleEventType,
      schedule: bookingSchedule,
    });
  }

  if (scenario === "multi") {
    return cloneScenarioData({
      bookings: [],
      eventTypes: multiEventTypes,
      schedule: bookingSchedule,
    });
  }

  return cloneScenarioData({
    bookings: publicBookings,
    eventTypes: multiEventTypes,
    schedule: bookingSchedule,
  });
}

export function getScenarioOwnerEventTypes(): OwnerEventType[] {
  return mockOwnerEventTypes.map((eventType) => ({ ...eventType }));
}

export function buildScenarioAvailability(
  schedule: ScheduleDay[],
  eventTypes: EventType[],
): AvailabilityByEventType {
  return Object.fromEntries(
    eventTypes.map((eventType) => [
      eventType.id,
      schedule.flatMap((day) =>
        (day.slotsByEventType[eventType.id] ?? []).map((time) => ({
          startAt: `${day.isoDate}T${time}:00Z`,
          endAt: `${day.isoDate}T${time}:00Z`,
        })),
      ),
    ]),
  );
}

export function buildCreateBookingRequest(
  draft: BookingDraft,
  eventTypes: EventType[],
): CreateBookingRequest {
  const eventType = eventTypes.find((item) => item.id === draft.eventTypeId);

  if (!eventType) {
    throw new Error(`Unknown event type: ${draft.eventTypeId}`);
  }

  const [hours, minutes] = draft.time.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes + eventType.durationMinutes;
  const endHours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, "0");
  const endMinutes = (totalMinutes % 60).toString().padStart(2, "0");

  return {
    eventTypeId: draft.eventTypeId,
    startAt: `${draft.isoDate}T${draft.time}:00Z`,
    endAt: `${draft.isoDate}T${endHours}:${endMinutes}:00Z`,
    guestName: draft.guestName.trim(),
    guestEmail: draft.guestEmail.trim(),
  };
}

export function createScenarioBooking(eventTypes: EventType[], draft: BookingDraft): Booking {
  const request = buildCreateBookingRequest(draft, eventTypes);

  return {
    id: `booking-${draft.eventTypeId}-${draft.isoDate}-${draft.time}`,
    ...request,
    status: "active",
  };
}

function cloneScenarioData(data: ScenarioData): ScenarioData {
  return {
    bookings: data.bookings.map((booking) => ({ ...booking })),
    eventTypes: data.eventTypes.map((eventType) => ({ ...eventType })),
    schedule: data.schedule.map((day) => ({
      ...day,
      slotsByEventType: Object.fromEntries(
        Object.entries(day.slotsByEventType).map(([eventTypeId, slots]) => [eventTypeId, [...slots]]),
      ),
    })),
  };
}