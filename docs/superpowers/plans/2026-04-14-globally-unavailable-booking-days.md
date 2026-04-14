# Globally Unavailable Booking Days Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the public bookings calendar mark schedule-blocked dates as explicitly unavailable for new booking in every filter mode.

**Architecture:** Extend the calendar-day summary model with a global unavailability flag, derive that flag from concrete scenario schedule data or the loaded owner weekly schedule, and let the public bookings screen render a stronger disabled state plus a day-specific booking guard. Keep the API contract unchanged for now by using existing frontend schedule sources instead of adding a new backend day-status endpoint.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library

---

## File Map

- Modify: `apps/frontend/src/types.ts`
  Add the new summary flag that the UI can consume directly.

- Modify: `apps/frontend/src/lib/publicBookings.ts`
  Compute `isGloballyUnavailable` inside calendar summaries from either scenario schedule days or the loaded owner weekly schedule.

- Modify: `apps/frontend/src/lib/publicBookings.test.ts`
  Lock helper behavior for globally blocked days versus event-type-specific full days.

- Modify: `apps/frontend/src/App.tsx`
  Load the owner weekly schedule into public-home state, pass it into calendar summary generation, and keep existing startup booking guards intact.

- Modify: `apps/frontend/src/App.test.tsx`
  Verify runtime startup loads schedule data and exposes blocked dates in the public home.

- Create: `apps/frontend/src/components/PublicBookingsHome.test.tsx`
  Cover the UI-level disabled treatment, selected-day guard, and visibility of existing bookings on a blocked date.

- Modify: `apps/frontend/src/components/PublicBookingsHome.tsx`
  Render the new blocked-day class, messaging, and button-disable precedence.

- Modify: `apps/frontend/src/styles.css`
  Add an explicit disabled visual treatment for schedule-blocked calendar cards.

### Task 1: Extend Calendar Summary State

**Files:**
- Modify: `apps/frontend/src/types.ts`
- Modify: `apps/frontend/src/lib/publicBookings.ts`
- Modify: `apps/frontend/src/lib/publicBookings.test.ts`

- [ ] **Step 1: Write the failing helper tests**

Add two assertions to `apps/frontend/src/lib/publicBookings.test.ts` so the helper contract is explicit before implementation:

```ts
  it("marks days with zero schedule slots across all event types as globally unavailable", () => {
    const datesByEventType = buildAvailableDatesFromSchedule(
      bookingSchedule,
      multiEventTypes,
      publicBookings,
    );

    expect(
      buildCalendarDaySummaries(
        bookingSchedule,
        publicBookings,
        datesByEventType,
        ALL_EVENT_TYPES_FILTER,
        { scheduleDays: bookingSchedule },
      )[4],
    ).toMatchObject({
      isoDate: "2026-04-19",
      isGloballyUnavailable: true,
      freeCount: undefined,
    });
  });

  it("does not treat a working day with zero free slots for one event type as globally unavailable", () => {
    const datesByEventType = buildAvailableDatesFromSchedule(
      bookingSchedule,
      multiEventTypes,
      publicBookings,
    );

    expect(
      buildCalendarDaySummaries(
        bookingSchedule,
        publicBookings,
        datesByEventType,
        "deep-dive",
        { scheduleDays: bookingSchedule },
      )[2],
    ).toMatchObject({
      isoDate: "2026-04-17",
      freeCount: 0,
      isGloballyUnavailable: false,
    });
  });
```

- [ ] **Step 2: Run the helper test file and verify it fails**

Run:

```bash
cd /home/evgeny/projects/callplanner/apps/frontend && npm test -- src/lib/publicBookings.test.ts --run
```

Expected: FAIL because `buildCalendarDaySummaries` does not accept schedule context yet and `CalendarDaySummary` does not expose `isGloballyUnavailable`.

- [ ] **Step 3: Add the summary flag and schedule-context support**

Update `apps/frontend/src/types.ts` and `apps/frontend/src/lib/publicBookings.ts` with the smallest focused change:

```ts
export type CalendarDaySummary = {
  isoDate: string;
  weekdayShort: string;
  dayNumber: string;
  fullLabel: string;
  bookedCount: number;
  freeCount?: number;
  isGloballyUnavailable: boolean;
};
```

```ts
type CalendarSummaryContext = {
  scheduleDays?: ScheduleDay[];
  ownerSchedule?: OwnerSchedule | null;
};

function getScheduleDayBlockedDates(scheduleDays: ScheduleDay[]): Set<string> {
  return new Set(
    scheduleDays
      .filter((day) => Object.values(day.slotsByEventType).flat().length === 0)
      .map((day) => day.isoDate),
  );
}

function getOwnerScheduleBlockedDates(
  calendarDays: CalendarDay[],
  ownerSchedule: OwnerSchedule,
): Set<string> {
  return new Set(
    calendarDays
      .filter((day) => !ownerSchedule.workingDays.includes(getDayOfWeek(day.isoDate)))
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
    : context.ownerSchedule
      ? getOwnerScheduleBlockedDates(calendarDays, context.ownerSchedule)
      : new Set<string>();

  return calendarDays.map((day) => ({
    ...day,
    bookedCount: getBookedCount(day, bookings, selectedFilterId),
    freeCount: getFreeCount(day, availableDatesByEventType, selectedFilterId),
    isGloballyUnavailable: globallyUnavailableDates.has(day.isoDate),
  }));
}
```

Keep helper naming consistent with the final implementation and prefer extracting `getDayOfWeek()` as a tiny local utility instead of re-encoding weekday logic inline.

- [ ] **Step 4: Run the helper tests again and verify they pass**

Run:

```bash
cd /home/evgeny/projects/callplanner/apps/frontend && npm test -- src/lib/publicBookings.test.ts --run
```

Expected: PASS with the new blocked-day assertions and no regressions in the existing helper tests.

- [ ] **Step 5: Commit the helper/model change**

```bash
git add apps/frontend/src/types.ts apps/frontend/src/lib/publicBookings.ts apps/frontend/src/lib/publicBookings.test.ts
git commit -m "feat: track globally unavailable booking days"
```

### Task 2: Load Schedule Context In Public Home Runtime

**Files:**
- Modify: `apps/frontend/src/App.tsx`
- Modify: `apps/frontend/src/App.test.tsx`

- [ ] **Step 1: Write the failing runtime test**

Add a focused test in `apps/frontend/src/App.test.tsx` that proves the public home uses `/schedule` to mark blocked dates:

```tsx
  it("marks non-working public dates as blocked after loading the owner schedule", async () => {
    const user = userEvent.setup();
    const bookingDay = createApiBookingDay();

    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);

        if (url.endsWith("/schedule")) {
          return Promise.resolve(
            createJsonResponse({
              workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
              startTime: "09:00",
              endTime: "18:00",
            }),
          );
        }

        if (url.endsWith("/event-types")) {
          return Promise.resolve(createJsonResponse(singleEventType));
        }

        if (url.endsWith("/bookings")) {
          return Promise.resolve(createJsonResponse([]));
        }

        if (/\/event-types\/[^/]+\/availability$/.test(url)) {
          return Promise.resolve(
            createJsonResponse([
              {
                startAt: `${bookingDay.isoDate}T10:00:00Z`,
                endAt: `${bookingDay.isoDate}T10:30:00Z`,
              },
            ]),
          );
        }

        throw new Error(`Unexpected request: ${url}`);
      }),
    );

    render(<App />);

    await user.click(await screen.findByRole("button", { name: /сб/i }));

    expect(screen.getByRole("button", { name: "Записаться" })).toBeDisabled();
    expect(screen.getByText(/прием не ведется по расписанию/i)).toBeInTheDocument();
  });
```

Use a stable weekend date from the generated 14-day window so the assertion is tied to a non-working day and not to empty availability math.

- [ ] **Step 2: Run the App test and verify it fails**

Run:

```bash
cd /home/evgeny/projects/callplanner/apps/frontend && npm test -- src/App.test.tsx --run
```

Expected: FAIL because `App` does not keep owner schedule in public-home state and the public home cannot yet mark blocked dates.

- [ ] **Step 3: Implement schedule loading and summary wiring in `App.tsx`**

Add owner schedule to public-home state and pass it into `buildCalendarDaySummaries` indirectly through `PublicBookingsHome` props:

```ts
const [publicOwnerSchedule, setPublicOwnerSchedule] = useState<OwnerSchedule | null>(null);
```

```ts
const [guestEventTypesResult, bookingsResult, scheduleResult] = await Promise.allSettled([
  getGuestEventTypes(),
  listBookings(),
  getSchedule(),
]);

if (scheduleResult.status === "fulfilled") {
  setPublicOwnerSchedule(scheduleResult.value);
} else {
  setPublicOwnerSchedule(null);
}
```

```ts
<PublicBookingsHome
  bookings={bookings}
  eventTypes={guestEventTypes}
  availableDatesByEventType={datesByEventType}
  calendarDays={calendarDays}
  scheduleDays={isScenarioMode ? schedule : undefined}
  ownerSchedule={isScenarioMode ? null : publicOwnerSchedule}
  bookingEntryDisabledReason={bookingEntryDisabledReason}
  ...
/>
```

Do not broaden `bookingEntryDisabledReason` with schedule-loading failures in this iteration. If `/schedule` fails, keep booking available via existing event-type and availability data, and just fall back to the old rendering with no blocked-day marks.

- [ ] **Step 4: Re-run the App test and verify it passes**

Run:

```bash
cd /home/evgeny/projects/callplanner/apps/frontend && npm test -- src/App.test.tsx --run
```

Expected: PASS with the new runtime schedule test and no regressions in existing startup-flow coverage.

- [ ] **Step 5: Commit the App integration change**

```bash
git add apps/frontend/src/App.tsx apps/frontend/src/App.test.tsx
git commit -m "feat: load public schedule context for booking calendar"
```

### Task 3: Render The Blocked State In The Public Bookings UI

**Files:**
- Create: `apps/frontend/src/components/PublicBookingsHome.test.tsx`
- Modify: `apps/frontend/src/components/PublicBookingsHome.tsx`
- Modify: `apps/frontend/src/styles.css`

- [ ] **Step 1: Write the failing component tests**

Create `apps/frontend/src/components/PublicBookingsHome.test.tsx` with focused UI coverage:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { bookingSchedule, multiEventTypes, publicBookings } from "../data/mockGuestFlow";
import { buildAvailableDatesFromSchedule, buildCalendarDaySummaries } from "../lib/publicBookings";
import { PublicBookingsHome } from "./PublicBookingsHome";

it("disables booking and shows a blocked label for a schedule-blocked day", async () => {
  const user = userEvent.setup();
  const onStartBooking = vi.fn();
  const datesByEventType = buildAvailableDatesFromSchedule(bookingSchedule, multiEventTypes, publicBookings);

  render(
    <PublicBookingsHome
      bookings={publicBookings}
      eventTypes={multiEventTypes}
      availableDatesByEventType={datesByEventType}
      calendarDays={bookingSchedule.map(({ slotsByEventType: _slotsByEventType, ...day }) => day)}
      scheduleDays={bookingSchedule}
      workspace="public"
      onChangeWorkspace={() => undefined}
      onCancelBooking={() => undefined}
      onStartBooking={onStartBooking}
      initialSelectedDate="2026-04-19"
    />,
  );

  expect(screen.getByText(/запись недоступна/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Записаться" })).toBeDisabled();

  await user.click(screen.getByRole("button", { name: "Записаться" }));

  expect(onStartBooking).not.toHaveBeenCalled();
});
```

Add a second test with a local booking fixture on `2026-04-19` to verify the booking card still renders even when the day is blocked.

- [ ] **Step 2: Run the new component test file and verify it fails**

Run:

```bash
cd /home/evgeny/projects/callplanner/apps/frontend && npm test -- src/components/PublicBookingsHome.test.tsx --run
```

Expected: FAIL because `PublicBookingsHome` does not accept schedule context props, has no blocked-day label/class, and does not override the booking button reason for a blocked date.

- [ ] **Step 3: Implement blocked-day rendering and disable precedence**

Update `apps/frontend/src/components/PublicBookingsHome.tsx` so the component owns the final decision about the selected-day booking message:

```tsx
type PublicBookingsHomeProps = {
  ...
  scheduleDays?: ScheduleDay[];
  ownerSchedule?: OwnerSchedule | null;
};
```

```tsx
  const daySummaries = buildCalendarDaySummaries(
    calendarDays,
    bookings,
    availableDatesByEventType,
    selectedFilterId,
    { scheduleDays, ownerSchedule },
  );

  const selectedDayBookingReason = selectedDay?.isGloballyUnavailable
    ? "На этот день прием не ведется по расписанию."
    : bookingEntryDisabledReason;

  const isBookingEntryDisabled = Boolean(selectedDayBookingReason);
```

```tsx
className={[
  "booking-calendar-day",
  selected ? "booking-calendar-day--selected" : "",
  day.bookedCount > 0 ? "booking-calendar-day--booked" : "",
  day.isGloballyUnavailable ? "booking-calendar-day--unavailable" : "",
  noFreeSlots && !day.isGloballyUnavailable ? "booking-calendar-day--full" : "",
]
  .filter(Boolean)
  .join(" ")}
```

```tsx
{day.isGloballyUnavailable ? (
  <span>Запись недоступна</span>
) : selectedFilterId === ALL_EVENT_TYPES_FILTER ? null : isAvailabilityKnown ? (
  <span>{day.freeCount} свободно</span>
) : (
  <span>{availabilityState === "loading" ? "Слоты загружаются" : "Слоты уточняются"}</span>
)}
```

Keep the booking-list section unchanged except for using the merged disabled reason in the selected-day panel note.

- [ ] **Step 4: Add the disabled visual treatment and run UI tests**

Add a dedicated style in `apps/frontend/src/styles.css`:

```css
.booking-calendar-day--unavailable {
  background: linear-gradient(180deg, rgba(249, 255, 244, 0.62), rgba(218, 241, 210, 0.52));
  border-style: dashed;
  color: var(--color-text-secondary);
  opacity: 0.82;
}

.booking-calendar-day--unavailable .booking-calendar-day__meta strong {
  color: var(--color-text-secondary);
}
```

Then run:

```bash
cd /home/evgeny/projects/callplanner/apps/frontend && npm test -- src/components/PublicBookingsHome.test.tsx --run
cd /home/evgeny/projects/callplanner/apps/frontend && npm test -- --run
cd /home/evgeny/projects/callplanner/apps/frontend && npm run build
```

Expected: PASS for the new component coverage, PASS for the full frontend test suite, PASS for the production build.

- [ ] **Step 5: Commit the UI and regression updates**

```bash
git add apps/frontend/src/components/PublicBookingsHome.tsx apps/frontend/src/components/PublicBookingsHome.test.tsx apps/frontend/src/styles.css
git commit -m "feat: show blocked booking days in public calendar"
```

## Self-Review

- Spec coverage: helper state, runtime schedule loading, disabled calendar treatment, selected-day guard, and regression coverage are all mapped to tasks above.
- Placeholder scan: no `TBD` or deferred implementation notes remain.
- Type consistency: the plan uses one flag name, `isGloballyUnavailable`, and one schedule-context shape throughout.