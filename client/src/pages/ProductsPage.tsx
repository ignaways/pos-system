import { CrudScreen } from "../components/CrudScreen";
import type { Column } from "../components/DataTable";
import { useLocale, useT } from "../i18n";
import { shallowArrayEqual, useStore } from "../lib/createStore";
import { formatDateTime, formatIDR, formatNumber } from "../lib/format";
import { deleteProduct, saveProduct } from "../store/actions";
import { appStore, isLowStock, selectCategories, selectCategoriesById, selectProducts } from "../store/appStore";
import type { Product, ProductInput } from "../types";

export function ProductsPage() {
  const t = useT();
  const locale = useLocale();
  const products = useStore(appStore, selectProducts, shallowArrayEqual);
  const categories = useStore(appStore, selectCategories, shallowArrayEqual);
  const categoriesById = useStore(appStore, selectCategoriesById);
  const categoryName = (p: Product) => categoriesById[p.categoryId]?.name ?? t("products.uncategorised");

  const columns: Column<Product>[] = [
    { key: "sku", header: t("col.sku"), render: (p) => <span className="cell-code">{p.sku}</span>, sortValue: (p) => p.sku },
    { key: "name", header: t("col.name"), render: (p) => <strong>{p.name}</strong>, sortValue: (p) => p.name },
    { key: "category", header: t("col.category"), render: categoryName, sortValue: categoryName },
    { key: "price", header: t("col.price"), align: "end", render: (p) => formatIDR(p.price), sortValue: (p) => p.price },
    {
      key: "stock",
      header: t("col.stock"),
      align: "end",
      sortValue: (p) => p.stock,
      render: (p) => (
        <span className={p.stock === 0 ? "stock stock-out" : isLowStock(p) ? "stock stock-low" : "stock"}>
          {p.stock === 0 ? t("pos.soldOut") : formatNumber(p.stock)}
        </span>
      ),
    },
    {
      key: "updated",
      header: t("col.updated"),
      render: (p) => formatDateTime(p.updatedAt, locale),
      sortValue: (p) => p.updatedAt,
    },
  ];

  return (
    <CrudScreen
      title={t("products.title")}
      intro={t("products.intro")}
      noun={t("noun.product")}
      nouns={t("noun.products")}
      rows={products}
      columns={columns}
      initialSort={{ key: "name", direction: "asc" }}
      searchText={(p) => `${p.sku} ${p.name} ${categoryName(p)}`}
      labelOf={(p) => p.name}
      fields={[
        { name: "name", label: t("products.fieldName"), type: "text", required: true, placeholder: "Caffe latte" },
        {
          name: "sku",
          label: t("products.fieldSku"),
          type: "text",
          required: true,
          placeholder: "CF-LAT",
          hint: t("products.fieldSkuHint"),
        },
        {
          name: "categoryId",
          label: t("products.fieldCategory"),
          type: "select",
          required: true,
          options: categories.map((c) => ({ value: c.id, label: c.name })),
        },
        { name: "price", label: t("products.fieldPrice"), type: "money", required: true, min: 0, placeholder: "28000" },
        { name: "stock", label: t("products.fieldStock"), type: "number", required: true, min: 0 },
        { name: "lowStockThreshold", label: t("products.fieldLowStock"), type: "number", required: true, min: 0 },
      ]}
      toValues={(p) =>
        p
          ? {
              name: p.name,
              sku: p.sku,
              categoryId: p.categoryId,
              price: p.price,
              stock: p.stock,
              lowStockThreshold: p.lowStockThreshold,
            }
          : { name: "", sku: "", categoryId: categories[0]?.id ?? "", price: "", stock: 0, lowStockThreshold: 5 }
      }
      onSave={(values, p) => saveProduct(values as unknown as ProductInput, p?.id)}
      onDelete={(p) => deleteProduct(p.id)}
      empty={<p>{t("products.empty")}</p>}
    />
  );
}
