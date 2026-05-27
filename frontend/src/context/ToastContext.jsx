import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const styles = {
  success: { bg: 'bg-leaf border-sage/40 text-sage',           Icon: CheckCircle2 },
  error:   { bg: 'bg-red-50 border-red-200 text-red-700',      Icon: AlertCircle  },
  warning: { bg: 'bg-cream border-amber/50 text-stone-800',    Icon: AlertTriangle},
  info:    { bg: 'bg-white border-sage/20 text-stone-700',     Icon: Info         },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  // useRef para garantizar IDs únicos sin re-render
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((type, message, opts = {}) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, type, message, title: opts.title }]);
    setTimeout(() => dismiss(id), opts.duration || 4000);
  }, [dismiss]);

  const value = {
    success: (m, o) => show('success', m, o),
    error:   (m, o) => show('error', m, o),
    warning: (m, o) => show('warning', m, o),
    info:    (m, o) => show('info', m, o),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full">
        {toasts.map((t) => {
          const { bg, Icon } = styles[t.type];
          return (
            <div
              key={t.id}
              className={`flex items-start gap-3 p-4 rounded-2xl border shadow-soft ${bg} animate-[slide-in_0.2s_ease-out]`}
            >
              <Icon size={20} className="shrink-0 mt-0.5" />
              <div className="flex-1 text-sm">
                {t.title && <p className="font-bold mb-0.5">{t.title}</p>}
                <p>{t.message}</p>
              </div>
              <button onClick={() => dismiss(t.id)} className="opacity-60 hover:opacity-100">
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes slide-in {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return ctx;
}
