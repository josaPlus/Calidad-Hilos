import { memo, forwardRef } from 'react';
import { X } from 'lucide-react';

// ====== Button ======
export const Button = memo(forwardRef(function Button(
  { variant = 'primary', size = 'md', loading, disabled, children, className = '', ...rest },
  ref
) {
  const base = 'btn';
  const variants = {
    primary: 'btn-primary',
    accent:  'btn-accent',
    ghost:   'btn-ghost',
    danger:  'btn-danger',
  };
  const sizes = { sm: 'text-xs px-3 py-1.5', md: '', lg: 'text-base px-5 py-3' };
  return (
    <button
      ref={ref}
      className={`${variants[variant] || base} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
      {children}
    </button>
  );
}));

// ====== Card ======
export const Card = memo(function Card({ title, subtitle, action, children, className = '', padding = true }) {
  return (
    <div className={`card ${className}`}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-4 px-5 pt-5">
          <div>
            {title && <h3 className="text-lg font-bold text-stone-800">{title}</h3>}
            {subtitle && <p className="text-sm text-stone-500 mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={padding ? 'p-5' : ''}>{children}</div>
    </div>
  );
});

// ====== Input ======
export function Input({ label, error, helper, className = '', ...rest }) {
  return (
    <div className={className}>
      {label && <label className="label">{label}</label>}
      <input className={`input ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : ''}`} {...rest} />
      {error   && <p className="text-xs text-red-600 mt-1">{error}</p>}
      {helper && !error && <p className="text-xs text-stone-500 mt-1">{helper}</p>}
    </div>
  );
}

export function Select({ label, children, ...rest }) {
  return (
    <div>
      {label && <label className="label">{label}</label>}
      <select className="input cursor-pointer" {...rest}>{children}</select>
    </div>
  );
}

export function Textarea({ label, ...rest }) {
  return (
    <div>
      {label && <label className="label">{label}</label>}
      <textarea className="input min-h-[80px]" {...rest} />
    </div>
  );
}

// ====== Badge ======
export const Badge = memo(function Badge({ tone = 'neutral', children }) {
  const tones = {
    neutral: 'bg-white/70 text-stone-700 border border-stone-200',
    success: 'bg-leaf text-sage border border-sage/30',
    danger:  'bg-red-100 text-red-700 border border-red-200',
    warning: 'bg-cream text-stone-800 border border-amber/40',
    info:    'bg-mist text-sage border border-sage/20',
    accent:  'bg-amber text-stone-900 border border-amber',
  };
  return <span className={`chip ${tones[tone]}`}>{children}</span>;
});

// ====== KPI ======
export const KpiCard = memo(function KpiCard({ icon: Icon, label, value, hint, tone = 'sage' }) {
  const tones = {
    sage:  'from-leaf to-mist text-sage',
    amber: 'from-cream to-mist text-stone-800',
    rose:  'from-rose-50 to-mist text-rose-700',
    sky:   'from-sky-50 to-mist text-sky-700',
  };
  return (
    <div className={`card overflow-hidden relative`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${tones[tone]} opacity-50 pointer-events-none`} />
      <div className="relative p-5 flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">{label}</p>
          <p className="text-3xl font-display font-extrabold mt-2 text-stone-900">{value}</p>
          {hint && <p className="text-xs text-stone-600 mt-1.5">{hint}</p>}
        </div>
        {Icon && (
          <div className="p-2.5 rounded-xl bg-white/70 border border-sage/15">
            <Icon size={22} className="text-sage" />
          </div>
        )}
      </div>
    </div>
  );
});

// ====== Modal ======
export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  if (!open) return null;
  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/30 backdrop-blur-sm">
      <div className={`bg-white rounded-2xl border border-sage/20 shadow-2xl w-full ${sizes[size]} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between p-5 border-b border-sage/10">
          <h2 className="text-xl font-bold text-stone-800">{title}</h2>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-700">
            <X size={22} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
        {footer && <div className="p-4 border-t border-sage/10 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

// ====== EmptyState ======
export function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="text-center py-16 px-4">
      {Icon && <Icon size={48} className="mx-auto text-sage/40 mb-4" />}
      <h3 className="text-lg font-bold text-stone-700 mb-1">{title}</h3>
      {message && <p className="text-sm text-stone-500 mb-4">{message}</p>}
      {action}
    </div>
  );
}

// ====== Spinner ======
export function Spinner({ size = 'md' }) {
  const sizes = { sm: 'w-4 h-4 border-2', md: 'w-8 h-8 border-3', lg: 'w-12 h-12 border-4' };
  return (
    <div className={`${sizes[size]} border-sage/20 border-t-sage rounded-full animate-spin`} />
  );
}
