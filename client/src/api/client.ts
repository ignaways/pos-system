import type {
  Category,
  CategoryInput,
  CheckoutInput,
  CheckoutResult,
  Product,
  ProductInput,
  Sale,
} from "../types";

/** `code` is a stable identifier the UI translates; `message` is the server's English text. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fields: Record<string, string> = {},
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "network", "Can't reach the server.");
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(
      res.status,
      data?.code ?? "unknown",
      data?.error ?? `Request failed (${res.status}).`,
      data?.fields ?? {},
      data?.details,
    );
  }
  return data as T;
}

export interface Health {
  ok: boolean;
  database: "postgres" | "pglite";
  demoReset: boolean;
}

export const api = {
  health: () => request<Health>("GET", "/health"),
  resetDemo: () => request<void>("POST", "/demo/reset"),

  listProducts: () => request<Product[]>("GET", "/products"),
  createProduct: (input: ProductInput) => request<Product>("POST", "/products", input),
  updateProduct: (id: string, input: ProductInput) => request<Product>("PUT", `/products/${id}`, input),
  deleteProduct: (id: string) => request<void>("DELETE", `/products/${id}`),

  listCategories: () => request<Category[]>("GET", "/categories"),
  createCategory: (input: CategoryInput) => request<Category>("POST", "/categories", input),
  updateCategory: (id: string, input: CategoryInput) => request<Category>("PUT", `/categories/${id}`, input),
  deleteCategory: (id: string) => request<void>("DELETE", `/categories/${id}`),

  listSales: () => request<Sale[]>("GET", "/sales"),
  checkout: (input: CheckoutInput) => request<CheckoutResult>("POST", "/sales", input),
};
