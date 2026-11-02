export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  price: number;
  stock: number;
  lowStockThreshold: number;
  updatedAt: string;
}

export type PaymentMethod = "cash" | "card" | "qris";

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

export type ProductInput = Omit<Product, "id" | "updatedAt">;
export type CategoryInput = Omit<Category, "id">;

export interface CheckoutInput {
  lines: { productId: string; qty: number }[];
  discountPercent: number;
  paymentMethod: PaymentMethod;
  paid: number;
}

export interface CheckoutResult {
  sale: Sale;
  products: Product[];
}

export interface StockShortage {
  productId: string;
  name: string;
  requested: number;
  available: number;
}
