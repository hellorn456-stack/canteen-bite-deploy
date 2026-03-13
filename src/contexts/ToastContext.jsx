import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

const ToastContext = createContext(null);
let nextId = 1;
const DURATION = 4000;

const STYLES = {
  error:   { bg: '#FDEDEC', border: '#E74C3C', color: '#C0392B', icon: '❌', bar: '#E74C3C' },
  success: { bg: '#EAFAF1', border: '#2ECC71', color: '#1E8449', icon: '✅', bar: '#2ECC71' },
  info:    { bg: '#EBF5FB', border: '#3498DB', color: '#2E86C1', icon: 'ℹ️', bar: '#3498DB' },
  warning: { bg: '#FEF9E7', border: '#F39C12', color: '#D68910', icon: '⚠️', bar: '#F39C12' },
};

function Toast({ id, message, type, onRemove }) {
  const [exiting, setExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const startTime = useRef(Date.now());
  const rafRef    = useRef(null);
  const s = STYLES[type] || STYLES.info;

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onRemove(id), 280);
  }, [id, onRemove]);

  useEffect(() => {
    const tick = () => {
      const elapsed   = Date.now() - startTime.current;
      const remaining = Math.max(0, 100 - (elapsed / DURATION) * 100);
      setProgress(remaining);
      if (remaining > 0) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        dismiss();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [dismiss]);

  return (
    <div style={{
      background: s.bg,
      border: `1px solid ${s.border}`,
      borderLeft: `4px solid ${s.border}`,
      borderRadius: '14px',
      padding: '14px 14px 10px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.13)',
      animation: exiting ? 'toastOut 0.28s ease forwards' : 'toastIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards',
      pointerEvents: 'all',
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <span style={{ fontSize: '17px', flexShrink: 0, marginTop: '1px' }}>{s.icon}</span>
        <p style={{
          flex: 1, fontSize: '13.5px', fontWeight: '600',
          color: s.color, lineHeight: 1.5,
          fontFamily: 'var(--font-body)', margin: 0,
        }}>{message}</p>
        <button onClick={dismiss} style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: s.color, fontSize: '16px', lineHeight: 1,
          padding: '0', flexShrink: 0, opacity: 0.6,
        }}>✕</button>
      </div>
      <div style={{ height: '3px', background: `${s.bar}33`, borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${progress}%`,
          background: s.bar, borderRadius: '2px',
        }} />
      </div>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = nextId++;
    setToasts(prev => [...prev.slice(-3), { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = {
    error:   (msg) => addToast(msg, 'error'),
    success: (msg) => addToast(msg, 'success'),
    info:    (msg) => addToast(msg, 'info'),
    warning: (msg) => addToast(msg, 'warning'),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {toasts.length > 0 && (
        <div style={{
          position: 'fixed', top: '12px',
          left: '50%', transform: 'translateX(-50%)',
          width: 'calc(100% - 32px)', maxWidth: '448px',
          zIndex: 9999, display: 'flex', flexDirection: 'column',
          gap: '8px', pointerEvents: 'none',
        }}>
          {toasts.map(({ id, message, type }) => (
            <Toast key={id} id={id} message={message} type={type} onRemove={removeToast} />
          ))}
        </div>
      )}
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(-10px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes toastOut {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to   { opacity: 0; transform: translateY(-8px) scale(0.95); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
};
