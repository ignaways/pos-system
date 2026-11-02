import { describe, expect, it } from "vitest";
import { computeTotals } from "./pricing.js";

describe("computeTotals", () => {
  it("applies discount before tax and rounds to whole rupiah", () => {
    const totals = computeTotals([{ unitPrice: 25000, qty: 2 }, { unitPrice: 18500, qty: 1 }], 10);
    expect(totals).toEqual({ subtotal: 68500, discountAmount: 6850, tax: 6782, total: 68432 });
  });

  it("clamps discounts outside 0-100", () => {
    expect(computeTotals([{ unitPrice: 1000, qty: 1 }], 150).total).toBe(0);
    expect(computeTotals([{ unitPrice: 1000, qty: 1 }], -5).discountAmount).toBe(0);
  });
});
