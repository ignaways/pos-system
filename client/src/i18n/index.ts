import { useCallback } from "react";
import { createStore, useStore } from "../lib/createStore";
import { en, type MessageKey, type Messages } from "./en";
import { id } from "./id";

export type Locale = "en" | "id";

const dictionaries: Record<Locale, Messages> = { en, id };
const STORAGE_KEY = "pos.locale";

function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "id") return saved;
  } catch {
    // storage blocked: fall through to the default
  }
  return "en";
}

export const localeStore = createStore<Locale, Locale>((_state, next) => next, initialLocale());

function applyLocale(locale: Locale) {
  document.documentElement.lang = locale;
  document.title = translate(locale, "app.title");
}
applyLocale(localeStore.getState());

export function setLocale(locale: Locale) {
  localeStore.dispatch(locale);
  applyLocale(locale);
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // preference just won't persist
  }
}

type ParamsOf<K extends MessageKey> = Messages[K] extends (params: infer P) => string ? [params: P] : [];

/** Typed translate: keys must exist, and keys with placeholders require their params. */
export type Translate = <K extends MessageKey>(key: K, ...params: ParamsOf<K>) => string;

function translate(locale: Locale, key: MessageKey, params?: unknown): string {
  const entry = dictionaries[locale][key] as string | ((p: unknown) => string);
  return typeof entry === "function" ? entry(params) : entry;
}

/** For keys built at runtime (server error codes). Returns undefined for unknown keys. */
export function translateDynamic(locale: Locale, key: string, params?: unknown): string | undefined {
  return key in dictionaries[locale] ? translate(locale, key as MessageKey, params ?? {}) : undefined;
}

export function useLocale(): Locale {
  return useStore(localeStore, (s) => s);
}

export function useT(): Translate {
  const locale = useLocale();
  return useCallback(((key: MessageKey, params?: unknown) => translate(locale, key, params)) as Translate, [locale]);
}
