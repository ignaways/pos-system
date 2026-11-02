import { useMemo, useState, type KeyboardEvent } from "react";
import { Modal } from "../../components/Modal";
import { useT } from "../../i18n";
import { describeError } from "../../i18n/errors";
import { formatIDR, parseRupiah } from "../../lib/format";
import { checkout } from "../../store/actions";
import type { PaymentMethod, Sale } from "../../types";
import type { CartSummary } from "../cart/selectors";
import { ReceiptLines } from "./ReceiptLines";

interface PaymentDialogProps {
  summary: CartSummary;
  discountPercent: number;
  onClose: () => void;
  onCompleted: () => void;
}

const METHODS: PaymentMethod[] = ["cash", "card", "qris"];

function quickAmounts(total: number) {
  const steps = [10000, 50000, 100000];
  return [...new Set([total, ...steps.map((s) => Math.ceil(total / s) * s)])].sort((a, b) => a - b).slice(0, 4);
}

export function PaymentDialog({ summary, discountPercent, onClose, onCompleted }: PaymentDialogProps) {
  const t = useT();
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [received, setReceived] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [sale, setSale] = useState<Sale | null>(null);

  const total = summary.total;
  // An empty amount means "exact money" — the fastest path for the most common case.
  const paid = method === "cash" ? (received === "" ? total : parseRupiah(received)) : total;
  const short = paid < total;
  const amounts = useMemo(() => quickAmounts(total), [total]);

  const submit = async () => {
    if (busy || short) return;
    setBusy(true);
    setError(null);
    try {
      const result = await checkout({
        lines: summary.lines.map((l) => ({ productId: l.productId, qty: l.qty })),
        discountPercent,
        paymentMethod: method,
        paid,
      });
      setSale(result);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const onMethodKeys = (e: KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const index = METHODS.indexOf(method);
    const next = METHODS[(index + (e.key === "ArrowRight" ? 1 : METHODS.length - 1)) % METHODS.length];
    setMethod(next);
    document.getElementById(`method-${next}`)?.focus();
  };

  if (sale) {
    return (
      <Modal key="done" title={t("pay.complete", { number: sale.number })} onClose={onCompleted} size="sm">
        <div className="modal-body">
          {sale.paymentMethod === "cash" && (
            <p className="change-due">
              <span>{t("pay.changeDue")}</span>
              <strong>{formatIDR(sale.change)}</strong>
            </p>
          )}
          <div className="paper paper-static">
            <ReceiptLines
              lines={sale.lines}
              totals={sale}
              discountPercent={sale.discountPercent}
              paid={sale.paymentMethod === "cash" ? { paid: sale.paid, change: sale.change } : undefined}
            />
          </div>
        </div>
        <footer className="form-actions">
          <button type="button" className="button button-primary button-wide" onClick={onCompleted} data-autofocus>
            {t("pay.next")} <span className="kbd kbd-on-dark">Enter</span>
          </button>
        </footer>
      </Modal>
    );
  }

  return (
    <Modal key="pay" title={t("pay.title")} onClose={onClose} size="sm">
      <form
        className="modal-body payment"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <p className="amount-due">
          <span>{t("pay.amountDue")}</span>
          <strong>{formatIDR(total)}</strong>
        </p>

        <div className="segmented" role="radiogroup" aria-label={t("pay.method")} onKeyDown={onMethodKeys}>
          {METHODS.map((m) => (
            <button
              key={m}
              id={`method-${m}`}
              type="button"
              role="radio"
              aria-checked={method === m}
              tabIndex={method === m ? 0 : -1}
              onClick={() => setMethod(m)}
            >
              {t(`method.${m}`)}
            </button>
          ))}
        </div>

        {method === "cash" ? (
          <div className="field">
            <label htmlFor="received">{t("pay.cashReceived")}</label>
            <input
              id="received"
              className={`input input-large${short && received !== "" ? " input-invalid" : ""}`}
              inputMode="numeric"
              autoComplete="off"
              data-autofocus
              placeholder={t("pay.exact", { amount: formatIDR(total) })}
              value={received === "" ? "" : formatIDR(parseRupiah(received))}
              onChange={(e) => setReceived(e.target.value.replace(/\D/g, ""))}
            />
            <span className="field-hint">{t("pay.exactHint")}</span>
            <div className="quick-amounts">
              {amounts.map((a) => (
                <button key={a} type="button" className="button button-small" onClick={() => setReceived(String(a))}>
                  {formatIDR(a)}
                </button>
              ))}
            </div>
            <p className={`change-preview${short ? " is-short" : ""}`}>
              {short
                ? t("pay.short", { amount: formatIDR(total - paid) })
                : t("pay.change", { amount: formatIDR(paid - total) })}
            </p>
          </div>
        ) : (
          <p className="muted payment-note">{method === "card" ? t("pay.noteCard") : t("pay.noteQris")}</p>
        )}

        {error !== null && (
          <p className="form-error" role="alert">
            {describeError(error, t)}
          </p>
        )}

        <footer className="form-actions form-actions-flush">
          <button type="button" className="button button-quiet" onClick={onClose}>
            {t("pay.back")}
          </button>
          <button
            type="submit"
            className="button button-primary"
            disabled={busy || short}
            data-autofocus={method !== "cash" ? "" : undefined}
          >
            {busy ? t("pay.recording") : t("pay.record")}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
