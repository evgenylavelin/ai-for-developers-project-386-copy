# Playwright E2E Design

## Summary

Add browser-based end-to-end checks for the guest booking flow using Playwright.

The goal is to verify that the frontend and backend work together in the real application path: opening the public bookings page, selecting a slot, submitting guest contacts, and observing the expected result on screen.

## Scope

This design covers:

- Playwright setup for the repository
- three browser scenarios for the guest booking flow
- test helpers for preparing backend state through existing API endpoints
- CI execution for the e2e suite
- documentation updates for local execution

This design does not cover:

- changes to the TypeSpec contract in `spec/`
- new product behavior outside the existing booking flow
- replacing existing unit or integration tests

## Constraints

The design must preserve current project rules:

- no registration or authentication
- one fixed owner profile
- anonymous guest booking
- booking window remains limited to 14 days
- the same time slot cannot be booked twice, even across event types

The API contract remains the source of truth. The e2e layer must test only behavior already described in `spec/` and already present in the app.

## Goals

- verify the main booking path in a real browser
- cover the three scenarios listed in `docs/testing/e2e-scenarios.md`
- keep the setup minimal and aligned with the current repo structure
- make the suite runnable both locally and in GitHub Actions

## Tooling Approach

Use Playwright as the e2e runner at the repository root.

Root-level setup is the most practical fit here because the test suite needs to orchestrate both `apps/frontend` and `apps/backend`. It also keeps the execution model simple for CI: install dependencies once, launch the two applications, then run the browser tests.

The design uses real HTTP calls against the running backend and a real browser against the running frontend. Network mocking is not part of the e2e layer.

## Test Structure

The e2e suite will live under `tests/e2e/`.

Planned files:

- `playwright.config.ts`
- `tests/e2e/booking-flow.spec.ts`
- `tests/e2e/helpers/api.ts` if the setup logic becomes large enough to justify extraction

The first implementation should prefer one spec file for the three scenarios so the suite stays easy to understand and maintain. Helper extraction is allowed only for repeated API setup logic.

## State Preparation

The backend currently uses in-memory storage. This is useful for e2e because each fresh backend process starts from a known empty state.

Before each test, the suite prepares the minimum required state through already supported API operations:

- set owner schedule with `PUT /schedule`
- create an event type with `POST /owner/event-types`
- read free availability with `GET /event-types/{eventTypeId}/availability`

This keeps the tests aligned with the contract and avoids hidden fixtures outside the application API.

For the slot-conflict scenario, the test uses `POST /bookings` to occupy the selected interval after the browser has already selected it and before the final submit in the UI. This reproduces the real conflict path without introducing special test-only endpoints.

## Scenarios

### Scenario 1: Successful Booking

The test prepares one bookable event type and a working schedule with at least one free slot in the next 14 days.

In the browser, the guest:

- opens the public bookings page
- selects a day with availability
- starts booking
- selects the event type if that step is shown
- selects a free slot
- enters valid contact details
- confirms the booking

Assertions:

- the success screen appears
- the screen shows the selected event type, date and time, and guest email
- after navigating back to the public bookings view, the same slot is no longer available for booking

### Scenario 2: Slot Conflict Before Submit

The test prepares the same initial state and advances the browser flow up to the contacts step for a selected slot.

Before the UI submit, the test creates a competing booking for the same interval through the backend API.

Assertions:

- the booking is rejected
- the success screen does not appear
- the user remains in the booking flow
- a visible error message is shown

### Scenario 3: Validation Errors

The test advances the browser flow to the contacts step.

It then submits:

- an empty contact form
- a form with an invalid email

Assertions:

- validation feedback is shown in the UI
- the booking is not created
- the success screen does not appear

Because this validation is already performed in the frontend flow, the test does not require backend-side validation setup beyond the slot preparation needed to reach the contacts step.

## Locator Strategy

Tests should prefer stable semantic selectors:

- headings
- button names
- form labels
- visible status and error text

The suite should avoid brittle CSS-driven selectors where possible. If the current UI lacks enough stable accessible names for reliable e2e selectors, small non-behavioral accessibility improvements are acceptable.

## CI Design

Add a dedicated GitHub Actions workflow for e2e checks.

The workflow should:

- run on `push` and `pull_request`
- install root, frontend, and backend dependencies through the existing npm layout
- install Playwright browsers
- start backend and frontend
- wait for the frontend URL to become available
- run the Playwright suite
- upload Playwright artifacts on failure

The existing `hexlet-check` workflow remains untouched.

## Documentation Updates

Update `README.md` to document:

- Playwright as the e2e tool
- the local command used to run browser tests
- where the e2e tests live

Update `AGENTS.md` to reflect that local e2e commands now exist and to keep the testing guidance aligned with the repository reality.

The scenario list in `docs/testing/e2e-scenarios.md` remains the human-readable reference for the flows covered by the suite.

## Acceptance Criteria

- Playwright is configured in the repository
- the repository has automated browser tests for the three documented booking scenarios
- the tests exercise frontend and backend together, not mocked network calls
- the suite can be run locally with a documented command
- the suite runs in GitHub Actions
- no contract changes are introduced unless an actual unsupported behavior is discovered during implementation
