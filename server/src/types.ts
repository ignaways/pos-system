export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  /** Price in whole rupiah. Integers avoid floating-point drift in totals. */
  price: number;
  stock: number;
  lowStockThreshold: number;
  updatedAt: string;
}

export type PaymentMethod = "cash" | "card" | "qris";

/** A sale line is a snapshot: later product edits never rewrite history. */
export interface SaleLine {
  productId: string;
  sku: string;
  name: string;
  unitPrice: number;
  qty: number;
  lineTotal: number;
}

export interface Sale {
  id: string;
  number: string;
  createdAt: string;
  lines: SaleLine[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  tax: number;
  total: number;
  paid: number;
  change: number;
  paymentMethod: PaymentMethod;
}
