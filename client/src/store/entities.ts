/**
 * Normalised entity tables: one record per id, plus an ordered id list.
 * Every screen reads products by id from the same table, so an edit made in the
 * Products screen shows up in the register grid, the open cart and stock alerts at once.
 */
export interface EntityTable<T extends { id: string }> {
  byId: Record<string, T>;
  ids: string[];
}

export const emptyTable = <T extends { id: string }>(): EntityTable<T> => ({ byId: {}, ids: [] });

export function setAll<T extends { id: string }>(items: readonly T[]): EntityTable<T> {
  const byId: Record<string, T> = {};
  for (const item of items) byId[item.id] = item;
  return { byId, ids: items.map((item) => item.id) };
}

export function upsertMany<T extends { id: string }>(
  table: EntityTable<T>,
  items: readonly T[],
  position: "append" | "prepend" = "append",
): EntityTable<T> {
  if (items.length === 0) return table;
  const byId = { ...table.byId };
  const added: string[] = [];
  for (const item of items) {
    if (!(item.id in byId)) added.push(item.id);
    byId[item.id] = item;
  }
  const ids =
    added.length === 0 ? table.ids : position === "append" ? [...table.ids, ...added] : [...added, ...table.ids];
  return { byId, ids };
}

export function removeOne<T extends { id: string }>(table: EntityTable<T>, id: string): EntityTable<T> {
  if (!(id in table.byId)) return table;
  const byId = { ...table.byId };
  delete byId[id];
  return { byId, ids: table.ids.filter((existing) => existing !== id) };
}

export const selectAll = <T extends { id: string }>(table: EntityTable<T>): T[] =>
  table.ids.map((id) => table.byId[id]);
