import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import App from "./App";
import { GuestBookingPage } from "./components/GuestBookingPage";
import { bookingSchedule, multiEventTypes, singleEventType } from "./data/mockGuestFlow";
import { buildAvailableDatesByEventType } from "./lib/publicBookings";

describe("App", () => {
  it("renders the unavailable state when there are no event types", () => {
    render(<App scenario="none" />);

    expect(
      screen.getByRole("heading", { name: "Запись пока недоступна" }),
    ).toBeInTheDocument();
  });

  it("opens the public bookings home when bookings already exist", () => {
    render(<App scenario="public" />);

    expect(screen.getByRole("heading", { name: "Бронирования" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Записаться" })).toBeInTheDocument();
    expect(screen.getByText("Иван Петров")).toBeInTheDocument();
  });

  it("requires event type selection before continuing", async () => {
    const user = userEvent.setup();

    render(<App scenario="multi" />);

    const nextButton = screen.getByRole("button", { name: "Далее" });

    expect(nextButton).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "30 минут" }));

    expect(nextButton).toBeEnabled();
  });

  it("keeps the direct booking flow as the initial screen when there are no bookings", () => {
    render(<App scenario="single" />);

    expect(
      screen.getByRole("heading", { name: "Выберите дату и время" }),
    ).toBeInTheDocument();
  });

  it("shows the selected event type above the date and time step", async () => {
    const user = userEvent.setup();

    render(<App scenario="multi" />);

    await user.click(screen.getByRole("button", { name: "30 минут" }));
    await user.click(screen.getByRole("button", { name: "Далее" }));

    expect(screen.getByText("30 минут")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Выберите дату и время" }),
    ).toBeInTheDocument();
  });

  it("shows only booked counts in the public calendar when the all filter is active", () => {
    render(<App scenario="public" />);

    const selectedDay = screen.getByRole("button", { name: "Среда, 15 апреля" });

    expect(within(selectedDay).getByText("2 занято")).toBeInTheDocument();
    expect(screen.queryByText(/свободно/)).not.toBeInTheDocument();
  });

  it("shows booked and free counts after selecting a specific event type filter", async () => {
    const user = userEvent.setup();

    render(<App scenario="public" />);

    await user.click(screen.getByRole("button", { name: "30 минут" }));

    const selectedDay = screen.getByRole("button", { name: "Среда, 15 апреля" });

    expect(within(selectedDay).getByText("1 занято")).toBeInTheDocument();
    expect(within(selectedDay).getByText("2 свободно")).toBeInTheDocument();
  });

  it("moves the direct-booking flow to the contacts step after selecting a slot", async () => {
    const user = userEvent.setup();

    render(<App scenario="single" />);

    await user.click(screen.getByRole("button", { name: "09:00" }));
    await user.click(screen.getByRole("button", { name: "Далее" }));

    expect(
      screen.getByRole("heading", { name: "Введите контактные данные" }),
    ).toBeInTheDocument();

    const progressItems = within(
      screen.getByRole("list", { name: "Прогресс бронирования" }),
    ).getAllByRole("listitem");

    expect(progressItems[0]).toHaveClass("progress-step--done");
    expect(progressItems[1]).toHaveClass("progress-step--active");
  });

  it("shows compact weekdays in the booking flow and a full date above slots", () => {
    render(<App scenario="single" />);

    expect(screen.getByText("Ср")).toBeInTheDocument();
    expect(screen.getByText("3 сл.")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("Среда, 15 апреля")).toBeInTheDocument();
  });

  it("shows only the previous-step selection in the summary on the date and time step", async () => {
    const user = userEvent.setup();

    render(<App scenario="single" />);

    await user.click(screen.getByRole("button", { name: "09:00" }));

    expect(screen.queryByLabelText("Результат предыдущих шагов")).not.toBeInTheDocument();
  });

  it("shows empty-state copy when the selected date has no available slots", async () => {
    const user = userEvent.setup();

    render(<App scenario="single" />);

    await user.click(screen.getByRole("button", { name: "Вс 19" }));

    expect(
      screen.getByText("На выбранный день свободных слотов нет. Выберите другую дату."),
    ).toBeInTheDocument();
  });

  it("shows an explicit empty state for a selected public day without bookings", async () => {
    const user = userEvent.setup();

    render(<App scenario="public" />);

    await user.click(screen.getByRole("button", { name: "Суббота, 18 апреля" }));

    expect(screen.getByText("На выбранную дату публичных бронирований пока нет.")).toBeInTheDocument();
  });

  it("keeps cancelled public bookings visible after cancellation", async () => {
    const user = userEvent.setup();

    render(<App scenario="public" />);

    const bookingCard = screen.getByText("Иван Петров").closest("article");

    expect(bookingCard).not.toBeNull();

    await user.click(within(bookingCard as HTMLElement).getByRole("button", { name: "Отменить" }));

    expect(within(bookingCard as HTMLElement).getByText("Отменено")).toBeInTheDocument();
    expect(
      within(screen.getByRole("button", { name: "Среда, 15 апреля" })).getByText("1 занято"),
    ).toBeInTheDocument();
  });

  it("clears the selected time when changing the date", async () => {
    const user = userEvent.setup();

    render(<App scenario="single" />);

    await user.click(screen.getByRole("button", { name: "09:00" }));
    await user.click(screen.getByRole("button", { name: "Вс 19" }));

    expect(screen.queryByLabelText("Результат предыдущих шагов")).not.toBeInTheDocument();
    expect(
      screen.getByText("На выбранный день свободных слотов нет. Выберите другую дату."),
    ).toBeInTheDocument();
  });

  it("reconciles selected date and time when GuestBookingPage receives new dates", async () => {
    const user = userEvent.setup();

    const initialDates = {
      standard: [
        {
          isoDate: "2026-04-15",
          weekdayShort: "Ср",
          dayNumber: "15",
          fullLabel: "Среда, 15 апреля",
          slots: ["09:00", "10:30"],
        },
        {
          isoDate: "2026-04-16",
          weekdayShort: "Чт",
          dayNumber: "16",
          fullLabel: "Четверг, 16 апреля",
          slots: [],
        },
      ],
    };
    const nextDates = {
      standard: [
        {
          isoDate: "2026-04-18",
          weekdayShort: "Сб",
          dayNumber: "18",
          fullLabel: "Суббота, 18 апреля",
          slots: ["14:00"],
        },
      ],
    };

    const { rerender } = render(
      <GuestBookingPage eventTypes={singleEventType} datesByEventType={initialDates} />,
    );

    await user.click(screen.getByRole("button", { name: "09:00" }));

    rerender(<GuestBookingPage eventTypes={singleEventType} datesByEventType={nextDates} />);

    expect(screen.getByText("Суббота, 18 апреля")).toBeInTheDocument();
    expect(screen.queryByLabelText("Результат предыдущих шагов")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Далее" })).toBeDisabled();
  });

  it("clears date and time selection after changing the event type", async () => {
    const user = userEvent.setup();
    const datesByEventType = buildAvailableDatesByEventType(bookingSchedule, multiEventTypes, []);

    render(<GuestBookingPage eventTypes={multiEventTypes} datesByEventType={datesByEventType} />);

    await user.click(screen.getByRole("button", { name: "30 минут" }));
    await user.click(screen.getByRole("button", { name: "Далее" }));
    await user.click(screen.getByRole("button", { name: "09:00" }));

    expect(within(screen.getByLabelText("Результат предыдущих шагов")).getByText("30 минут")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Назад" }));
    await user.click(screen.getByRole("button", { name: "15 минут" }));
    await user.click(screen.getByRole("button", { name: "Далее" }));

    expect(screen.getByText("15 минут")).toBeInTheDocument();
    expect(
      within(screen.getByLabelText("Результат предыдущих шагов")).queryByText(
        "Среда, 15 апреля • 09:00",
      ),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Далее" })).toBeDisabled();
  });

  it("shows explicit empty step state when GuestBookingPage receives no dates", () => {
    render(<GuestBookingPage eventTypes={singleEventType} datesByEventType={{ standard: [] }} />);

    expect(
      screen.getByText("Свободные даты пока недоступны. Попробуйте позже."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Далее" })).toBeDisabled();
  });

  it("shows the selected event type, full date, and time on the contacts step", async () => {
    const user = userEvent.setup();

    render(<App scenario="single" />);

    await user.click(screen.getByRole("button", { name: "10:30" }));
    await user.click(screen.getByRole("button", { name: "Далее" }));

    expect(
      within(screen.getByLabelText("Результат предыдущих шагов")).getByText(
        "Среда, 15 апреля • 10:30",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Подтвердить" })).toBeInTheDocument();
  });

  it("opens the booking flow from the public home with the selected date preserved", async () => {
    const user = userEvent.setup();

    render(<App scenario="public" />);

    await user.click(screen.getByRole("button", { name: "Пятница, 17 апреля" }));
    await user.click(screen.getByRole("button", { name: "Записаться" }));
    await user.click(screen.getByRole("button", { name: "30 минут" }));
    await user.click(screen.getByRole("button", { name: "Далее" }));

    expect(screen.getByText("Пятница, 17 апреля")).toBeInTheDocument();
  });

  it("shows an inline error when contact data is incomplete", async () => {
    const user = userEvent.setup();

    render(<App scenario="single" />);

    await user.click(screen.getByRole("button", { name: "10:30" }));
    await user.click(screen.getByRole("button", { name: "Далее" }));
    await user.click(screen.getByRole("button", { name: "Подтвердить" }));

    expect(
      screen.getByText("Заполните имя и email, чтобы подтвердить бронирование."),
    ).toBeInTheDocument();
  });

  it("shows the success screen after valid contact submission", async () => {
    const user = userEvent.setup();

    render(<App scenario="single" />);

    await user.click(screen.getByRole("button", { name: "10:30" }));
    await user.click(screen.getByRole("button", { name: "Далее" }));
    await user.type(screen.getByLabelText("Имя"), "Иван");
    await user.type(screen.getByLabelText("Email"), "ivan@example.com");
    await user.click(screen.getByRole("button", { name: "Подтвердить" }));

    expect(
      screen.getByRole("heading", { name: "Бронирование подтверждено" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Детали встречи сохранены.")).toBeInTheDocument();
    expect(screen.getByText("30 минут • Среда, 15 апреля • 10:30")).toBeInTheDocument();
  });

  it("returns from the success screen back to public bookings and shows the new booking", async () => {
    const user = userEvent.setup();

    render(<App scenario="public" />);

    await user.click(screen.getByRole("button", { name: "Пятница, 17 апреля" }));
    await user.click(screen.getByRole("button", { name: "Записаться" }));
    await user.click(screen.getByRole("button", { name: "30 минут" }));
    await user.click(screen.getByRole("button", { name: "Далее" }));
    await user.click(screen.getByRole("button", { name: "09:00" }));
    await user.click(screen.getByRole("button", { name: "Далее" }));
    await user.type(screen.getByLabelText("Имя"), "Мария");
    await user.type(screen.getByLabelText("Email"), "maria@example.com");
    await user.click(screen.getByRole("button", { name: "Подтвердить" }));
    await user.click(screen.getByRole("button", { name: "Вернуться к бронированиям" }));

    expect(screen.getByRole("heading", { name: "Бронирования" })).toBeInTheDocument();
    expect(screen.getByText("Пятница, 17 апреля")).toBeInTheDocument();
    expect(screen.getByText("Мария")).toBeInTheDocument();
  });

  it("returns to the beginning from the success screen", async () => {
    const user = userEvent.setup();

    render(<App scenario="multi" />);

    await user.click(screen.getByRole("button", { name: "30 минут" }));
    await user.click(screen.getByRole("button", { name: "Далее" }));
    await user.click(screen.getByRole("button", { name: "09:00" }));
    await user.click(screen.getByRole("button", { name: "Далее" }));
    await user.type(screen.getByLabelText("Имя"), "Иван");
    await user.type(screen.getByLabelText("Email"), "ivan@example.com");
    await user.click(screen.getByRole("button", { name: "Подтвердить" }));
    await user.click(screen.getByRole("button", { name: "Вернуться в начало" }));

    expect(screen.getByRole("heading", { name: "Выберите тип встречи" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Далее" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "30 минут" })).not.toHaveClass(
      "choice-card--selected",
    );
  });
});