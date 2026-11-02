import { ApiError } from "../api/client";
import type { StockShortage } from "../types";
import { localeStore, translateDynamic, type Translate } from ".";

/** Turns any thrown error into a sentence in the current language. */
export function describeError(err: unknown, t: Translate): string {
  if (!(err instanceof ApiError)) return t("error.server_error");
  const locale = localeStore.getState();

  if (err.code === "insufficient_stock") {
    const shortages = (err.details?.shortages as StockShortage[] | undefined) ?? [];
    const items = shortages.map((s) => `${s.name} (${t("pos.left", { count: s.available })})`).join(", ");
    return t("error.insufficient_stock", { items });
  }
  return (
    translateDynamic(locale, `error.${err.code}`, err.details) ??
    (err.status ? t("error.unknown", { status: err.status }) : err.message)
  );
}

/** Server field codes ("required", "taken"…) rendered with the form's own label. */
export function describeFieldError(code: string, label: string): string {
  const locale = localeStore.getState();
  return translateDynamic(locale, `field.${code}`, { label }) ?? translateDynamic(locale, "field.invalid", { label })!;
}
