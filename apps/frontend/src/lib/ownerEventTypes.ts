import type { OwnerEventType, OwnerEventTypeForm, OwnerEventTypeInput } from "../types";

const MIN_EVENT_TYPE_DURATION_MINUTES = 1;
const MAX_EVENT_TYPE_DURATION_MINUTES = 360;
const EVENT_TYPE_DURATION_ERROR = "Длительность должна быть указана в минутах от 1 до 360.";

export function createEmptyOwnerEventTypeForm(): OwnerEventTypeForm {
  return {
    title: "",
    description: "",
    durationMinutes: "",
  };
}

export function buildOwnerEventTypeForm(eventType: OwnerEventType): OwnerEventTypeForm {
  return {
    title: eventType.title,
    description: eventType.description ?? "",
    durationMinutes: String(eventType.durationMinutes),
  };
}

export function validateOwnerEventTypeForm(form: OwnerEventTypeForm): string {
  if (!form.title.trim()) {
    return "Укажите название типа события.";
  }

  const durationMinutes = Number(form.durationMinutes);

  if (
    !Number.isInteger(durationMinutes) ||
    durationMinutes < MIN_EVENT_TYPE_DURATION_MINUTES ||
    durationMinutes > MAX_EVENT_TYPE_DURATION_MINUTES
  ) {
    return EVENT_TYPE_DURATION_ERROR;
  }

  return "";
}

export function buildOwnerEventTypeInput(form: OwnerEventTypeForm): OwnerEventTypeInput {
  return {
    title: form.title.trim(),
    description: form.description.trim() || undefined,
    durationMinutes: Number(form.durationMinutes),
  };
}
