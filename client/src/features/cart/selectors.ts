import type { Product } from "../../types";
import type { CartState } from "./cartReducer";
import { computeTotals, type Totals } from "./pricing";

export interface ResolvedLine {
  productId: string;
  name: string;
  sku: string;
  unitPrice: number;
  qty: number;
  lineTotal: number;
  /** Units still on the shelf according to the latest product data. */
  stock: number;
  /** The product was deleted while it sat in the cart. */
  missing: boolean;
}

export interface CartSummary extends Totals {
  lines: ResolvedLine[];
  itemCount: number;
  /** Lines that can't be sold as-is (deleted product or qty above stock). */
  blockers: ResolvedLine[];
}

/** Joins cart ids to the normalised product table. Pure, so it's tested like the reducer. */
export function summarizeCart(cart: CartState, productsById: Record<string, Product>): CartSummary {
  const lines: ResolvedLine[] = cart.lines.map(({ productId, qty }) => {
    const product = productsById[productId];
    if (!product) {
      return { productId, name: "Removed product", sku: "—", unitPrice: 0, qty, lineTotal: 0, stock: 0, missing: true };
    }
    return {
      productId,
      name: product.name,
      sku: product.sku,
      unitPrice: product.price,
      qty,
      lineTotal: product.price * qty,
      stock: product.stock,
      missing: false,
    };
  });
  const sellable = lines.filter((line) => !line.missing);
  return {
    lines,
    itemCount: lines.reduce((sum, line) => sum + line.qty, 0),
    blockers: lines.filter((line) => line.missing || line.qty > line.stock),
    ...computeTotals(sellable, cart.discountPercent),
  };
}
