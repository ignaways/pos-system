import { describe, expect, it } from "vitest";
import { en } from "./en";
import { id } from "./id";

describe("dictionaries", () => {
  it("have identical keys", () => {
    expect(Object.keys(id).sort()).toEqual(Object.keys(en).sort());
  });

  it("cover every server error code", () => {
    const codes = [
      "validation_failed", "invalid_json", "endpoint_not_found", "product_not_found", "category_not_found",
      "sku_taken", "category_missing", "category_name_taken", "category_in_use", "insufficient_stock",
      "payment_short", "demo_reset_disabled", "database_unavailable", "server_error",
    ];
    for (const code of codes) expect(Object.keys(id)).toContain(`error.${code}`);
  });

  it("never returns an empty string", () => {
    const sample = { count: 2, name: "Latte", noun: "produk", nouns: "produk", query: "x", term: "x", label: "Nama",
      min: 1, items: "x", status: 500, percent: 10, amount: "Rp 1", number: "S-1" };
    for (const dict of [en, id]) {
      for (const value of Object.values(dict)) {
        const text = typeof value === "function" ? (value as (p: unknown) => string)(sample) : value;
        expect(text.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
