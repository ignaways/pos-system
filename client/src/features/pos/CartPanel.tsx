import { forwardRef, useEffect, useRef } from "react";
import { Kbd } from "../../components/Kbd";
import { useT } from "../../i18n";
import { formatNumber } from "../../lib/format";
import { cartStore } from "../cart/cartStore";
import type { CartSummary } from "../cart/selectors";
import { TotalsBlock } from "./ReceiptLines";

interface CartPanelProps {
  summary: CartSummary;
  selectedId: string | null;
  discountPercent: number;
  onCharge: () => void;
  onReturnFocus: () => void;
}

/** The open sale, drawn as a till roll. Every button maps to a reducer action. */
export const CartPanel = forwardRef<HTMLInputElement, CartPanelProps>(function CartPanel(
  { summary, selectedId, discountPercent, onCharge, onReturnFocus },
  discountRef,
) {
  const t = useT();
  const { dispatch } = cartStore;
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[aria-current="true"]')?.scrollIntoView({ block: "nearest" });
  }, [selectedId, summary.lines.length]);

  const empty = summary.lines.length === 0;

  return (
    <aside className="cart" aria-label={t("cart.label")}>
      <div className="paper">
        <header className="paper-head">
          <h2>{t("cart.label")}</h2>
          <span className="paper-count">
            {t("cart.items", { count: summary.itemCount })}
          </span>
        </header>

        {empty ? (
          <div className="paper-empty">
            <p>{t("cart.empty")}</p>
            <p className="muted">
              {t("cart.try")} <code>2*latte</code> {t("cart.then")} <Kbd>Enter</Kbd>
            </p>
          </div>
        ) : (
          <ol className="cart-lines" ref={listRef}>
            {summary.lines.map((line) => {
              const selected = line.productId === selectedId;
              const over = !line.missing && line.qty > line.stock;
              return (
                <li
                  key={line.productId}
                  className={`cart-line${selected ? " is-selected" : ""}${line.missing || over ? " has-problem" : ""}`}
                  aria-current={selected ? "true" : undefined}
                  onClick={() => dispatch({ type: "select", productId: line.productId })}
                >
                  <div className="cart-line-main">
                    <span className="r-name">{line.name}</span>
                    <span className="r-amount">{formatNumber(line.lineTotal)}</span>
                  </div>
                  <div className="cart-line-sub">
                    <span className="r-qty">@ {formatNumber(line.unitPrice)}</span>
                    <div className="qty-stepper" role="group" aria-label={t("cart.quantityFor", { name: line.name })}>
                      <button
                        type="button"
                        tabIndex={-1}
                        aria-label={t("cart.oneLess")}
                        onClick={(e) => {
                          e.stopPropagation();
                          dispatch({ type: "decrement", productId: line.productId });
                        }}
                      >
                        −
                      </button>
                      <span className="qty-value">{line.qty}</span>
                      <button
                        type="button"
                        tabIndex={-1}
                        aria-label={t("cart.oneMore")}
                        disabled={line.missing || line.qty >= line.stock}
                        onClick={(e) => {
                          e.stopPropagation();
                          dispatch({ type: "increment", productId: line.productId, maxQty: line.stock });
                        }}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        tabIndex={-1}
                        className="qty-remove"
                        aria-label={t("cart.remove", { name: line.name })}
                        onClick={(e) => {
                          e.stopPropagation();
                          dispatch({ type: "remove", productId: line.productId });
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  {line.missing && <p className="line-problem">{t("cart.deleted")}</p>}
                  {over && <p className="line-problem">{t("cart.onlyLeft", { count: line.stock })}</p>}
                </li>
              );
            })}
          </ol>
        )}

        <div className="paper-foot">
          <label className="discount">
            <span>
              {t("cart.discount")} <Kbd>F3</Kbd>
            </span>
            <input
              ref={discountRef}
              className="input input-discount"
              inputMode="numeric"
              value={discountPercent === 0 ? "" : String(discountPercent)}
              placeholder="0"
              onChange={(e) => dispatch({ type: "setDiscount", percent: Number(e.target.value.replace(/\D/g, "") || 0) })}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "Escape") {
                  e.preventDefault();
                  onReturnFocus();
                }
              }}
            />
          </label>
          <TotalsBlock totals={summary} discountPercent={discountPercent} />
        </div>
      </div>

      <button
        type="button"
        className="charge-button"
        disabled={empty || summary.blockers.length > 0}
        onClick={onCharge}
      >
        <span>{t("cart.charge")}</span>
        <Kbd>F2</Kbd>
      </button>
    </aside>
  );
});
