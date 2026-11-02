/** Mirrors server/src/pricing.ts so the cashier sees exactly what the server will charge. */
export const TAX_RATE = 0.11; // PPN 11%

export interface PricedLine {
  unitPrice: number;
  qty: number;
}

export interface Totals {
  subtotal: number;
  discountAmount: number;
  tax: number;
  total: number;
}

export function computeTotals(lines: readonly PricedLine[], discountPercent: number): Totals {
  const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.qty, 0);
  const pct = Math.min(100, Math.max(0, discountPercent));
  const discountAmount = Math.round((subtotal * pct) / 100);
  const taxable = subtotal - discountAmount;
  const tax = Math.round(taxable * TAX_RATE);
  return { subtotal, discountAmount, tax, total: taxable + tax };
}
