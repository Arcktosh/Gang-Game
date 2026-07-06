'use client';

import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';

type ToastKind = 'success' | 'error' | 'info' | 'warning';

type ToastInput = {
  title?: string;
  message: string;
  kind?: ToastKind;
  timeoutMs?: number;
};

type ToastItem = Required<Pick<ToastInput, 'message' | 'kind'>> & {
  id: string;
  title?: string;
};

type ToastContextValue = {
  showToast: (toast: ToastInput) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function createToastId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((items) => items.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback((toast: ToastInput) => {
    const id = createToastId();
    const timeoutMs = toast.timeoutMs ?? (toast.kind === 'error' ? 7000 : 4200);

    setToasts((items) => [
      ...items.slice(-4),
      {
        id,
        title: toast.title,
        message: toast.message,
        kind: toast.kind ?? 'info',
      },
    ]);

    window.setTimeout(() => removeToast(id), timeoutMs);
  }, [removeToast]);

  const value = useMemo<ToastContextValue>(() => ({
    showToast,
    success: (message, title = 'Success') => showToast({ kind: 'success', title, message }),
    error: (message, title = 'Error') => showToast({ kind: 'error', title, message }),
    info: (message, title = 'Notice') => showToast({ kind: 'info', title, message }),
    warning: (message, title = 'Warning') => showToast({ kind: 'warning', title, message }),
  }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-viewport" role="status" aria-live="polite" aria-relevant="additions text">
        {toasts.map((toast) => (
          <article className={`toast toast--${toast.kind}`} key={toast.id}>
            <div>
              {toast.title ? <strong className="toast__title">{toast.title}</strong> : null}
              <p className="toast__message">{toast.message}</p>
            </div>
            <button className="toast__dismiss" type="button" onClick={() => removeToast(toast.id)} aria-label="Dismiss notification">
              ×
            </button>
          </article>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const value = useContext(ToastContext);

  if (!value) {
    throw new Error('useToast must be used within ToastProvider.');
  }

  return value;
}
