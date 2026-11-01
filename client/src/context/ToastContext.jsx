import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ToastContext = createContext(null);

let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((toast) => {
    const id = nextId++;
    setToasts((list) => [...list, { id, type: 'info', ...toast }]);
    const ttl = toast.ttl ?? 4200;
    if (ttl > 0) setTimeout(() => dismiss(id), ttl);
    return id;
  }, [dismiss]);

  const value = useMemo(() => ({
    toasts,
    dismiss,
    toast: push,
    success: (message, title) => push({ type: 'success', message, title }),
    error: (message, title) => push({ type: 'error', message, title, ttl: 6000 }),
    info: (message, title) => push({ type: 'info', message, title }),
  }), [toasts, dismiss, push]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
