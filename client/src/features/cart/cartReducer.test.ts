import { describe, expect, it } from "vitest";
import type { Product } from "../../types";
import { cartReducer, emptyCart, type CartAction, type CartState } from "./cartReducer";
import { summarizeCart } from "./selectors";

const run = (actions: CartAction[], start: CartState = emptyCart) => actions.reduce(cartReducer, start);

const product = (id: string, price: number, stock = 10): Product => ({
  id,
  sku: id.toUpperCase(),
  name: id,
  categoryId: "c",
  price,
  stock,
  lowStockThreshold: 2,
  updatedAt: "",
});

describe("cartReducer", () => {
  it("adds a new line and selects it", () => {
    const state = run([{ type: "add", productId: "latte" }]);
    expect(state.lines).toEqual([{ productId: "latte", qty: 1 }]);
    expect(state.selectedId).toBe("latte");
  });

  it("merges repeated adds into one line", () => {
    const state = run([
      { type: "add", productId: "latte" },
      { type: "add", productId: "latte", qty: 2 },
    ]);
    expect(state.lines).toEqual([{ productId: "latte", qty: 3 }]);
  });

  it("never exceeds the available stock", () => {
    const state = run([
      { type: "add", productId: "croissant", qty: 5, maxQty: 3 },
      { type: "increment", productId: "croissant", maxQty: 3 },
    ]);
    expect(state.lines[0].qty).toBe(3);
  });

  it("ignores adds for out-of-stock products and returns the same state", () => {
    const start = run([{ type: "add", productId: "latte" }]);
    expect(cartReducer(start, { type: "add", productId: "klepon", maxQty: 0 })).toBe(start);
  });

  it("removes the line when decremented to zero and moves the selection", () => {
    const state = run([
      { type: "add", productId: "a" },
      { type: "add", productId: "b" },
      { type: "add", productId: "c" },
      { type: "select", productId: "b" },
      { type: "decrement", productId: "b" },
    ]);
    expect(state.lines.map((l) => l.productId)).toEqual(["a", "c"]);
    expect(state.selectedId).toBe("c");
  });

  it("selects the previous line when the last one is removed", () => {
    const state = run([
      { type: "add", productId: "a" },
      { type: "add", productId: "b" },
      { type: "remove", productId: "b" },
    ]);
    expect(state.selectedId).toBe("a");
  });

  it("moves selection within bounds", () => {
    const base = run([
      { type: "add", productId: "a" },
      { type: "add", productId: "b" },
    ]);
    expect(cartReducer(base, { type: "selectNext" })).toBe(base); // already on the last line
    expect(cartReducer(base, { type: "selectPrevious" }).selectedId).toBe("a");
  });

  it("clamps the discount to 0-100", () => {
    expect(run([{ type: "setDiscount", percent: 140 }]).discountPercent).toBe(100);
    expect(run([{ type: "setDiscount", percent: Number.NaN }])).toBe(emptyCart);
  });

  it("clears and restores (undo)", () => {
    const filled = run([{ type: "add", productId: "a" }, { type: "setDiscount", percent: 10 }]);
    const cleared = cartReducer(filled, { type: "clear" });
    expect(cleared).toBe(emptyCart);
    expect(cartReducer(cleared, { type: "restore", state: filled })).toBe(filled);
  });
});

describe("summarizeCart", () => {
  it("prices lines from the latest product data", () => {
    const cart = run([{ type: "add", productId: "latte", qty: 2 }, { type: "setDiscount", percent: 10 }]);
    const before = summarizeCart(cart, { latte: product("latte", 28000) });
    const after = summarizeCart(cart, { latte: product("latte", 30000) }); // price edited in back office
    expect(before.subtotal).toBe(56000);
    expect(after.subtotal).toBe(60000);
    expect(after).toMatchObject({ discountAmount: 6000, tax: 5940, total: 59940, itemCount: 2 });
  });

  it("flags deleted products and quantities above stock", () => {
    const cart = run([
      { type: "add", productId: "gone" },
      { type: "add", productId: "bread", qty: 4 },
    ]);
    const summary = summarizeCart(cart, { bread: product("bread", 21000, 3) });
    expect(summary.blockers.map((l) => l.productId)).toEqual(["gone", "bread"]);
    expect(summary.subtotal).toBe(84000); // the missing line contributes nothing
  });
});
