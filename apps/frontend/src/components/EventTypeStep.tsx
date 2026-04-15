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
            <span className="event-type-label">
              <span className="event-type-label__meta">{formatDuration(eventType.durationMinutes)}</span>
              <span className="event-type-label__title">{eventType.title}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
