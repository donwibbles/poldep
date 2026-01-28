"use client";

import * as React from "react";

type ToastVariant = "default" | "destructive" | "success";

type ToastData = {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
};

type ToastState = {
  toasts: ToastData[];
};

type ToastAction =
  | { type: "ADD_TOAST"; toast: ToastData }
  | { type: "DISMISS_TOAST"; toastId: string };

function reducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case "ADD_TOAST":
      return { ...state, toasts: [...state.toasts, action.toast] };
    case "DISMISS_TOAST":
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.toastId) };
    default:
      return state;
  }
}

const ToastContext = React.createContext<{
  toasts: ToastData[];
  toast: (data: Omit<ToastData, "id">) => void;
  dismiss: (id: string) => void;
} | null>(null);

export function ToastContextProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(reducer, { toasts: [] });

  const toast = React.useCallback((data: Omit<ToastData, "id">) => {
    const id = Math.random().toString(36).slice(2);
    dispatch({ type: "ADD_TOAST", toast: { ...data, id } });
    setTimeout(() => dispatch({ type: "DISMISS_TOAST", toastId: id }), 5000);
  }, []);

  const dismiss = React.useCallback((id: string) => {
    dispatch({ type: "DISMISS_TOAST", toastId: id });
  }, []);

  return (
    <ToastContext.Provider value={{ toasts: state.toasts, toast, dismiss }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastContextProvider");
  return context;
}
