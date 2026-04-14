# Event Type Maximum Duration Design

## Summary

Define an upper limit for `durationMinutes` on event types so the contract, backend validation, and owner UI all enforce the same business rule.

The approved rule is: event type duration must be an integer from `1` to `360` minutes inclusive.

## Scope

This design covers:

- API contract constraints for event type duration
- backend validation for create and update event type requests
- owner frontend form validation and input hints
- automated tests for accepted and rejected duration values

This design does not cover:

- changes to booking slot generation rules beyond using an already valid duration
- new duration presets or UI redesigns
- migration or persistence changes, because backend storage remains in-memory

## Constraints

The existing repository rules remain unchanged:

- no registration or authentication
- one fixed owner profile
- anonymous guest booking
- booking window remains limited to 14 days
- the same time slot cannot be booked twice, even across event types

This design only narrows the valid range for event type duration.

## Problem

The system currently validates only that `durationMinutes` is a positive integer.

Without an upper bound:

- the contract allows unrealistic event durations
- backend accepts values that do not match the intended product boundaries
- frontend cannot guide the owner toward a valid maximum

This leaves room for inconsistent behavior and weakens the contract-first workflow.

## Approved Rule

`durationMinutes` must satisfy all of the following:

- it is present in create and update requests
- it is an integer
- it is greater than or equal to `1`
- it is less than or equal to `360`

The same range applies everywhere the event type duration appears in the contract and application logic.

## Contract Changes

The TypeSpec contract must add `@maxValue(360)` anywhere `durationMinutes` is defined for:

- `EventType`
- `OwnerEventType`
- `CreateEventTypeRequest`
- `UpdateEventTypeRequest`

This keeps generated API descriptions aligned with runtime validation.

## Backend Behavior

The backend event type service must reject create and update payloads where `durationMinutes` is outside the inclusive range `1..360`.

Rejected requests return `400 bad_request`.

The validation message should clearly express the full rule so create and update flows behave consistently. The preferred message is:

`durationMinutes must be an integer between 1 and 360.`

## Frontend Behavior

The owner event type form must enforce the same inclusive range `1..360` before sending a request.

The duration input should expose the upper bound through standard input attributes so the browser and assistive tooling can reflect the rule.

The validation copy should clearly state both bounds. The preferred message is:

`Длительность должна быть указана в минутах от 1 до 360.`

This is a validation-only change. The owner event type screen layout and interaction model do not change.

## Testing

Automated coverage should prove the following cases:

- backend accepts `1` and `360`
- backend rejects `0`
- backend rejects `361`
- frontend form validation accepts `1` and `360`
- frontend form validation rejects `0`
- frontend form validation rejects `361`

Where practical, tests should target existing validation units first and then confirm the API-facing behavior already covered by backend integration tests.

## Acceptance Criteria

- the API contract documents a maximum duration of `360` minutes
- backend create event type rejects durations above `360` with `400 bad_request`
- backend update event type rejects durations above `360` with `400 bad_request`
- owner form validation rejects durations above `360`
- the owner duration input exposes `360` as the HTML maximum
- valid durations at the boundaries `1` and `360` remain accepted