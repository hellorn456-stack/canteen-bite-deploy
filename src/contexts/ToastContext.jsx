import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'error') => {
    const id = nextId++;
    setToasts(prev => [...prev, { id, message, type }]);
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

  const STYLES = {
    error:   { bg: '#FDEDEC', border: '#E74C3C', color: '#C0392B', icon: '❌' },
    success: { bg: '#EAFAF1', border: '#2ECC71', color: '#1E8449', icon: '✅' },
    info:    { bg: '#EBF5FB', border: '#3498DB', color: '#2E86C1', icon: 'ℹ️' },
    warning: { bg: '#FEF9E7', border: '#F39C12', color: '#D68910', icon: '⚠️' },
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}

      {/* Toast container */}
      {toasts.length > 0 && (
        <div style={{
          position: 'fixed',
          top: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 32px)',
          maxWidth: '448px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          pointerEvents: 'none',
        }}>
          {toasts.map(({ id, message, type }) => {
            const s = STYLES[type] || STYLES.error;
            return (
              <div
                key={id}
                style={{
                  background: s.bg,
                  border: `1px solid ${s.border}`,
                  borderLeft: `4px solid ${s.border}`,
                  borderRadius: '12px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                  animation: 'slideDown 0.3s ease',
                  pointerEvents: 'all',
                }}
              >
                <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>{s.icon}</span>
                <p style={{
                  flex: 1,
                  fontSize: '13px',
                  fontWeight: '600',
                  color: s.color,
                  lineHeight: 1.5,
                  fontFamily: 'var(--font-body)',
                  margin: 0,
                }}>
                  {message}
                </p>
                <button
                  onClick={() => removeToast(id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: s.color,
                    fontSize: '16px',
                    lineHeight: 1,
                    padding: '0',
                    flexShrink: 0,
                    opacity: 0.7,
                  }}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
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
