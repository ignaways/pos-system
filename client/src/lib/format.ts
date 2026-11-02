import type { Locale } from "../i18n";

/**
 * Money and counts always use Indonesian grouping ("Rp 28.000") because the
 * currency is rupiah in both languages. Dates follow the chosen language.
 */
const idr = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const plain = new Intl.NumberFormat("id-ID");
const dateTime: Record<Locale, Intl.DateTimeFormat> = {
  en: new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
  id: new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
};

export const formatIDR = (value: number) => idr.format(value);
export const formatNumber = (value: number) => plain.format(value);
export const formatDateTime = (iso: string, locale: Locale) => dateTime[locale].format(new Date(iso));

/** "Rp 12.500" -> 12500. Only digits count; anything else is ignored. */
export const parseRupiah = (text: string) => Number(text.replace(/\D/g, "") || 0);
