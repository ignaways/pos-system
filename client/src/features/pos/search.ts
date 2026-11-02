import type { Product } from "../../types";

/**
 * Register search grammar:
 *   "latte"      -> qty 1, term "latte"
 *   "3*latte"    -> qty 3, term "latte"   (multiply before scanning, like a till)
 *   "CF-LAT"     -> exact SKU match wins over fuzzy name matches
 */
export function parseQuery(raw: string): { qty: number; term: string } {
  const match = /^\s*(\d{1,3})\s*[*x×]\s*(.*)$/i.exec(raw);
  if (match) return { qty: Math.max(1, Number(match[1])), term: match[2].trim() };
  return { qty: 1, term: raw.trim() };
}

export function filterProducts(products: readonly Product[], term: string, categoryId: string | null): Product[] {
  const needle = term.toLowerCase();
  return products
    .filter((p) => (categoryId ? p.categoryId === categoryId : true))
    .filter((p) => !needle || p.name.toLowerCase().includes(needle) || p.sku.toLowerCase().includes(needle))
    .sort((a, b) => {
      // Exact SKU first, then names that start with the term, then the rest.
      const rank = (p: Product) =>
        p.sku.toLowerCase() === needle ? 0 : p.name.toLowerCase().startsWith(needle) ? 1 : 2;
      return rank(a) - rank(b) || a.name.localeCompare(b.name);
    });
}

export function findBySku(products: readonly Product[], term: string): Product | undefined {
  const needle = term.trim().toLowerCase();
  return needle ? products.find((p) => p.sku.toLowerCase() === needle) : undefined;
}
