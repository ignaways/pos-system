/**
 * The cart is a pure reducer: no React, no fetch, no Date.now().
 * It stores only product ids and quantities; names and prices are looked up from
 * the normalised product table at render time (see selectors.ts), so a price edit
 * in the back office is reflected in an open cart immediately.
 *
 * Every action that changes nothing returns the *same* state object, which lets
 * the store skip notifying subscribers.
 */
export interface CartLine {
  productId: string;
  qty: number;
}

export interface CartState {
  lines: CartLine[];
  selectedId: string | null;
  discountPercent: number;
}

export type CartAction =
  | { type: "add"; productId: string; qty?: number; maxQty?: number }
  | { type: "setQty"; productId: string; qty: number; maxQty?: number }
  | { type: "increment"; productId: string; maxQty?: number }
  | { type: "decrement"; productId: string }
  | { type: "remove"; productId: string }
  | { type: "select"; productId: string | null }
  | { type: "selectNext" }
  | { type: "selectPrevious" }
  | { type: "setDiscount"; percent: number }
  | { type: "clear" }
  | { type: "restore"; state: CartState };

export const emptyCart: CartState = { lines: [], selectedId: null, discountPercent: 0 };

const clampQty = (qty: number, maxQty?: number) =>
  Math.max(0, Math.min(Math.floor(qty), maxQty ?? Number.POSITIVE_INFINITY));

function withQty(state: CartState, productId: string, qty: number): CartState {
  const index = state.lines.findIndex((line) => line.productId === productId);
  if (qty <= 0) return index === -1 ? state : removeLine(state, productId);
  if (index === -1) {
    return { ...state, lines: [...state.lines, { productId, qty }], selectedId: productId };
  }
  if (state.lines[index].qty === qty && state.selectedId === productId) return state;
  const lines = state.lines.slice();
  lines[index] = { productId, qty };
  return { ...state, lines, selectedId: productId };
}

function removeLine(state: CartState, productId: string): CartState {
  const index = state.lines.findIndex((line) => line.productId === productId);
  if (index === -1) return state;
  const lines = state.lines.filter((line) => line.productId !== productId);
  let selectedId = state.selectedId;
  if (selectedId === productId) {
    // Keep the cashier's place: select the line that slid into this position, or the one above.
    selectedId = lines[Math.min(index, lines.length - 1)]?.productId ?? null;
  }
  return { ...state, lines, selectedId };
}

function moveSelection(state: CartState, step: 1 | -1): CartState {
  if (state.lines.length === 0) return state;
  const current = state.lines.findIndex((line) => line.productId === state.selectedId);
  const start = current === -1 ? (step === 1 ? -1 : state.lines.length) : current;
  const next = Math.max(0, Math.min(state.lines.length - 1, start + step));
  const selectedId = state.lines[next].productId;
  return selectedId === state.selectedId ? state : { ...state, selectedId };
}

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "add": {
      const existing = state.lines.find((line) => line.productId === action.productId)?.qty ?? 0;
      const qty = clampQty(existing + (action.qty ?? 1), action.maxQty);
      if (qty === 0) return state; // out of stock: nothing to add
      return withQty(state, action.productId, qty);
    }
    case "setQty":
      return withQty(state, action.productId, clampQty(action.qty, action.maxQty));
    case "increment": {
      const line = state.lines.find((l) => l.productId === action.productId);
      if (!line) return state;
      return withQty(state, action.productId, clampQty(line.qty + 1, action.maxQty));
    }
    case "decrement": {
      const line = state.lines.find((l) => l.productId === action.productId);
      if (!line) return state;
      return withQty(state, action.productId, line.qty - 1);
    }
    case "remove":
      return removeLine(state, action.productId);
    case "select":
      if (action.productId === state.selectedId) return state;
      if (action.productId !== null && !state.lines.some((l) => l.productId === action.productId)) return state;
      return { ...state, selectedId: action.productId };
    case "selectNext":
      return moveSelection(state, 1);
    case "selectPrevious":
      return moveSelection(state, -1);
    case "setDiscount": {
      const percent = Number.isFinite(action.percent) ? Math.min(100, Math.max(0, action.percent)) : 0;
      return percent === state.discountPercent ? state : { ...state, discountPercent: percent };
    }
    case "clear":
      return state.lines.length === 0 && state.discountPercent === 0 ? state : emptyCart;
    case "restore":
      return action.state;
  }
}
