import { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import BottomNav from '../../components/BottomNav';
import config from '../../config';

export default function WalletScreen() {
  const { profile, user } = useAuth();
  const balance = profile?.walletBalance ?? 0;

  // Show welcome bonus modal if this is first time user opens app
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  useEffect(() => {
    if (profile && profile.welcomeBonusClaimed === false && config.welcomeBonus > 0) {
      setShowWelcomeModal(true);
    }
  }, [profile]);

  const dismissWelcomeModal = async () => {
    setShowWelcomeModal(false);
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), { welcomeBonusClaimed: true });
      } catch {}
    }
  };

  return (
    <div className="screen">
      <div className="screen-header">
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px' }}>💳 My Wallet</h2>
      </div>

      <div className="screen-body">
        {/* ── Balance Card ── */}
        <div style={{
          background: 'linear-gradient(135deg, #1A1A2E 0%, #2D2D44 50%, var(--primary-dark) 100%)',
          borderRadius: 'var(--radius-xl)',
          padding: '28px 24px 24px',
          marginBottom: '20px',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(26,26,46,0.3)',
        }}>
          {/* Decorative orbs */}
          <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '130px', height: '130px', borderRadius: '50%', background: 'rgba(232,89,12,0.18)' }} />
          <div style={{ position: 'absolute', bottom: '-20px', left: '20px',  width: '80px',  height: '80px',  borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ position: 'absolute', top: '50%', right: '20%', width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(232,89,12,0.1)' }} />

          {/* Card chip icon */}
          <div style={{
            width: '40px', height: '28px',
            background: 'linear-gradient(135deg, #F7B731, #e0a020)',
            borderRadius: '5px',
            marginBottom: '20px',
            position: 'relative', zIndex: 1,
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
          }} />

          <p style={{ fontSize: '12px', opacity: 0.65, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '6px', position: 'relative', zIndex: 1 }}>
            Available Balance
          </p>
          <h1 style={{
            fontSize: '44px',
            fontFamily: 'var(--font-heading)',
            letterSpacing: '-1px',
            lineHeight: 1,
            position: 'relative', zIndex: 1,
          }}>
            ₹{balance.toFixed(2)}
          </h1>

          {/* Divider */}
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.12)', margin: '20px 0 16px', position: 'relative', zIndex: 1 }} />

          {/* User info row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', position: 'relative', zIndex: 1 }}>
            <div>
              <p style={{ fontSize: '10px', opacity: 0.5, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '3px' }}>Card Holder</p>
              <p style={{ fontSize: '14px', fontWeight: '700', opacity: 0.95 }}>{profile?.name || '—'}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '10px', opacity: 0.5, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '3px' }}>
                {profile?.role === 'student' ? 'Roll No.' : 'Staff ID'}
              </p>
              <p style={{ fontSize: '13px', fontWeight: '700', opacity: 0.9 }}>
                {profile?.role === 'student' ? profile?.rollNumber : profile?.staffId}
              </p>
            </div>
          </div>
        </div>

        {/* Balance status alerts */}
        {balance === 0 && (
          <div className="alert alert-error">
            ❌ Your wallet is empty. You cannot place orders until you recharge.
          </div>
        )}
        {balance > 0 && balance < 50 && (
          <div className="alert alert-warning">
            ⚠️ Low balance. Visit the canteen counter to recharge your wallet.
          </div>
        )}

        {/* How it works */}
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '15px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>ℹ️</span> How Wallet Works
          </h3>
          {[
            { icon: '🏪', title: 'Visit the counter', desc: 'Go to the canteen in person to request a recharge' },
            { icon: '💬', title: 'Ask the manager',   desc: 'Request wallet top-up from the canteen manager' },
            { icon: '⚡', title: 'Instant update',    desc: 'Balance appears in your app immediately' },
            { icon: '🛒', title: 'Auto deduction',    desc: 'Wallet is debited when you place an order' },
            { icon: '↩️', title: 'Instant refund',    desc: 'Cancelled orders are refunded right away' },
          ].map(({ icon, title, desc }, i) => (
            <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: i < 4 ? '14px' : 0 }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: 'var(--radius-md)',
                background: 'var(--primary-bg)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: '18px', flexShrink: 0,
              }}>
                {icon}
              </div>
              <div>
                <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--gray-800)', lineHeight: 1.2, marginBottom: '2px' }}>{title}</p>
                <p style={{ fontSize: '12px', color: 'var(--gray-500)', lineHeight: 1.4 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <BottomNav />

      {/* Welcome Bonus Modal */}
      {showWelcomeModal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9000, padding: '24px',
          backdropFilter: 'blur(4px)',
        }}>
          <div className="card" style={{
            padding: '32px 24px',
            maxWidth: '360px',
            width: '100%',
            textAlign: 'center',
            animation: 'fadeIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            {/* Confetti emoji header */}
            <div style={{ fontSize: '56px', marginBottom: '12px' }}>🎉</div>

            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', color: 'var(--primary)', marginBottom: '8px' }}>
              Welcome Bonus!
            </h2>

            <p style={{ fontSize: '14px', color: 'var(--gray-600)', marginBottom: '20px', lineHeight: 1.6 }}>
              We've added a welcome bonus to your wallet to get you started!
            </p>

            {/* Bonus amount display */}
            <div style={{
              background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
              borderRadius: 'var(--radius-xl)',
              padding: '20px',
              marginBottom: '24px',
              color: 'white',
            }}>
              <p style={{ fontSize: '13px', opacity: 0.8, marginBottom: '4px' }}>Added to your wallet</p>
              <p style={{ fontFamily: 'var(--font-heading)', fontSize: '42px', fontWeight: '800', letterSpacing: '-1px' }}>
                ₹{config.welcomeBonus}
              </p>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--gray-400)', marginBottom: '20px' }}>
              Use this to place your first order. Enjoy your meal! 🍽️
            </p>

            <button
              className="btn btn-primary btn-full"
              onClick={dismissWelcomeModal}
            >
              Let's Order! 🎊
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
