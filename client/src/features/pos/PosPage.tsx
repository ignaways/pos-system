import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Kbd } from "../../components/Kbd";
import { toast } from "../../components/toast";
import { useT } from "../../i18n";
import { shallowArrayEqual, useStore } from "../../lib/createStore";
import { formatIDR } from "../../lib/format";
import { appStore, isLowStock, selectCategories, selectProducts, selectProductsById } from "../../store/appStore";
import type { Product } from "../../types";
import { cartStore } from "../cart/cartStore";
import { summarizeCart } from "../cart/selectors";
import { CartPanel } from "./CartPanel";
import { PaymentDialog } from "./PaymentDialog";
import { filterProducts, findBySku, parseQuery } from "./search";

const isTextInput = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);

export function PosPage() {
  const t = useT();
  const products = useStore(appStore, selectProducts, shallowArrayEqual);
  const productsById = useStore(appStore, selectProductsById);
  const categories = useStore(appStore, selectCategories, shallowArrayEqual);
  const cart = useStore(cartStore, (s) => s);

  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [highlight, setHighlight] = useState(0);
  const [paying, setPaying] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const discountRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLUListElement>(null);

  const { qty: queryQty, term } = parseQuery(query);
  const results = useMemo(() => filterProducts(products, term, categoryId), [products, term, categoryId]);
  const summary = useMemo(() => summarizeCart(cart, productsById), [cart, productsById]);
  const canCharge = summary.lines.length > 0 && summary.blockers.length === 0;

  useEffect(() => setHighlight(0), [term, categoryId]);
  useEffect(() => searchRef.current?.focus(), []);
  useEffect(() => {
    gridRef.current?.querySelector<HTMLElement>(".is-highlighted")?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  const focusSearch = () => {
    searchRef.current?.focus();
    searchRef.current?.select();
  };

  const addToCart = (product: Product, qty = 1) => {
    if (product.stock <= 0) {
      toast(t("pos.soldOutToast", { name: product.name }), "error");
      return;
    }
    const inCart = cartStore.getState().lines.find((l) => l.productId === product.id)?.qty ?? 0;
    if (inCart + qty > product.stock) {
      toast(t("pos.stockCapped", { name: product.name, count: product.stock }), "error");
    }
    cartStore.dispatch({ type: "add", productId: product.id, qty, maxQty: product.stock });
  };

  const clearSale = () => {
    const previous = cartStore.getState();
    if (previous.lines.length === 0) return;
    cartStore.dispatch({ type: "clear" });
    toast(t("pos.cleared"), "info", {
      label: t("common.undo"),
      onAction: () => cartStore.dispatch({ type: "restore", state: previous }),
    });
    focusSearch();
  };

  const openPayment = () => {
    if (canCharge) setPaying(true);
    else if (summary.blockers.length > 0) toast(t("pos.fixLines"), "error");
  };

  // Global till keys. Function keys work from anywhere on the register.
  useEffect(() => {
    if (paying) return;
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "F1" || (e.key === "/" && !isTextInput(e.target))) {
        e.preventDefault();
        focusSearch();
      } else if (e.key === "F2") {
        e.preventDefault();
        openPayment();
      } else if (e.key === "F3") {
        e.preventDefault();
        discountRef.current?.focus();
        discountRef.current?.select();
      } else if (e.key === "F4") {
        e.preventDefault();
        clearSale();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  // Search-box keys. With text: navigate results. Empty: edit the selected cart line.
  const onSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const selected = cart.selectedId;
    const editingCart = query === "" && selected !== null;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (term) setHighlight((h) => Math.min(h + 1, results.length - 1));
        else cartStore.dispatch({ type: "selectNext" });
        break;
      case "ArrowUp":
        e.preventDefault();
        if (term) setHighlight((h) => Math.max(h - 1, 0));
        else cartStore.dispatch({ type: "selectPrevious" });
        break;
      case "Enter": {
        e.preventDefault();
        if (!term) return;
        const target = findBySku(products, term) ?? results[highlight];
        if (!target) {
          toast(t("pos.noProduct", { term }), "error");
          return;
        }
        addToCart(target, queryQty);
        setQuery("");
        break;
      }
      case "Escape":
        if (query) {
          e.preventDefault();
          setQuery("");
        }
        break;
      case "+":
      case "=":
        if (editingCart) {
          e.preventDefault();
          cartStore.dispatch({ type: "increment", productId: selected, maxQty: productsById[selected]?.stock });
        }
        break;
      case "-":
        if (editingCart) {
          e.preventDefault();
          cartStore.dispatch({ type: "decrement", productId: selected });
        }
        break;
      case "Delete":
        if (editingCart) {
          e.preventDefault();
          cartStore.dispatch({ type: "remove", productId: selected });
        }
        break;
    }
  };

  const activeIndex = term ? highlight : -1;

  return (
    <div className="register">
      <section className="catalogue" aria-label={t("pos.products")}>
        <div className="search-row">
          <label htmlFor="register-search" className="visually-hidden">
            {t("pos.searchLabel")}
          </label>
          <input
            id="register-search"
            ref={searchRef}
            className="input search-input"
            placeholder={t("pos.searchPlaceholder")}
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onSearchKeyDown}
            role="combobox"
            aria-expanded={term.length > 0}
            aria-controls="product-grid"
            aria-activedescendant={activeIndex >= 0 && results[activeIndex] ? `tile-${results[activeIndex].id}` : undefined}
          />
          <Kbd>F1</Kbd>
          {queryQty > 1 && <span className="qty-badge">× {queryQty}</span>}
        </div>

        <div className="category-tabs" role="toolbar" aria-label={t("pos.filterByCategory")}>
          <button type="button" aria-pressed={categoryId === null} onClick={() => setCategoryId(null)}>
            {t("pos.all")}
          </button>
          {categories.map((c) => (
            <button key={c.id} type="button" aria-pressed={categoryId === c.id} onClick={() => setCategoryId(c.id)}>
              {c.name}
            </button>
          ))}
        </div>

        {results.length === 0 ? (
          <div className="grid-empty">
            <p>{t("pos.noMatch", { term })}</p>
            <p className="muted">{t("pos.noMatchHint")}</p>
          </div>
        ) : (
          <ul className="product-grid" id="product-grid" role="listbox" aria-label={t("pos.matchingProducts")} ref={gridRef}>
            {results.map((p, i) => {
              const inCart = cart.lines.find((l) => l.productId === p.id)?.qty ?? 0;
              const soldOut = p.stock === 0;
              return (
                <li key={p.id} role="option" aria-selected={i === activeIndex} id={`tile-${p.id}`}>
                  <button
                    type="button"
                    tabIndex={-1}
                    className={`tile${i === activeIndex ? " is-highlighted" : ""}${soldOut ? " is-sold-out" : ""}`}
                    onClick={() => {
                      addToCart(p);
                      searchRef.current?.focus();
                    }}
                    disabled={soldOut}
                  >
                    <span className="tile-name">{p.name}</span>
                    <span className="tile-sku">{p.sku}</span>
                    <span className="tile-price">{formatIDR(p.price)}</span>
                    <span className={`tile-stock${isLowStock(p) ? " is-low" : ""}`}>
                      {soldOut ? t("pos.soldOut") : t("pos.left", { count: p.stock - inCart })}
                    </span>
                    {inCart > 0 && <span className="tile-in-cart" aria-label={t("pos.inSale", { count: inCart })}>{inCart}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <footer className="keymap" aria-label={t("key.shortcuts")}>
          <span><Kbd>↑↓</Kbd> {term ? t("key.chooseProduct") : t("key.chooseLine")}</span>
          <span><Kbd>Enter</Kbd> {t("key.add")}</span>
          <span><Kbd>+</Kbd> <Kbd>−</Kbd> {t("key.quantity")}</span>
          <span><Kbd>Del</Kbd> {t("key.removeLine")}</span>
          <span><Kbd>F3</Kbd> {t("key.discount")}</span>
          <span><Kbd>F2</Kbd> {t("key.charge")}</span>
          <span><Kbd>F4</Kbd> {t("key.clearSale")}</span>
        </footer>
      </section>

      <CartPanel
        ref={discountRef}
        summary={summary}
        selectedId={cart.selectedId}
        discountPercent={cart.discountPercent}
        onCharge={openPayment}
        onReturnFocus={focusSearch}
      />

      {paying && (
        <PaymentDialog
          summary={summary}
          discountPercent={cart.discountPercent}
          onClose={() => {
            setPaying(false);
            requestAnimationFrame(focusSearch);
          }}
          onCompleted={() => {
            cartStore.dispatch({ type: "clear" });
            setPaying(false);
            setQuery("");
            requestAnimationFrame(focusSearch);
          }}
        />
      )}
    </div>
  );
}
