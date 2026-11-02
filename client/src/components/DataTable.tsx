import { useMemo, useState, type ReactNode } from "react";
import { useT } from "../i18n";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Provide to make the column sortable. */
  sortValue?: (row: T) => string | number;
  align?: "start" | "end";
}

interface DataTableProps<T> {
  rows: readonly T[];
  columns: Column<T>[];
  getRowId: (row: T) => string;
  /** Text the search box matches against. Omit to hide search. */
  searchText?: (row: T) => string;
  searchLabel?: string;
  initialSort?: { key: string; direction: "asc" | "desc" };
  rowActions?: (row: T) => ReactNode;
  toolbar?: ReactNode;
  empty: ReactNode;
  caption: string;
}

/**
 * The one table every back-office screen uses: search, sort, empty state, row actions.
 * Screens only describe columns; behaviour and accessibility live here once.
 */
export function DataTable<T>({
  rows,
  columns,
  getRowId,
  searchText,
  searchLabel,
  initialSort,
  rowActions,
  toolbar,
  empty,
  caption,
}: DataTableProps<T>) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState(initialSort ?? null);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    let result = term && searchText ? rows.filter((row) => searchText(row).toLowerCase().includes(term)) : [...rows];
    const column = sort && columns.find((c) => c.key === sort.key);
    if (sort && column?.sortValue) {
      const getValue = column.sortValue;
      const factor = sort.direction === "asc" ? 1 : -1;
      result = result.sort((a, b) => {
        const va = getValue(a);
        const vb = getValue(b);
        return (typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb))) * factor;
      });
    }
    return result;
  }, [rows, columns, query, searchText, sort]);

  const toggleSort = (key: string) =>
    setSort((current) =>
      current?.key === key ? { key, direction: current.direction === "asc" ? "desc" : "asc" } : { key, direction: "asc" },
    );

  return (
    <div className="data-table">
      {(searchText || toolbar) && (
        <div className="table-toolbar">
          {searchText && (
            <input
              type="search"
              className="input table-search"
              placeholder={searchLabel}
              aria-label={searchLabel ?? caption}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          )}
          <div className="table-toolbar-end">{toolbar}</div>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="table-empty">{empty}</div>
      ) : (
        <div className="table-scroll">
          <table>
            <caption className="visually-hidden">{caption}</caption>
            <thead>
              <tr>
                {columns.map((column) => {
                  const active = sort?.key === column.key;
                  return (
                    <th
                      key={column.key}
                      scope="col"
                      className={column.align === "end" ? "align-end" : undefined}
                      aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : undefined}
                    >
                      {column.sortValue ? (
                        <button type="button" className="sort-button" onClick={() => toggleSort(column.key)}>
                          {column.header}
                          <span className="sort-indicator" aria-hidden="true">
                            {active ? (sort.direction === "asc" ? "▲" : "▼") : "↕"}
                          </span>
                        </button>
                      ) : (
                        column.header
                      )}
                    </th>
                  );
                })}
                {rowActions && (
                  <th scope="col" className="align-end">
                    <span className="visually-hidden">{t("common.actions")}</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={getRowId(row)}>
                  {columns.map((column) => (
                    <td key={column.key} className={column.align === "end" ? "align-end" : undefined}>
                      {column.render(row)}
                    </td>
                  ))}
                  {rowActions && <td className="align-end row-actions">{rowActions(row)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
          {visible.length === 0 && <p className="table-no-match">{t("table.noMatch", { query })}</p>}
        </div>
      )}
    </div>
  );
}
