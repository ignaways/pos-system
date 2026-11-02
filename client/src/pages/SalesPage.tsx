import { useMemo, useState } from "react";
import { DataTable, type Column } from "../components/DataTable";
import { Modal } from "../components/Modal";
import { ReceiptLines } from "../features/pos/ReceiptLines";
import { useLocale, useT } from "../i18n";
import { shallowArrayEqual, useStore } from "../lib/createStore";
import { formatDateTime, formatIDR, formatNumber } from "../lib/format";
import { appStore, isLowStock, selectProducts, selectSales } from "../store/appStore";
import type { Sale } from "../types";

const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();

export function SalesPage() {
  const t = useT();
  const locale = useLocale();
  const sales = useStore(appStore, selectSales, shallowArrayEqual);
  const products = useStore(appStore, selectProducts, shallowArrayEqual);
  const [viewing, setViewing] = useState<Sale | null>(null);
  const methodLabel = (s: Sale) => t(`method.${s.paymentMethod}`);

  const today = useMemo(() => {
    const list = sales.filter((s) => isToday(s.createdAt));
    const revenue = list.reduce((sum, s) => sum + s.total, 0);
    const items = list.reduce((sum, s) => sum + s.lines.reduce((n, l) => n + l.qty, 0), 0);
    return { count: list.length, revenue, items, average: list.length ? Math.round(revenue / list.length) : 0 };
  }, [sales]);

  const lowStock = useMemo(() => products.filter(isLowStock).sort((a, b) => a.stock - b.stock), [products]);

  const columns: Column<Sale>[] = [
    {
      key: "number",
      header: t("col.sale"),
      render: (s) => <span className="cell-code">{s.number}</span>,
      sortValue: (s) => s.number,
    },
    { key: "time", header: t("col.time"), render: (s) => formatDateTime(s.createdAt, locale), sortValue: (s) => s.createdAt },
    { key: "items", header: t("col.items"), align: "end", render: (s) => s.lines.reduce((n, l) => n + l.qty, 0) },
    { key: "method", header: t("col.method"), render: methodLabel, sortValue: methodLabel },
    {
      key: "total",
      header: t("col.total"),
      align: "end",
      render: (s) => <strong>{formatIDR(s.total)}</strong>,
      sortValue: (s) => s.total,
    },
  ];

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1>{t("sales.title")}</h1>
          <p className="page-intro">{t("sales.intro")}</p>
        </div>
      </header>

      <dl className="day-summary">
        <div>
          <dt>{t("sales.revenueToday")}</dt>
          <dd>{formatIDR(today.revenue)}</dd>
        </div>
        <div>
          <dt>{t("sales.count")}</dt>
          <dd>{formatNumber(today.count)}</dd>
        </div>
        <div>
          <dt>{t("sales.itemsSold")}</dt>
          <dd>{formatNumber(today.items)}</dd>
        </div>
        <div>
          <dt>{t("sales.average")}</dt>
          <dd>{formatIDR(today.average)}</dd>
        </div>
      </dl>

      <div className="page-split">
        <DataTable
          caption={t("sales.history")}
          rows={sales}
          columns={columns}
          getRowId={(s) => s.id}
          searchText={(s) => `${s.number} ${s.lines.map((l) => l.name).join(" ")}`}
          searchLabel={t("sales.search")}
          rowActions={(s) => (
            <button type="button" className="button button-small" onClick={() => setViewing(s)}>
              {t("sales.viewReceipt")}
              <span className="visually-hidden"> {s.number}</span>
            </button>
          )}
          empty={<p>{t("sales.empty")}</p>}
        />

        <aside className="panel">
          <h2>{t("sales.runningLow")}</h2>
          {lowStock.length === 0 ? (
            <p className="muted">{t("sales.allStocked")}</p>
          ) : (
            <ul className="low-stock-list">
              {lowStock.map((p) => (
                <li key={p.id}>
                  <span>{p.name}</span>
                  <span className={p.stock === 0 ? "stock stock-out" : "stock stock-low"}>
                    {p.stock === 0 ? t("pos.soldOut") : t("pos.left", { count: p.stock })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      {viewing && (
        <Modal title={t("sales.receipt", { number: viewing.number })} onClose={() => setViewing(null)} size="sm">
          <div className="modal-body">
            <div className="paper paper-static">
              <p className="paper-meta">
                {formatDateTime(viewing.createdAt, locale)} — {methodLabel(viewing)}
              </p>
              <ReceiptLines
                lines={viewing.lines}
                totals={viewing}
                discountPercent={viewing.discountPercent}
                paid={viewing.paymentMethod === "cash" ? { paid: viewing.paid, change: viewing.change } : undefined}
              />
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
