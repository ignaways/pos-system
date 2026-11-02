import { createStore } from "../lib/createStore";

export type ToastTone = "info" | "success" | "error";

export interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
  action?: { label: string; onAction: () => void };
}

type ToastAction = { type: "push"; toast: Toast } | { type: "dismiss"; id: number };

const toastReducer = (state: Toast[], action: ToastAction): Toast[] => {
  switch (action.type) {
    case "push":
      return [...state.slice(-2), action.toast];
    case "dismiss":
      return state.some((t) => t.id === action.id) ? state.filter((t) => t.id !== action.id) : state;
  }
};

export const toastStore = createStore(toastReducer, [] as Toast[]);

let nextId = 1;

export function toast(message: string, tone: ToastTone = "info", action?: Toast["action"]) {
  const id = nextId++;
  toastStore.dispatch({ type: "push", toast: { id, message, tone, action } });
  window.setTimeout(() => toastStore.dispatch({ type: "dismiss", id }), action ? 6000 : 3500);
}
