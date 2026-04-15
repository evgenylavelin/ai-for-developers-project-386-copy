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
