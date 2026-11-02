import { useMemo } from "react";
import { CrudScreen } from "../components/CrudScreen";
import type { Column } from "../components/DataTable";
import { useT } from "../i18n";
import { shallowArrayEqual, useStore } from "../lib/createStore";
import { deleteCategory, saveCategory } from "../store/actions";
import { appStore, selectCategories, selectProducts } from "../store/appStore";
import type { Category } from "../types";

export function CategoriesPage() {
  const t = useT();
  const categories = useStore(appStore, selectCategories, shallowArrayEqual);
  const products = useStore(appStore, selectProducts, shallowArrayEqual);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of products) map[p.categoryId] = (map[p.categoryId] ?? 0) + 1;
    return map;
  }, [products]);

  const columns: Column<Category>[] = [
    { key: "name", header: t("col.name"), render: (c) => <strong>{c.name}</strong>, sortValue: (c) => c.name },
    {
      key: "count",
      header: t("col.products"),
      align: "end",
      render: (c) => counts[c.id] ?? 0,
      sortValue: (c) => counts[c.id] ?? 0,
    },
  ];

  return (
    <CrudScreen
      title={t("categories.title")}
      intro={t("categories.intro")}
      noun={t("noun.category")}
      nouns={t("noun.categories")}
      rows={categories}
      columns={columns}
      searchText={(c) => c.name}
      labelOf={(c) => c.name}
      fields={[
        {
          name: "name",
          label: t("categories.fieldName"),
          type: "text",
          required: true,
          placeholder: t("categories.placeholder"),
        },
      ]}
      toValues={(c) => ({ name: c?.name ?? "" })}
      onSave={(values, c) => saveCategory({ name: String(values.name) }, c?.id)}
      onDelete={(c) => deleteCategory(c.id)}
      empty={<p>{t("categories.empty")}</p>}
    />
  );
}
