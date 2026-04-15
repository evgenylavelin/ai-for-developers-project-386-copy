# Booking Wizard Event Type Duration Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update guest booking wizard event type cards so duration is rendered with the same split `мин` plus numeric value treatment used on the public bookings page.

**Architecture:** Keep the change local to the frontend wizard UI. Update the event type step markup to render a dedicated duration block, then add focused CSS so the duration unit and value match the established public bookings visual pattern without changing wizard behavior.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, CSS

---

### Task 1: Align Wizard Event Type Duration UI

**Files:**
- Modify: `apps/frontend/src/App.test.tsx`
- Modify: `apps/frontend/src/components/EventTypeStep.tsx`
- Modify: `apps/frontend/src/styles.css`

- [ ] **Step 1: Write the failing test**

Add a test near the other `GuestBookingPage` tests in `apps/frontend/src/App.test.tsx`:

```tsx
  it("renders wizard event type duration with separate unit and value", () => {
    render(<GuestBookingPage eventTypes={multiEventTypes} datesByEventType={bookingSchedule} />);

    const strategyCard = screen.getByRole("button", {
      name: /Стратегическая сессия, 60 мин/i,
    });

    expect(within(strategyCard).getByText("мин")).toBeInTheDocument();
    expect(within(strategyCard).getByText("60")).toBeInTheDocument();
    expect(within(strategyCard).queryByText("60 минут")).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run frontend:test -- --run apps/frontend/src/App.test.tsx -t "renders wizard event type duration with separate unit and value"`

Expected: FAIL because the event type step still renders duration as a single text node like `60 минут`.

- [ ] **Step 3: Write minimal implementation**

Update `apps/frontend/src/components/EventTypeStep.tsx` to render an accessible duration block:

```tsx
import type { EventType } from "../types";

type EventTypeStepProps = {
  eventTypes: EventType[];
  selectedEventTypeId?: string;
  onSelect: (eventTypeId: string) => void;
};

function formatDuration(durationMinutes: number): string {
  return `${durationMinutes} мин`;
}

export function EventTypeStep({
  eventTypes,
  selectedEventTypeId,
  onSelect,
}: EventTypeStepProps) {
  return (
    <div className="stack">
      {eventTypes.map((eventType) => {
        const selected = eventType.id === selectedEventTypeId;

        return (
          <button
            key={eventType.id}
            type="button"
            aria-label={`${eventType.title}, ${formatDuration(eventType.durationMinutes)}`}
            className={`choice-card${selected ? " choice-card--selected" : ""}`}
            onClick={() => onSelect(eventType.id)}
          >
            <span className="choice-card__title">{eventType.title}</span>
            <span className="choice-card__duration" aria-hidden="true">
              <span className="choice-card__duration-unit">мин</span>
              <span className="choice-card__duration-value">{eventType.durationMinutes}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
```

Update `apps/frontend/src/styles.css` near the existing `.choice-card` rules:

```css
.choice-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.choice-card__title {
  font-weight: 600;
  text-align: left;
}

.choice-card__duration {
  position: relative;
  flex-shrink: 0;
  display: inline-block;
  min-width: 2.5rem;
  padding-top: 0.8rem;
  text-align: left;
}

.choice-card__duration-unit {
  position: absolute;
  top: 0;
  left: 0;
  font-size: 0.68rem;
  line-height: 1;
  color: var(--color-text-secondary);
}

.choice-card__duration-value {
  display: block;
  font-size: 1.1rem;
  font-weight: 600;
  line-height: 1;
}
```

- [ ] **Step 4: Run targeted tests to verify the change**

Run: `npm run frontend:test -- --run apps/frontend/src/App.test.tsx -t "renders wizard event type duration with separate unit and value"`

Expected: PASS

Run: `npm run frontend:test -- --run apps/frontend/src/App.test.tsx -t "keeps the event type selected when returning from date and time to the event type step"`

Expected: PASS, confirming the UI change did not alter wizard behavior.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/App.test.tsx apps/frontend/src/components/EventTypeStep.tsx apps/frontend/src/styles.css docs/superpowers/plans/2026-04-15-booking-wizard-event-type-duration-display.md
git commit -m "feat: align wizard event type duration display"
```
