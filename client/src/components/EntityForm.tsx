import { useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError } from "../api/client";
import { useT } from "../i18n";
import { describeError, describeFieldError } from "../i18n/errors";
import { formatIDR, parseRupiah } from "../lib/format";

export type FieldValues = Record<string, string | number>;

export interface FieldDef {
  name: string;
  label: string;
  type: "text" | "number" | "money" | "select";
  required?: boolean;
  min?: number;
  options?: { value: string; label: string }[];
  hint?: string;
  placeholder?: string;
}

interface EntityFormProps {
  fields: FieldDef[];
  initialValues: FieldValues;
  submitLabel: string;
  onSubmit: (values: FieldValues) => Promise<void>;
  onCancel: () => void;
}

/**
 * Schema-driven form shared by every CRUD module. It owns the boring parts —
 * string/number conversion, required/min checks, server field errors, busy state —
 * so each module declares fields instead of re-implementing them.
 * Server errors arrive as codes and are translated with the field's own label.
 */
export function EntityForm({ fields, initialValues, submitLabel, onSubmit, onCancel }: EntityFormProps) {
  const t = useT();
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.name, String(initialValues[f.name] ?? "")])),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // After a failed save, put the cashier on the first field that needs fixing.
  useEffect(() => {
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [errors]);

  const parse = (): { values: FieldValues; errors: Record<string, string> } => {
    const values: FieldValues = {};
    const found: Record<string, string> = {};
    for (const field of fields) {
      const raw = draft[field.name].trim();
      const label = field.label;
      if (field.required && raw === "") {
        found[field.name] = t("field.required", { label });
        continue;
      }
      if (field.type === "number" || field.type === "money") {
        const value = field.type === "money" ? parseRupiah(raw) : Number(raw);
        if (!Number.isInteger(value)) found[field.name] = t("field.not_integer", { label });
        else if (field.min !== undefined && value < field.min) found[field.name] = t("field.min", { label, min: field.min });
        values[field.name] = value;
      } else {
        values[field.name] = raw;
      }
    }
    return { values, errors: found };
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const { values, errors: found } = parse();
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    try {
      await onSubmit(values);
    } catch (err) {
      if (err instanceof ApiError) {
        const labelOf = (name: string) => fields.find((f) => f.name === name)?.label ?? name;
        setErrors(
          Object.fromEntries(Object.entries(err.fields).map(([name, code]) => [name, describeFieldError(code, labelOf(name))])),
        );
      }
      setFormError(describeError(err, t));
      setBusy(false);
    }
  };

  return (
    <form ref={formRef} className="entity-form" onSubmit={submit} noValidate>
      {formError && (
        <p className="form-error" role="alert">
          {formError}
        </p>
      )}
      <div className="form-grid">
        {fields.map((field, index) => {
          const id = `field-${field.name}`;
          const error = errors[field.name];
          const describedBy = [error && `${id}-error`, field.hint && `${id}-hint`].filter(Boolean).join(" ") || undefined;
          const common = {
            id,
            name: field.name,
            className: `input${error ? " input-invalid" : ""}`,
            "aria-invalid": error ? true : undefined,
            "aria-describedby": describedBy,
            "data-autofocus": index === 0 ? "" : undefined,
            value: draft[field.name],
          };
          const set = (value: string) => setDraft((d) => ({ ...d, [field.name]: value }));
          return (
            <div key={field.name} className={`field field-${field.type}`}>
              <label htmlFor={id}>
                {field.label}
                {!field.required && <span className="field-optional"> {t("common.optional")}</span>}
              </label>
              {field.type === "select" ? (
                <select {...common} onChange={(e) => set(e.target.value)}>
                  <option value="" disabled>
                    {t("common.choose")}
                  </option>
                  {field.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  {...common}
                  type="text"
                  inputMode={field.type === "text" ? undefined : "numeric"}
                  placeholder={field.placeholder}
                  autoComplete="off"
                  onChange={(e) => set(e.target.value)}
                />
              )}
              {field.type === "money" && draft[field.name] !== "" && !error && (
                <span className="field-hint">{formatIDR(parseRupiah(draft[field.name]))}</span>
              )}
              {field.hint && (
                <span id={`${id}-hint`} className="field-hint">
                  {field.hint}
                </span>
              )}
              {error && (
                <span id={`${id}-error`} className="field-error">
                  {error}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <footer className="form-actions">
        <button type="button" className="button button-quiet" onClick={onCancel}>
          {t("common.cancel")}
        </button>
        <button type="submit" className="button button-primary" disabled={busy}>
          {busy ? t("common.saving") : submitLabel}
        </button>
      </footer>
    </form>
  );
}
