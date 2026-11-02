import { api } from "../api/client";
import { cartStore } from "../features/cart/cartStore";
import type { CategoryInput, CheckoutInput, ProductInput } from "../types";
import { appStore } from "./appStore";

const { dispatch } = appStore;

export async function bootstrap() {
  dispatch({ type: "bootstrap/started" });
  try {
    const [products, categories, sales, health] = await Promise.all([
      api.listProducts(),
      api.listCategories(),
      api.listSales(),
      api.health(),
    ]);
    dispatch({ type: "bootstrap/succeeded", products, categories, sales, demoReset: health.demoReset });
  } catch (err) {
    dispatch({ type: "bootstrap/failed", error: err });
  }
}

export async function resetDemo() {
  await api.resetDemo();
  cartStore.dispatch({ type: "clear" });
  await bootstrap();
}

export async function saveProduct(input: ProductInput, id?: string) {
  const product = id ? await api.updateProduct(id, input) : await api.createProduct(input);
  dispatch({ type: "products/upserted", products: [product] });
  return product;
}

export async function deleteProduct(id: string) {
  await api.deleteProduct(id);
  dispatch({ type: "products/removed", id });
  cartStore.dispatch({ type: "remove", productId: id });
}

export async function saveCategory(input: CategoryInput, id?: string) {
  const category = id ? await api.updateCategory(id, input) : await api.createCategory(input);
  dispatch({ type: "categories/upserted", categories: [category] });
  return category;
}

export async function deleteCategory(id: string) {
  await api.deleteCategory(id);
  dispatch({ type: "categories/removed", id });
}

export async function checkout(input: CheckoutInput) {
  const result = await api.checkout(input);
  dispatch({ type: "sales/recorded", sale: result.sale, products: result.products });
  return result.sale;
}
