import { useEffect, useState } from "react";
import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";
import { Modal } from "./components/Modal";
import { toast } from "./components/toast";
import { ToastHost } from "./components/ToastHost";
import { cartStore } from "./features/cart/cartStore";
import { PosPage } from "./features/pos/PosPage";
import { setLocale, useLocale, useT, type Locale } from "./i18n";
import { describeError } from "./i18n/errors";
import { useStore } from "./lib/createStore";
import { CategoriesPage } from "./pages/CategoriesPage";
import { ProductsPage } from "./pages/ProductsPage";
import { SalesPage } from "./pages/SalesPage";
import { bootstrap, resetDemo } from "./store/actions";
import { appStore } from "./store/appStore";

const LANGUAGES: { value: Locale; short: string; name: string }[] = [
  { value: "en", short: "EN", name: "English" },
  { value: "id", short: "ID", name: "Bahasa Indonesia" },
];

function LanguageSwitch() {
  const t = useT();
  const locale = useLocale();
  return (
    <div className="lang-switch" role="group" aria-label={t("lang.label")}>
      {LANGUAGES.map((l) => (
        <button
          key={l.value}
          type="button"
          lang={l.value}
          aria-label={l.name}
          aria-pressed={locale === l.value}
          onClick={() => setLocale(l.value)}
        >
          {l.short}
        </button>
      ))}
    </div>
  );
}

function DemoReset() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setOpen(false);
    setError(null);
  };

  const confirm = async () => {
    setBusy(true);
    try {
      await resetDemo();
      toast(t("demo.resetDone"), "success");
      close();
    } catch (err) {
      setError(describeError(err, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" className="rail-link-button" onClick={() => setOpen(true)}>
        {t("demo.reset")}
      </button>
      {open && (
        <Modal title={t("demo.resetTitle")} onClose={close} size="sm">
          <div className="modal-body">
            <p>{t("demo.resetBody")}</p>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
          </div>
          <footer className="form-actions">
            <button type="button" className="button button-quiet" onClick={close} data-autofocus>
              {t("common.cancel")}
            </button>
            <button type="button" className="button button-danger" onClick={confirm} disabled={busy}>
              {busy ? t("demo.resetting") : t("demo.resetConfirm")}
            </button>
          </footer>
        </Modal>
      )}
    </>
  );
}

function Shell() {
  const t = useT();
  const status = useStore(appStore, (s) => s.status);
  const error = useStore(appStore, (s) => s.error);
  const demoReset = useStore(appStore, (s) => s.demoReset);
  const openItems = useStore(cartStore, (s) => s.lines.reduce((n, l) => n + l.qty, 0));

  useEffect(() => {
    void bootstrap();
  }, []);

  return (
    <div className="shell">
      <nav className="rail" aria-label={t("nav.main")}>
        <p className="brand">
          Seduh <span>&amp; Co.</span>
        </p>
        <NavLink to="/" end>
          {t("nav.register")}
          {openItems > 0 && (
            <span className="rail-badge" aria-label={t("nav.openSaleItems", { count: openItems })}>
              {openItems}
            </span>
          )}
        </NavLink>
        <NavLink to="/products">{t("nav.products")}</NavLink>
        <NavLink to="/categories">{t("nav.categories")}</NavLink>
        <NavLink to="/sales">{t("nav.sales")}</NavLink>
        <div className="rail-foot">
          <LanguageSwitch />
          {demoReset && <DemoReset />}
          <p className="rail-till">{t("nav.till")}</p>
        </div>
      </nav>

      <main className="main">
        {status === "error" ? (
          <div className="state-message" role="alert">
            <h1>{t("state.loadFailed")}</h1>
            <p>{describeError(error, t)}</p>
            <button type="button" className="button button-primary" onClick={() => void bootstrap()}>
              {t("common.tryAgain")}
            </button>
          </div>
        ) : status !== "ready" ? (
          <div className="state-message" aria-busy="true">
            <p>{t("state.loading")}</p>
          </div>
        ) : (
          <Routes>
            <Route path="/" element={<PosPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/sales" element={<SalesPage />} />
            <Route
              path="*"
              element={
                <div className="state-message">
                  <h1>{t("state.notFound")}</h1>
                  <NavLink to="/">{t("state.goToRegister")}</NavLink>
                </div>
              }
            />
          </Routes>
        )}
      </main>
      <ToastHost />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}
