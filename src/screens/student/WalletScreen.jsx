import { useAuth } from '../../contexts/AuthContext';
import BottomNav from '../../components/BottomNav';

export default function WalletScreen() {
  const { profile } = useAuth();
  const balance = profile?.walletBalance ?? 0;

  return (
    <div className="screen">
      <div className="screen-header">
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px' }}>💳 My Wallet</h2>
      </div>

      <div className="screen-body">
        {/* Balance card */}
        <div style={{
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
          borderRadius: 'var(--radius-xl)',
          padding: '28px 24px',
          marginBottom: '20px',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Decorative circles */}
          <div style={{
            position: 'absolute', top: '-20px', right: '-20px',
            width: '100px', height: '100px',
            borderRadius: '50%', background: 'rgba(255,255,255,0.1)',
          }} />
          <div style={{
            position: 'absolute', bottom: '-30px', right: '40px',
            width: '80px', height: '80px',
            borderRadius: '50%', background: 'rgba(255,255,255,0.07)',
          }} />

          <p style={{ fontSize: '13px', opacity: 0.8, marginBottom: '8px' }}>Available Balance</p>
          <h1 style={{ fontSize: '42px', fontFamily: 'var(--font-heading)', letterSpacing: '-1px' }}>
            ₹{balance.toFixed(2)}
          </h1>
          <p style={{ marginTop: '16px', fontSize: '12px', opacity: 0.75 }}>
            {profile?.role === 'student' ? `Student · ${profile?.rollNumber}` : `Staff · ${profile?.staffId}`}
          </p>
        </div>

        {/* Info card */}
        <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>ℹ️ How Wallet Works</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { icon: '🏪', text: 'Visit the canteen counter in person' },
              { icon: '💬', text: 'Request wallet recharge from the manager' },
              { icon: '⚡', text: 'Balance is updated instantly in the app' },
              { icon: '🛒', text: 'Your wallet is debited when you place an order' },
              { icon: '↩️', text: 'Cancelled orders are refunded immediately' },
            ].map(({ icon, text }, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '20px', flexShrink: 0 }}>{icon}</span>
                <p style={{ fontSize: '14px', color: 'var(--gray-600)', lineHeight: 1.4 }}>{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Low balance warning */}
        {balance < 50 && balance >= 0 && (
          <div className="alert alert-warning">
            ⚠️ Your balance is low. Visit the canteen counter to recharge your wallet.
          </div>
        )}
        {balance === 0 && (
          <div className="alert alert-error">
            ❌ Your wallet is empty. You cannot place orders until you recharge.
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
