import type { ZodIssue, ZodType, ZodTypeDef } from "zod";
import { HttpError, type FieldCode } from "./http.js";

function toFieldCode(issue: ZodIssue): FieldCode {
  switch (issue.code) {
    case "invalid_type":
      if (issue.received === "undefined" || issue.received === "null") return "required";
      if (issue.expected === "integer") return "not_integer";
      return "invalid";
    case "too_small":
      if (issue.type === "string" || issue.type === "array") return "required";
      return "negative";
    case "too_big":
      return issue.type === "string" ? "too_long" : "too_large";
    default:
      return "invalid";
  }
}

/** Parses a body, turning Zod issues into translatable per-field codes. */
export function parseBody<T>(schema: ZodType<T, ZodTypeDef, unknown>, body: unknown): T {
  const result = schema.safeParse(body ?? {});
  if (result.success) return result.data;
  const fields: Record<string, FieldCode> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "_";
    fields[key] ??= toFieldCode(issue);
  }
  throw new HttpError(400, "validation_failed", "Some fields need attention.", fields);
}
