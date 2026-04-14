# Event Type Duration Max Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce an inclusive `1..360` minute duration range for event types in the API contract, backend runtime validation, and owner frontend form validation.

**Architecture:** Extend the TypeSpec contract with a max constraint, keep backend validation centralized in `EventTypeService`, and mirror the same rule in the frontend owner-event-type helper so the UI rejects invalid values before submission. Cover the change with focused backend and frontend tests, then regenerate the OpenAPI output and run targeted validation commands.

**Tech Stack:** TypeSpec, OpenAPI generation, Fastify, TypeScript, React, Vitest

---

## File Map

- Modify: `spec/models.tsp`
  Add `@maxValue(360)` to every event type duration field.

- Modify: `spec/routes.tsp`
  Align owner-event-type route documentation with the new bounded duration rule.

- Modify: `tsp-output/schema/openapi.yaml`
  Regenerate the OpenAPI schema from the updated TypeSpec contract.

- Modify: `apps/backend/src/services/eventTypeService.ts`
  Replace the old positive-only validation with a shared inclusive range check and consistent error message.

- Modify: `apps/backend/src/app.test.ts`
  Lock create and update API behavior for boundary and over-limit values.

- Modify: `apps/frontend/src/lib/ownerEventTypes.ts`
  Update owner form validation copy to use the inclusive `1..360` rule.

- Modify: `apps/frontend/src/lib/ownerEventTypes.test.ts`
  Cover accepted boundary values and rejected over-limit values.

- Modify: `apps/frontend/src/components/OwnerEventTypesPage.tsx`
  Expose `max="360"` on the numeric duration input.

### Task 1: Lock The New Range In Tests And Contract

**Files:**
- Modify: `apps/backend/src/app.test.ts`
- Modify: `apps/frontend/src/lib/ownerEventTypes.test.ts`
- Modify: `spec/models.tsp`
- Modify: `spec/routes.tsp`

- [ ] **Step 1: Add failing backend coverage for durations above 360 and accepted boundary values**

Update `apps/backend/src/app.test.ts` by replacing the existing positive-only rejection test and adding an update-path rejection test:

```ts
  it("rejects event types with duration outside 1 to 360 minutes", async () => {
    const app = createApp();

    const tooSmallResponse = await app.inject({
      method: "POST",
      url: "/owner/event-types",
      payload: {
        title: "Ошибка",
        description: "Некорректная длительность.",
        durationMinutes: 0,
      },
    });

    expect(tooSmallResponse.statusCode).toBe(400);
    expect(tooSmallResponse.json()).toEqual({
      code: "bad_request",
      message: "durationMinutes must be an integer between 1 and 360.",
    });

    const tooLargeResponse = await app.inject({
      method: "POST",
      url: "/owner/event-types",
      payload: {
        title: "Длинная встреча",
        description: "Слишком длинная длительность.",
        durationMinutes: 361,
      },
    });

    expect(tooLargeResponse.statusCode).toBe(400);
    expect(tooLargeResponse.json()).toEqual({
      code: "bad_request",
      message: "durationMinutes must be an integer between 1 and 360.",
    });

    const acceptedResponse = await app.inject({
      method: "POST",
      url: "/owner/event-types",
      payload: {
        title: "Длинная стратегия",
        description: "Граничное валидное значение.",
        durationMinutes: 360,
      },
    });

    expect(acceptedResponse.statusCode).toBe(201);
    expect(acceptedResponse.json()).toEqual(
      expect.objectContaining({
        title: "Длинная стратегия",
        durationMinutes: 360,
      }),
    );

    await app.close();
  });

  it("rejects event type updates with duration above 360 minutes", async () => {
    const app = createApp();

    const createResponse = await app.inject({
      method: "POST",
      url: "/owner/event-types",
      payload: {
        title: "Стратегия",
        description: "Базовый тип.",
        durationMinutes: 60,
      },
    });

    const { id } = createResponse.json() as { id: string };

    const response = await app.inject({
      method: "PATCH",
      url: `/owner/event-types/${id}`,
      payload: {
        title: "Стратегия",
        description: "Базовый тип.",
        durationMinutes: 361,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      code: "bad_request",
      message: "durationMinutes must be an integer between 1 and 360.",
    });

    await app.close();
  });
```

- [ ] **Step 2: Add failing frontend helper coverage for the inclusive range**

Update `apps/frontend/src/lib/ownerEventTypes.test.ts` so the helper test asserts both rejected and accepted boundaries:

```ts
  it("validates required fields and duration range", () => {
    expect(
      validateOwnerEventTypeForm({
        title: "   ",
        description: "Описание",
        durationMinutes: "30",
      }),
    ).toBe("Укажите название типа события.");

    expect(
      validateOwnerEventTypeForm({
        title: "Созвон",
        description: "   ",
        durationMinutes: "0",
      }),
    ).toBe("Длительность должна быть указана в минутах от 1 до 360.");

    expect(
      validateOwnerEventTypeForm({
        title: "Созвон",
        description: "   ",
        durationMinutes: "361",
      }),
    ).toBe("Длительность должна быть указана в минутах от 1 до 360.");

    expect(
      validateOwnerEventTypeForm({
        title: "Созвон",
        description: "   ",
        durationMinutes: "1",
      }),
    ).toBe("");

    expect(
      validateOwnerEventTypeForm({
        title: "Созвон",
        description: "   ",
        durationMinutes: "360",
      }),
    ).toBe("");
  });
```

- [ ] **Step 3: Add the contract constraint and route wording**

Update `spec/models.tsp` so every event-type duration field uses the same bound:

```typespec
  @minValue(1)
  @maxValue(360)
  durationMinutes: int32;
```

Apply this exact two-annotation pattern in:

- `EventType`
- `OwnerEventType`
- `CreateEventTypeRequest`
- `UpdateEventTypeRequest`

Also update the owner create route comment in `spec/routes.tsp`:

```typespec
   * Creates a new event type with duration from 1 to 360 minutes.
```

- [ ] **Step 4: Run focused tests before implementation and verify they fail**

Run:

```bash
cd /home/evgeny/projects/callplanner/apps/backend && npm test -- src/app.test.ts --run
cd /home/evgeny/projects/callplanner/apps/frontend && npm test -- src/lib/ownerEventTypes.test.ts --run
```

Expected:

- backend tests fail because runtime still returns the old positive-only message and accepts `361`
- frontend helper test fails because the helper still allows only the old `> 0` rule and old copy

### Task 2: Implement Runtime And UI Validation

**Files:**
- Modify: `apps/backend/src/services/eventTypeService.ts`
- Modify: `apps/frontend/src/lib/ownerEventTypes.ts`
- Modify: `apps/frontend/src/components/OwnerEventTypesPage.tsx`

- [ ] **Step 1: Centralize backend range validation**

Update `apps/backend/src/services/eventTypeService.ts` to use a shared validator:

```ts
const MIN_EVENT_TYPE_DURATION_MINUTES = 1;
const MAX_EVENT_TYPE_DURATION_MINUTES = 360;
const EVENT_TYPE_DURATION_ERROR =
  `durationMinutes must be an integer between ${MIN_EVENT_TYPE_DURATION_MINUTES} and ${MAX_EVENT_TYPE_DURATION_MINUTES}.`;

function assertValidEventTypeDuration(durationMinutes: number): void {
  if (
    !Number.isInteger(durationMinutes) ||
    durationMinutes < MIN_EVENT_TYPE_DURATION_MINUTES ||
    durationMinutes > MAX_EVENT_TYPE_DURATION_MINUTES
  ) {
    throw new AppError(400, "bad_request", EVENT_TYPE_DURATION_ERROR);
  }
}
```

Then replace both create/update inline checks and the `typeof durationMinutes !== "number"` branch with `EVENT_TYPE_DURATION_ERROR` plus `assertValidEventTypeDuration(payload.durationMinutes)`.

- [ ] **Step 2: Mirror the inclusive range in frontend helper validation**

Update `apps/frontend/src/lib/ownerEventTypes.ts`:

```ts
const MIN_EVENT_TYPE_DURATION_MINUTES = 1;
const MAX_EVENT_TYPE_DURATION_MINUTES = 360;
const EVENT_TYPE_DURATION_ERROR = "Длительность должна быть указана в минутах от 1 до 360.";
```

Use those constants in `validateOwnerEventTypeForm`:

```ts
  if (
    !Number.isInteger(durationMinutes) ||
    durationMinutes < MIN_EVENT_TYPE_DURATION_MINUTES ||
    durationMinutes > MAX_EVENT_TYPE_DURATION_MINUTES
  ) {
    return EVENT_TYPE_DURATION_ERROR;
  }
```

- [ ] **Step 3: Expose the HTML input maximum in the owner form**

Update the duration field in `apps/frontend/src/components/OwnerEventTypesPage.tsx`:

```tsx
                  type="number"
                  min="1"
                  max="360"
                  step="5"
```

Keep all existing accessibility wiring unchanged.

- [ ] **Step 4: Run focused tests and verify they pass**

Run:

```bash
cd /home/evgeny/projects/callplanner/apps/backend && npm test -- src/app.test.ts --run
cd /home/evgeny/projects/callplanner/apps/frontend && npm test -- src/lib/ownerEventTypes.test.ts --run
```

Expected: PASS for the new range assertions and no regressions in existing coverage.

### Task 3: Regenerate Contract Output And Final Verification

**Files:**
- Modify: `tsp-output/schema/openapi.yaml`
- Verify: `spec/models.tsp`
- Verify: `apps/backend/src/services/eventTypeService.ts`
- Verify: `apps/frontend/src/components/OwnerEventTypesPage.tsx`

- [ ] **Step 1: Regenerate the OpenAPI schema from TypeSpec**

Run:

```bash
cd /home/evgeny/projects/callplanner && npm run spec:compile
```

Expected: successful TypeSpec compile and an updated `tsp-output/schema/openapi.yaml` with `minimum: 1` and `maximum: 360` on event type duration fields.

- [ ] **Step 2: Run targeted build and test validation**

Run:

```bash
cd /home/evgeny/projects/callplanner && npm run backend:build
cd /home/evgeny/projects/callplanner && npm run frontend:build
cd /home/evgeny/projects/callplanner && npm run backend:test -- --run src/app.test.ts
cd /home/evgeny/projects/callplanner && npm run frontend:test -- --run src/lib/ownerEventTypes.test.ts
```

Expected: all commands succeed, confirming contract generation, type-checking, and targeted regression coverage.