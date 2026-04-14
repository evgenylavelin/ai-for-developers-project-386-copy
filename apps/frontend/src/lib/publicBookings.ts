import type {
  AvailableDatesByEventType,
  Booking,
  CalendarDaySummary,
  DayOfWeek,
  EventType,
  OwnerSchedule,
  ScheduleDay,
} from "../types";

import type { CalendarDay } from "./publicCalendar";

export const ALL_EVENT_TYPES_FILTER = "all";

type CalendarSummaryContext = {
  scheduleDays?: ScheduleDay[];
  ownerSchedule?: OwnerSchedule | null;
  eventTypes?: EventType[];
};

const DAY_OF_WEEK_BY_INDEX: DayOfWeek[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function getBookingDate(booking: Booking): string {
  return booking.startAt.slice(0, 10);
}

function getBookingTime(booking: Booking): string {
  return booking.startAt.slice(11, 16);
}

function getBookingEndTime(booking: Booking): string {
  return booking.endAt.slice(11, 16);
}

function getActiveIntervalKeys(bookings: Booking[]): Set<string> {
  return new Set(
    bookings
      .filter((booking) => booking.status === "active")
      .map(
        (booking) =>
          `${getBookingDate(booking)}|${getBookingTime(booking)}|${getBookingEndTime(booking)}`,
      ),
  );
}

function toSlotDate(day: ScheduleDay, slots: string[]) {
  return {
    isoDate: day.isoDate,
    weekdayShort: day.weekdayShort,
    dayNumber: day.dayNumber,
    fullLabel: day.fullLabel,
    slots,
  };
}

export function buildAvailableDatesFromSchedule(
  schedule: ScheduleDay[],
  eventTypes: EventType[],
  bookings: Booking[],
): AvailableDatesByEventType {
  const activeIntervalKeys = getActiveIntervalKeys(bookings);

  return Object.fromEntries(
    eventTypes.map((eventType) => [
      eventType.id,
      schedule.map((day) =>
        toSlotDate(
          day,
          (day.slotsByEventType[eventType.id] ?? []).filter(
            (slot) =>
              !activeIntervalKeys.has(
                `${day.isoDate}|${slot}|${addMinutes(slot, eventType.durationMinutes)}`,
              ),
          ),
        ),
      ),
    ]),
  );
}

function getScheduleDayBlockedDates(scheduleDays: ScheduleDay[]): Set<string> {
  return new Set(
    scheduleDays
      .filter(
        (day) =>
          Object.values(day.slotsByEventType).reduce(
            (slotCount, slots) => slotCount + slots.length,
            0,
          ) === 0,
      )
      .map((day) => day.isoDate),
  );
}

function getDayOfWeek(isoDate: string): DayOfWeek {
  return DAY_OF_WEEK_BY_INDEX[new Date(`${isoDate}T00:00:00Z`).getUTCDay()];
}

function getOwnerScheduleBlockedDates(
  calendarDays: CalendarDay[],
  ownerSchedule: OwnerSchedule,
  eventTypes: EventType[],
): Set<string> {
  const scheduleRangeMinutes = getTimeInMinutes(ownerSchedule.endTime) - getTimeInMinutes(ownerSchedule.startTime);
  const hasAnyFittingEventType = eventTypes.some(
    (eventType) => eventType.durationMinutes <= scheduleRangeMinutes,
  );

  return new Set(
    calendarDays
      .filter(
        (day) =>
          !ownerSchedule.workingDays.includes(getDayOfWeek(day.isoDate)) || !hasAnyFittingEventType,
      )
      .map((day) => day.isoDate),
  );
}

export function buildCalendarDaySummaries(
  calendarDays: CalendarDay[],
  bookings: Booking[],
  availableDatesByEventType: AvailableDatesByEventType,
  selectedFilterId: string,
  context: CalendarSummaryContext = {},
): CalendarDaySummary[] {
  const globallyUnavailableDates = context.scheduleDays
    ? getScheduleDayBlockedDates(context.scheduleDays)
    : context.ownerSchedule && context.eventTypes
      ? getOwnerScheduleBlockedDates(calendarDays, context.ownerSchedule, context.eventTypes)
    : new Set<string>();

  return calendarDays.map((day) => {
    const activeBookings = bookings.filter(
      (booking) => booking.status === "active" && getBookingDate(booking) === day.isoDate,
    );
    const bookedCount =
      selectedFilterId === ALL_EVENT_TYPES_FILTER
        ? activeBookings.length
        : activeBookings.filter((booking) => booking.eventTypeId === selectedFilterId).length;
    const freeCount =
      selectedFilterId === ALL_EVENT_TYPES_FILTER
        ? undefined
        : (availableDatesByEventType[selectedFilterId] ?? []).find(
            (slotDate) => slotDate.isoDate === day.isoDate,
          )?.slots.length ?? 0;

    return {
      isoDate: day.isoDate,
      weekdayShort: day.weekdayShort,
      dayNumber: day.dayNumber,
      fullLabel: day.fullLabel,
      bookedCount,
      freeCount,
      isGloballyUnavailable: globallyUnavailableDates.has(day.isoDate),
    };
  });
}

export function listBookingsForDate(bookings: Booking[], isoDate: string): Booking[] {
  return bookings
    .filter((booking) => getBookingDate(booking) === isoDate)
    .slice()
    .sort((left, right) => left.startAt.localeCompare(right.startAt));
}

export function getInitialSelectedDate(calendarDays: CalendarDay[], bookings: Booking[]): string {
  const firstBookingDate = bookings[0] ? getBookingDate(bookings[0]) : "";

  if (firstBookingDate && calendarDays.some((day) => day.isoDate === firstBookingDate)) {
    return firstBookingDate;
  }

  return calendarDays[0]?.isoDate ?? "";
}

export function cancelPublicBooking(bookings: Booking[], bookingId: string): Booking[] {
  return bookings.map((booking) =>
    booking.id === bookingId && booking.status === "active"
      ? { ...booking, status: "cancelled" }
      : booking,
  );
}

function addMinutes(time: string, minutesToAdd: number): string {
  const [hours, minutes] = time.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes + minutesToAdd;
  const endHours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, "0");
  const endMinutes = (totalMinutes % 60).toString().padStart(2, "0");

  return `${endHours}:${endMinutes}`;
}

function getTimeInMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);

  return hours * 60 + minutes;
}