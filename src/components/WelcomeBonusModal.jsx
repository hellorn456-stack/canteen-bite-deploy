import { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import config from '../config';

export default function WelcomeBonusModal({ permissionHandled }) {
  const { profile, user } = useAuth();
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Only show after permission modal has been dealt with
    if (!permissionHandled) return;
    if (profile && profile.welcomeBonusClaimed === false && config.welcomeBonus > 0) {
      // Small delay so it feels like a natural follow-up
      const t = setTimeout(() => setShow(true), 400);
      return () => clearTimeout(t);
    }
  }, [permissionHandled, profile]);

  const dismiss = async () => {
    setShow(false);
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), { welcomeBonusClaimed: true });
      } catch {}
    }
  };

  if (!show) return null;

  return (
    <>
      <div style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.6)',
        zIndex: 9998,
        backdropFilter: 'blur(4px)',
        animation: 'fadeInBg 0.3s ease',
      }} />

      <div style={{
        position: 'fixed',
        bottom: 0,
        left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: '480px',
        background: 'white',
        borderRadius: '24px 24px 0 0',
        padding: '8px 24px 40px',
        zIndex: 9999,
        animation: 'slideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        {/* Drag handle */}
        <div style={{
          width: '40px', height: '4px', borderRadius: '2px',
          background: 'var(--gray-300)', margin: '12px auto 24px',
        }} />

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '60px', marginBottom: '12px' }}>🎉</div>
          <h2 style={{
            fontFamily: 'var(--font-heading)', fontSize: '26px',
            color: 'var(--primary)', marginBottom: '10px',
          }}>
            Welcome Bonus!
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--gray-600)', lineHeight: 1.6 }}>
            We've added a free welcome bonus to your wallet to get you started!
          </p>
        </div>

        {/* Bonus amount */}
        <div style={{
          background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
          borderRadius: 'var(--radius-xl)',
          padding: '22px',
          marginBottom: '24px',
          color: 'white',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '13px', opacity: 0.8, marginBottom: '6px' }}>Added to your wallet</p>
          <p style={{
            fontFamily: 'var(--font-heading)', fontSize: '48px',
            fontWeight: '800', letterSpacing: '-2px', lineHeight: 1,
          }}>
            ₹{config.welcomeBonus}
          </p>
        </div>

        <p style={{ fontSize: '12px', color: 'var(--gray-400)', textAlign: 'center', marginBottom: '20px' }}>
          Use this to place your first order. Enjoy your meal! 🍽️
        </p>

        <button className="btn btn-primary btn-full" style={{ fontSize: '16px', padding: '15px' }} onClick={dismiss}>
          Let's Order! 🎊
        </button>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateX(-50%) translateY(100%); opacity: 0; }
          to   { transform: translateX(-50%) translateY(0);    opacity: 1; }
        }
        @keyframes fadeInBg {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </>
  );
}
