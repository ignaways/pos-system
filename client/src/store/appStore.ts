import { createStore } from "../lib/createStore";
import type { Category, Product, Sale } from "../types";
import { emptyTable, removeOne, selectAll, setAll, upsertMany, type EntityTable } from "./entities";

export interface AppState {
  status: "idle" | "loading" | "ready" | "error";
  /** Kept as the raw error so the message can be shown in whichever language is active. */
  error: unknown;
  demoReset: boolean;
  products: EntityTable<Product>;
  categories: EntityTable<Category>;
  sales: EntityTable<Sale>;
}

export type AppAction =
  | { type: "bootstrap/started" }
  | { type: "bootstrap/succeeded"; products: Product[]; categories: Category[]; sales: Sale[]; demoReset: boolean }
  | { type: "bootstrap/failed"; error: unknown }
  | { type: "products/upserted"; products: Product[] }
  | { type: "products/removed"; id: string }
  | { type: "categories/upserted"; categories: Category[] }
  | { type: "categories/removed"; id: string }
  | { type: "sales/recorded"; sale: Sale; products: Product[] };

const initialState: AppState = {
  status: "idle",
  error: null,
  demoReset: false,
  products: emptyTable(),
  categories: emptyTable(),
  sales: emptyTable(),
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "bootstrap/started":
      return { ...state, status: "loading", error: null };
    case "bootstrap/succeeded":
      return {
        status: "ready",
        error: null,
        demoReset: action.demoReset,
        products: setAll(action.products),
        categories: setAll(action.categories),
        sales: setAll(action.sales),
      };
    case "bootstrap/failed":
      return { ...state, status: "error", error: action.error };
    case "products/upserted":
      return { ...state, products: upsertMany(state.products, action.products) };
    case "products/removed":
      return { ...state, products: removeOne(state.products, action.id) };
    case "categories/upserted":
      return { ...state, categories: upsertMany(state.categories, action.categories) };
    case "categories/removed":
      return { ...state, categories: removeOne(state.categories, action.id) };
    case "sales/recorded":
      // One action updates two tables: the new sale and the stock it consumed.
      return {
        ...state,
        sales: upsertMany(state.sales, [action.sale], "prepend"),
        products: upsertMany(state.products, action.products),
      };
  }
}

export const appStore = createStore(appReducer, initialState);

// Selectors
export const selectProducts = (s: AppState) => selectAll(s.products);
export const selectProductsById = (s: AppState) => s.products.byId;
export const selectCategories = (s: AppState) => selectAll(s.categories);
export const selectCategoriesById = (s: AppState) => s.categories.byId;
export const selectSales = (s: AppState) => selectAll(s.sales);
export const isLowStock = (p: Product) => p.stock <= p.lowStockThreshold;
