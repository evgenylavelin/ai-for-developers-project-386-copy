type SuccessStateProps = {
  actionLabel?: string;
  onAction: () => void;
  summary: string;
};

export function SuccessState({ actionLabel = "Вернуться в начало", onAction, summary }: SuccessStateProps) {
  return (
    <section className="panel">
      <p className="eyebrow">Call Planner</p>
      <h1>Бронирование подтверждено</h1>
      <p className="panel-copy">Детали встречи сохранены.</p>
      <p className="selection-summary selection-summary--success">{summary}</p>
      <div className="actions">
        <span />
        <button type="button" className="primary-button" onClick={onAction}>
          {actionLabel}
        </button>
      </div>
    </section>
  );
}
