const STAGES = ['Placed', 'Preparing', 'Ready', 'Completed'];

export default function OrderProgressBar({ status }) {
  const currentIdx = STAGES.indexOf(status);
  const isCancelled = status === 'Cancelled';

  if (isCancelled) {
    return (
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <span className="badge badge-cancelled">✕ Order Cancelled – Refund processed</span>
      </div>
    );
  }

  return (
    <div style={{ padding: '4px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
        {/* Connecting line */}
        <div style={{
          position: 'absolute',
          top: '14px',
          left: '14px',
          right: '14px',
          height: '3px',
          background: 'var(--gray-200)',
          borderRadius: '2px',
        }} />
        <div style={{
          position: 'absolute',
          top: '14px',
          left: '14px',
          height: '3px',
          background: 'var(--primary)',
          borderRadius: '2px',
          width: currentIdx === 0 ? '0%'
                : currentIdx === 1 ? '33%'
                : currentIdx === 2 ? '66%'
                : '100%',
          transition: 'width 0.5s ease',
        }} />

        {STAGES.map((stage, idx) => {
          const done    = idx < currentIdx;
          const current = idx === currentIdx;
          return (
            <div key={stage} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              position: 'relative',
              zIndex: 1,
              flex: 1,
            }}>
              {/* Circle */}
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: done || current ? 'var(--primary)' : 'var(--white)',
                border: `3px solid ${done || current ? 'var(--primary)' : 'var(--gray-300)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
                boxShadow: current ? 'var(--shadow-primary)' : 'none',
              }}>
                {done ? (
                  <svg viewBox="0 0 12 12" width="12" height="12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : current ? (
                  <div style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: 'white',
                    animation: 'pulse 1.5s infinite',
                  }} />
                ) : null}
              </div>
              {/* Label */}
              <span style={{
                fontSize: '10px',
                fontWeight: done || current ? '800' : '600',
                color: done || current ? 'var(--primary)' : 'var(--gray-400)',
                fontFamily: 'var(--font-body)',
                textAlign: 'center',
                lineHeight: 1.2,
              }}>
                {stage}
              </span>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(0.7); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
