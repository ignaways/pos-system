import { useT } from "../../i18n";
import { formatIDR, formatNumber } from "../../lib/format";
import type { Totals } from "../cart/pricing";

interface ReceiptLinesProps {
  lines: { productId: string; name: string; qty: number; unitPrice: number; lineTotal: number }[];
  totals: Totals;
  discountPercent: number;
  paid?: { paid: number; change: number };
}

/** Read-only receipt body, shared by the payment confirmation and sales history. */
export function ReceiptLines({ lines, totals, discountPercent, paid }: ReceiptLinesProps) {
  const t = useT();
  return (
    <div className="receipt-static">
      <ul className="receipt-static-lines">
        {lines.map((line) => (
          <li key={line.productId}>
            <span className="r-name">{line.name}</span>
            <span className="r-qty">
              {formatNumber(line.qty)} × {formatNumber(line.unitPrice)}
            </span>
            <span className="r-amount">{formatNumber(line.lineTotal)}</span>
          </li>
        ))}
      </ul>
      <TotalsBlock totals={totals} discountPercent={discountPercent} />
      {paid && (
        <dl className="totals totals-paid">
          <div>
            <dt>{t("totals.received")}</dt>
            <dd>{formatIDR(paid.paid)}</dd>
          </div>
          <div>
            <dt>{t("totals.change")}</dt>
            <dd>{formatIDR(paid.change)}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}

export function TotalsBlock({ totals, discountPercent }: { totals: Totals; discountPercent: number }) {
  const t = useT();
  return (
    <dl className="totals">
      <div>
        <dt>{t("totals.subtotal")}</dt>
        <dd>{formatIDR(totals.subtotal)}</dd>
      </div>
      {totals.discountAmount > 0 && (
        <div>
          <dt>{t("totals.discount", { percent: discountPercent })}</dt>
          <dd>−{formatIDR(totals.discountAmount)}</dd>
        </div>
      )}
      <div>
        <dt>{t("totals.tax")}</dt>
        <dd>{formatIDR(totals.tax)}</dd>
      </div>
      <div className="totals-grand">
        <dt>{t("totals.total")}</dt>
        <dd>{formatIDR(totals.total)}</dd>
      </div>
    </dl>
  );
}
