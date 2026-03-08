import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { playOrderReadySound, unlockAudio } from '../utils/sounds';
import { requestNotificationPermission } from '../utils/sounds';

const getBrowserName = () => {
  const ua = navigator.userAgent;
  if (ua.includes('Edg/'))    return 'edge';
  if (ua.includes('Chrome'))  return 'chrome';
  if (ua.includes('Firefox')) return 'firefox';
  if (ua.includes('Safari'))  return 'safari';
  return 'chrome';
};

const BROWSER_INSTRUCTIONS = {
  chrome: {
    name: 'Chrome', icon: '🟡',
    steps: [
      'Tap the 🔒 lock icon in the address bar',
      'Tap "Site settings" or "Permissions"',
      'Set "Notifications" → Allow',
      'Come back and reload the page',
    ],
  },
  edge: {
    name: 'Edge', icon: '🔵',
    steps: [
      'Tap the 🔒 lock icon in the address bar',
      'Tap "Permissions for this site"',
      'Set "Notifications" → Allow',
      'Come back and reload the page',
    ],
  },
  firefox: {
    name: 'Firefox', icon: '🦊',
    steps: [
      'Tap the 🔒 lock icon in the address bar',
      'Tap "Edit Site Settings"',
      'Set "Notifications" → Allow',
      'Reload the page',
    ],
  },
  safari: {
    name: 'Safari', icon: '🧭',
    steps: [
      'Go to Settings → Safari → Notifications',
      'Find this website and set to Allow',
      'Come back and reload the page',
    ],
  },
};

export default function PermissionModal() {
  const [step, setStep]       = useState('idle');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const browser  = getBrowserName();
  const info     = BROWSER_INSTRUCTIONS[browser];

  // ── Storage key is USER-SPECIFIC ──────────────────────────
  // This means each user on the same device gets their own
  // permission prompt — user B won't be skipped because user A
  // already went through it
  const STORAGE_KEY = user?.uid ? `canteenbite_permission_${user.uid}` : null;

  useEffect(() => {
    if (!STORAGE_KEY) return;

    // Check if THIS specific user has already been asked
    const alreadyAsked = localStorage.getItem(STORAGE_KEY);
    if (alreadyAsked) {
      // User was already asked before — just silently unlock audio
      // so sound works for them without showing the modal again
      unlockAudio();
      return;
    }

    // Show modal after short delay
    const timer = setTimeout(() => setStep('ask'), 900);
    return () => clearTimeout(timer);
  }, [STORAGE_KEY]); // re-runs when user changes (login/switch)

  const handleEnable = async () => {
    setLoading(true);
    try {
      // Unlock AudioContext with this user gesture
      await unlockAudio();

      // Request notification permission
      let notifGranted = false;
      if ('Notification' in window) {
        const result = await Notification.requestPermission();
        notifGranted = result === 'granted';
      }

      // Play the sound so user knows what to expect
      await playOrderReadySound();

      // Mark as asked for THIS user
      if (STORAGE_KEY) localStorage.setItem(STORAGE_KEY, '1');

      setStep(notifGranted ? 'done' : 'denied');
      if (notifGranted) setTimeout(() => setStep('idle'), 2800);
    } catch (e) {
      if (STORAGE_KEY) localStorage.setItem(STORAGE_KEY, '1');
      setStep('denied');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    if (STORAGE_KEY) localStorage.setItem(STORAGE_KEY, '1');
    // Still unlock audio even if they skip notifications
    unlockAudio();
    setStep('idle');
  };

  const handleDoneFromDenied = () => {
    if (STORAGE_KEY) localStorage.setItem(STORAGE_KEY, '1');
    setStep('idle');
  };

  if (step === 'idle') return null;

  return (
    <>
      <div style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.55)',
        zIndex: 9998,
        backdropFilter: 'blur(3px)',
        animation: 'fadeInBg 0.3s ease',
      }} />

      <div style={{
        position: 'fixed', bottom: 0,
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
          background: 'var(--gray-300)', margin: '12px auto 20px',
        }} />

        {/* ── ASK ── */}
        {step === 'ask' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '22px' }}>
              <div style={{
                width: '72px', height: '72px', borderRadius: '22px',
                background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px', fontSize: '36px',
                boxShadow: 'var(--shadow-primary)',
              }}>🔔</div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '22px', marginBottom: '8px' }}>
                Never Miss Your Order!
              </h2>
              <p style={{ color: 'var(--gray-500)', fontSize: '14px', lineHeight: 1.65 }}>
                Allow <strong>notifications &amp; sound</strong> so CanteenBite
                can alert you the moment your food is ready. 🍽️
              </p>
            </div>

            <div style={{
              background: 'var(--gray-50)', borderRadius: 'var(--radius-lg)',
              padding: '16px', marginBottom: '22px',
              display: 'flex', flexDirection: 'column', gap: '12px',
            }}>
              {[
                { icon: '📳', title: 'Browser Notifications', desc: 'Get notified even when the app is in the background' },
                { icon: '🔊', title: 'Alert Sound',           desc: 'A distinct sound plays when your token is ready' },
                { icon: '⚡', title: 'One-time Setup',        desc: 'Set it once, works automatically every visit' },
              ].map(({ icon, title, desc }) => (
                <div key={title} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <span style={{
                    width: '40px', height: '40px', borderRadius: '12px',
                    background: 'var(--primary-bg)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: '20px', flexShrink: 0,
                  }}>{icon}</span>
                  <div>
                    <p style={{ fontWeight: '700', fontSize: '13px', marginBottom: '2px' }}>{title}</p>
                    <p style={{ color: 'var(--gray-500)', fontSize: '12px', lineHeight: 1.5 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              className="btn btn-primary btn-full"
              onClick={handleEnable}
              disabled={loading}
              style={{ fontSize: '16px', padding: '15px', marginBottom: '10px' }}
            >
              {loading
                ? <><span className="spinner" /> Setting up...</>
                : '🔔 Enable Notifications & Sound'
              }
            </button>
            <button className="btn btn-ghost btn-full" onClick={handleSkip}>
              Not now
            </button>
          </>
        )}

        {/* ── DENIED ── */}
        {step === 'denied' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{
                width: '72px', height: '72px', borderRadius: '22px',
                background: '#FEF9E7',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px', fontSize: '36px',
              }}>⚙️</div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', marginBottom: '8px' }}>
                One Quick Step
              </h2>
              <p style={{ color: 'var(--gray-500)', fontSize: '13px', lineHeight: 1.6 }}>
                Your browser blocked notifications. Follow these steps
                in <strong>{info.icon} {info.name}</strong>:
              </p>
            </div>

            <div style={{
              background: '#FEF9E7', border: '1px solid #F39C12',
              borderRadius: 'var(--radius-lg)', padding: '16px', marginBottom: '16px',
            }}>
              {info.steps.map((s, i) => (
                <div key={i} style={{
                  display: 'flex', gap: '12px', alignItems: 'flex-start',
                  marginBottom: i < info.steps.length - 1 ? '12px' : 0,
                }}>
                  <span style={{
                    width: '24px', height: '24px', borderRadius: '50%',
                    background: '#F39C12', color: 'white', fontSize: '12px',
                    fontWeight: '800', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flexShrink: 0,
                  }}>{i + 1}</span>
                  <span style={{ fontSize: '13px', color: 'var(--gray-700)', lineHeight: 1.55, paddingTop: '2px' }}>{s}</span>
                </div>
              ))}
            </div>

            <div className="alert alert-info" style={{ marginBottom: '16px', fontSize: '12px' }}>
              💡 <strong>Good news:</strong> Sound already works since you clicked the button!
            </div>

            <button
              className="btn btn-primary btn-full"
              onClick={handleDoneFromDenied}
              style={{ fontSize: '15px', padding: '14px' }}
            >
              Got it — Done!
            </button>
          </>
        )}

        {/* ── DONE ── */}
        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '12px 0 8px' }}>
            <div style={{ fontSize: '60px', marginBottom: '14px' }}>🎉</div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', color: 'var(--success)', marginBottom: '8px' }}>
              You're all set!
            </h2>
            <p style={{ color: 'var(--gray-500)', fontSize: '14px', lineHeight: 1.6 }}>
              You'll get a sound alert &amp; notification the moment
              your token is ready for pickup!
            </p>
          </div>
        )}
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
