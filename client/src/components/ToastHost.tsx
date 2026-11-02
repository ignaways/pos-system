import { useStore } from "../lib/createStore";
import { toastStore } from "./toast";

export function ToastHost() {
  const toasts = useStore(toastStore, (s) => s);
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.tone}`}>
          <span>{t.message}</span>
          {t.action && (
            <button
              type="button"
              className="toast-action"
              onClick={() => {
                t.action?.onAction();
                toastStore.dispatch({ type: "dismiss", id: t.id });
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
