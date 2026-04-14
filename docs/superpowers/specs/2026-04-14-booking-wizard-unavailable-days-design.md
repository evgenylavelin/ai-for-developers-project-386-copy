# Booking Wizard Unavailable Days Design

## Summary

The booking wizard currently renders days with zero free slots as ordinary calendar cells with a `0 сл.` counter.
This differs from the public bookings calendar, where unavailable days are visually emphasized with a blocked-day treatment and explicit unavailable copy.

The booking wizard should use the same unavailable-day semantics so users can immediately distinguish selectable days from days that cannot be booked.

## Scope

This change applies only to the frontend booking wizard date-and-time step.

It does not change:

- the API contract in `spec/`
- backend behavior
- the 14-day booking window
- event-type selection rules
- slot selection logic

## Current Problem

In the wizard, a day remains visible in the 14-day range even when the selected event type has zero free slots on that date.
That behavior is correct, but the current UI represents the day as a normal cell with a numeric slot counter.

As a result:

- unavailable days are not visually distinct enough
- the wizard behaves inconsistently with the public bookings calendar
- users have to infer that `0 сл.` means "cannot book"

## Desired Behavior

In the booking wizard, a day is considered unavailable when the selected event type has zero free slots for that date.

This is derived from the existing frontend data model:

- the day remains in the 14-day calendar window
- the day is unavailable when `date.slots.length === 0`

No API or backend changes are required.

## UI Behavior

The wizard calendar should apply the same blocked-day visual language already used on the public bookings screen:

- unavailable days use the blocked visual treatment
- unavailable days replace the slot counter with the explicit status text `Запись недоступна`
- unavailable days remain visible in the calendar grid

If an unavailable day is selected, it should still keep the unavailable visual treatment in the selected state.

The rest of the step behavior remains unchanged:

- the selected day can still be shown in the detail area
- the detail area continues to show the empty state when no slots are available
- available days continue to show the compact slot counter

## Implementation Direction

The booking wizard should reuse the existing unavailable-day semantics from the public bookings experience instead of introducing a second independent interpretation.

Implementation should:

- derive an explicit unavailable flag in the wizard day rendering path
- map zero-slot days to the unavailable visual state
- reuse existing styling patterns where practical, while keeping the wizard layout intact

This keeps both calendar experiences aligned without changing their underlying data sources.

## Testing

Frontend coverage should verify:

- a day with zero slots in `DateTimeStep` renders with the unavailable visual state
- a zero-slot day shows `Запись недоступна` instead of `0 сл.`
- selecting an unavailable day preserves the unavailable styling and still shows the no-slots state in the detail panel

## Out Of Scope

This design does not introduce:

- new unavailable-day API fields
- schedule recomputation logic
- changes to how the wizard chooses the initial active day
- changes to slot filtering rules
