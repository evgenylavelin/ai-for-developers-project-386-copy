# Globally Unavailable Booking Days Design For Call Planner

## Goal

Define how the public bookings calendar should represent days where new booking is impossible because the base schedule does not allow any appointments on that date, regardless of event type.

This design refines the current calendar-state model so the UI can distinguish a day closed by schedule from a day that is merely full for one selected event type.

## Scope

This design covers:

- global day unavailability derived from schedule data
- calendar presentation for schedule-blocked days
- selected-day panel behavior for blocked days
- interaction between global blocked state and event-type-specific availability
- frontend data-model implications
- test expectations for the new state

This design does not cover:

- changes to authentication or roles
- changes to the 14-day booking window
- changes to booking ownership or public cancellation
- backend API contract changes

## Problem

The current public bookings calendar can already show:

- selected day
- days with bookings
- days with no free slots for the selected event type

However, it does not separately represent a stronger state: days where the base schedule does not allow booking at all.

As a result, a schedule-blocked day is visually too close to ordinary days and does not clearly communicate that starting a new booking is impossible regardless of event type.

## Product Decision

The calendar must expose a separate day state for schedule-blocked dates.

A date is schedule-blocked when the source schedule for that date contains no potential slots for any event type.

This state is global:

- it does not depend on the currently selected event type
- it remains visible in both `Все` mode and specific event-type mode
- it prevents starting a new booking from that day

## State Model

The calendar now distinguishes two different "no booking" cases:

### Globally Unavailable By Schedule

Meaning:

- the day is closed for booking in principle
- there are no potential schedule slots on that date for any event type

Consequences:

- the day is rendered as explicitly blocked
- the day cannot be used to launch a new booking
- the selected-day panel explains that booking is unavailable because the schedule is closed

### Full For Selected Event Type

Meaning:

- the day is generally open for booking
- for the currently selected event type, there are zero free slots

Consequences:

- the day remains selectable
- the UI explains that the selected type has no free slots
- this state is not shown in `Все` mode

These two states must not be merged into one visual treatment or one business rule.

## Source Of Truth

The new global blocked state must be derived from the base schedule representation, not from event-type-filtered availability.

Recommended interpretation:

- for each calendar date, inspect the schedule entry for that date
- sum or otherwise aggregate all potential slots across all event types
- if the total potential slot count is zero, the day is globally unavailable

This rule must remain independent from active bookings. Existing bookings on that date do not make the day available for new booking.

## Calendar Behavior

### Visibility

Schedule-blocked days remain visible within the 14-day calendar window.

They are not removed from the grid and do not collapse the layout.

### Appearance

Schedule-blocked days should look explicitly disabled rather than merely tinted with another green shade.

The treatment should communicate that the day is inactive for new booking. The exact styling can vary, but the intent is:

- weaker surface emphasis
- reduced contrast or stronger disabled treatment
- clear supporting label such as `Запись недоступна` or `Нет приёма`

### Selection

Schedule-blocked days may still be selectable in the calendar so the user can inspect existing bookings for that date.

Selecting such a day must not imply that booking can be created.

### Booking Launch

For schedule-blocked days, starting a new booking is disabled.

This applies in all filter modes, including `Все`.

## Selected-Day Panel Behavior

The selected-day panel continues to show:

- the selected date
- bookings for that date
- empty state or booking list as appropriate

When the selected date is schedule-blocked:

- the booking action is disabled or otherwise made inactive
- the panel explains that booking is not available because no appointments are offered on that day by schedule

If bookings already exist on a schedule-blocked day, those bookings remain visible. This is acceptable because the blocked state concerns new booking availability, not historical visibility.

## Interaction With Filters

### `Все` Mode

In `Все` mode:

- schedule-blocked days must still be visibly blocked
- event-type-specific `full` state is not relevant
- booked counts may still be shown if bookings exist on that date

### Specific Event Type Mode

In a specific event-type mode:

- schedule-blocked state takes precedence as the stronger unavailable state
- a day that is globally blocked must not be presented merely as full for the selected type
- a day that is globally open but has zero free slots for the selected type remains in the existing `full for selected event type` state

## Data Model Changes

The frontend calendar-day summary model should include an explicit boolean flag for the new state.

Recommended field:

- `isGloballyUnavailable`

Intent:

- computed once in the calendar summary logic
- consumed directly by the UI
- avoids re-deriving schedule semantics in the component layer

The component should not infer this state indirectly from free-slot counts for a selected event type.

## Testing Expectations

Tests should cover at least the following scenarios:

1. A day with zero potential schedule slots across all event types is marked globally unavailable.
2. A globally unavailable day stays blocked in both `Все` mode and specific event-type mode.
3. A globally unavailable day does not allow launching a new booking.
4. A day that is globally open but has zero free slots for one event type is not treated as globally unavailable.
5. Existing bookings on a globally unavailable day remain visible in the selected-day panel.

## Contract Alignment

No API contract change is required for this iteration if the frontend already has enough schedule data to derive the state.

If the backend later becomes the canonical source for calendar-day status, the contract may evolve to expose explicit day-state semantics. That is not required for this design.

## Summary

The public bookings calendar should add a distinct schedule-blocked day state.

This state is derived from the base schedule, visible regardless of filter, and prevents new booking from that date while still allowing the user to inspect the day in the calendar and view existing bookings.