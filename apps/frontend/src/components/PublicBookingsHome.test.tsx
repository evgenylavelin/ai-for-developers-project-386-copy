import type { ComponentProps } from "react";

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { bookingSchedule, multiEventTypes, publicBookings } from "../data/mockGuestFlow";
import { buildAvailableDatesFromSchedule } from "../lib/publicBookings";
import type { Booking, ScheduleDay } from "../types";
import { PublicBookingsHome } from "./PublicBookingsHome";

function buildCalendarDays(scheduleDays: ScheduleDay[]) {
  return scheduleDays.map(({ slotsByEventType: _slotsByEventType, ...day }) => day);
}

function renderPublicBookingsHome(
  overrides: Partial<ComponentProps<typeof PublicBookingsHome>> = {},
) {
  const props: ComponentProps<typeof PublicBookingsHome> = {
    bookings: publicBookings,
    eventTypes: multiEventTypes,
    availableDatesByEventType: buildAvailableDatesFromSchedule(
      bookingSchedule,
      multiEventTypes,
      publicBookings,
    ),
    calendarDays: buildCalendarDays(bookingSchedule),
    scheduleDays: bookingSchedule,
    workspace: "public",
    onChangeWorkspace: vi.fn(),
    onCancelBooking: vi.fn(),
    onStartBooking: vi.fn(),
    ...overrides,
  };

  render(<PublicBookingsHome {...props} />);

  return props;
}

describe("PublicBookingsHome", () => {
  it("marks a blocked day as unavailable and gives that guard precedence over other booking messages", async () => {
    const user = userEvent.setup();
    const bookingEntryDisabledReason =
      "Запись станет доступна после загрузки типов событий и свободных слотов.";
    const onStartBooking = vi.fn();

    renderPublicBookingsHome({
      initialSelectedDate: "2026-04-19",
      initialSelectedEventTypeId: "deep-dive",
      bookingEntryDisabledReason,
      onStartBooking,
    });

    const blockedDayButton = screen.getByRole("button", { name: "Воскресенье, 19 апреля" });
    const startBookingButton = screen.getByRole("button", { name: "Записаться" });

    expect(blockedDayButton).toHaveClass("booking-calendar-day--unavailable");
    expect(within(blockedDayButton).getByText("Запись недоступна")).toBeInTheDocument();
    expect(within(blockedDayButton).queryByText("0 занято")).not.toBeInTheDocument();
    expect(startBookingButton).toBeDisabled();
    expect(screen.getByText("На этот день прием не ведется по расписанию.")).toBeInTheDocument();
    expect(screen.queryByText(bookingEntryDisabledReason)).not.toBeInTheDocument();
    expect(
      screen.queryByText("Для встречи «Ретроспектива проекта» на этот день свободных слотов нет."),
    ).not.toBeInTheDocument();

    await user.click(startBookingButton);

    expect(onStartBooking).not.toHaveBeenCalled();
  });

  it("keeps existing bookings visible when a blocked day is selected", async () => {
    const user = userEvent.setup();
    const blockedDaySchedule: ScheduleDay[] = bookingSchedule.map((day) =>
      day.isoDate === "2026-04-19"
        ? {
            ...day,
            slotsByEventType: {
              intro: [],
              standard: [],
              "deep-dive": [],
            },
          }
        : day,
    );
    const blockedDayBookings: Booking[] = [
      ...publicBookings,
      {
        id: "booking-5",
        eventTypeId: "standard",
        startAt: "2026-04-19T10:00:00Z",
        endAt: "2026-04-19T10:30:00Z",
        guestName: "Мария Иванова",
        guestEmail: "maria@example.com",
        status: "active",
      },
    ];

    renderPublicBookingsHome({
      bookings: blockedDayBookings,
      availableDatesByEventType: buildAvailableDatesFromSchedule(
        blockedDaySchedule,
        multiEventTypes,
        blockedDayBookings,
      ),
      calendarDays: buildCalendarDays(blockedDaySchedule),
      scheduleDays: blockedDaySchedule,
      initialSelectedDate: "2026-04-15",
    });

    await user.click(screen.getByRole("button", { name: "Воскресенье, 19 апреля" }));

    expect(screen.getByText("На этот день прием не ведется по расписанию.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Записаться" })).toBeDisabled();
    expect(screen.getByText("Мария Иванова")).toBeInTheDocument();
    expect(screen.getByText("maria@example.com")).toBeInTheDocument();
  });
});