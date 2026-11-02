/**
 * Every API error carries a stable `code` the client translates (EN/ID),
 * plus an English `message` for logs and direct API consumers.
 */
export type ErrorCode =
  | "validation_failed"
  | "invalid_json"
  | "endpoint_not_found"
  | "product_not_found"
  | "category_not_found"
  | "sku_taken"
  | "category_missing"
  | "category_name_taken"
  | "category_in_use"
  | "insufficient_stock"
  | "payment_short"
  | "demo_reset_disabled"
  | "database_unavailable"
  | "server_error";

/** Field-level codes, translated client-side as "<label> is required." etc. */
export type FieldCode = "required" | "not_integer" | "negative" | "too_long" | "too_large" | "invalid" | "taken";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly fields?: Record<string, FieldCode>,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

/** Postgres error helpers. Both node-postgres and PGlite expose SQLSTATE as `code`. */
export const PG_UNIQUE_VIOLATION = "23505";
export const PG_FOREIGN_KEY_VIOLATION = "23503";

export function pgErrorCode(err: unknown): string | undefined {
  return typeof err === "object" && err !== null && "code" in err ? String((err as { code: unknown }).code) : undefined;
}

export function pgConstraint(err: unknown): string {
  if (typeof err !== "object" || err === null) return "";
  const e = err as { constraint?: string; message?: string };
  return e.constraint ?? e.message ?? "";
}
