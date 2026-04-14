type ContactsStepProps = {
  name: string;
  email: string;
  error?: string;
  emailInvalid?: boolean;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
};

export function ContactsStep({
  name,
  email,
  error,
  emailInvalid,
  onNameChange,
  onEmailChange,
}: ContactsStepProps) {
  return (
    <div className="stack">
      <label className="field">
        <span className="field-label">
          <span>Имя</span>
          <span className="required-mark" aria-hidden="true">
            *
          </span>
        </span>
        <input
          type="text"
          name="name"
          autoComplete="name"
          required
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
        />
      </label>

      <label className="field">
        <span className="field-label">
          <span>Email</span>
          <span className="required-mark" aria-hidden="true">
            *
          </span>
        </span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          aria-invalid={emailInvalid}
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
        />
      </label>

      {error ? <p className="error-copy">{error}</p> : null}
    </div>
  );
}
