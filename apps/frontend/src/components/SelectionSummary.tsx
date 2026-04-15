type SelectionSummaryValue =
  | {
      kind: "text";
      value: string;
    }
  | {
      kind: "event-type";
      title: string;
      durationLabel: string;
    };

type SelectionSummaryProps = {
  values: SelectionSummaryValue[];
};

export function SelectionSummary({ values }: SelectionSummaryProps) {
  if (values.length === 0) {
    return null;
  }

  return (
    <div className="selection-summary" aria-label="Результат предыдущих шагов">
      {values.map((value) => (
        value.kind === "event-type" ? (
          <span
            key={`${value.title}-${value.durationLabel}`}
            className="selection-summary__chip selection-summary__chip--event-type"
          >
            <span className="event-type-label">
              <span className="event-type-label__meta">{value.durationLabel}</span>
              <span className="event-type-label__title">{value.title}</span>
            </span>
          </span>
        ) : (
          <span key={value.value} className="selection-summary__chip">
            {value.value}
          </span>
        )
      ))}
    </div>
  );
}
