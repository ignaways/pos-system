import { describe, expect, it } from "vitest";
import type { Product } from "../../types";
import { filterProducts, parseQuery } from "./search";

const p = (sku: string, name: string, categoryId = "c1"): Product => ({
  id: sku,
  sku,
  name,
  categoryId,
  price: 1,
  stock: 1,
  lowStockThreshold: 0,
  updatedAt: "",
});

describe("parseQuery", () => {
  it("reads a quantity prefix", () => {
    expect(parseQuery("3*latte")).toEqual({ qty: 3, term: "latte" });
    expect(parseQuery("2 x CF-ESP")).toEqual({ qty: 2, term: "CF-ESP" });
    expect(parseQuery("latte")).toEqual({ qty: 1, term: "latte" });
  });
});

describe("filterProducts", () => {
  const list = [p("CF-LAT", "Caffe latte"), p("NC-MAT", "Matcha latte", "c2"), p("LAT", "Latte art kit")];

  it("ranks exact SKU, then prefix matches", () => {
    expect(filterProducts(list, "lat", null).map((x) => x.sku)).toEqual(["LAT", "CF-LAT", "NC-MAT"]);
  });

  it("respects the category filter", () => {
    expect(filterProducts(list, "latte", "c2").map((x) => x.sku)).toEqual(["NC-MAT"]);
  });
});
