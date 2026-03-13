import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import config from '../config';
// Logo import — wrapped in try/catch at runtime via onError fallback
let logoUrl = null;
try { logoUrl = new URL('../assets/logo.png', import.meta.url).href; } catch {}

export default function LoginScreen() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const [error, setError]       = useState('');
  const [showPass, setShowPass] = useState(false);

  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const profileData = await login(email, password);
      if (profileData?.role === 'manager') navigate('/manager');
      else navigate('/menu');
    } catch (err) {
      setError(getFirebaseError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setGLoading(true);
    try {
      const result = await loginWithGoogle();
      if (result.needsProfileSetup) {
        navigate('/register?google=1');
      } else if (result.profile?.role === 'manager') {
        navigate('/manager');
      } else {
        navigate('/menu');
      }
    } catch (err) {
      setError('Google sign-in failed. Please try again.');
    } finally {
      setGLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Hero section */}
      <div style={{
        background: 'linear-gradient(160deg, var(--primary) 0%, var(--primary-dark) 100%)',
        padding: '48px 24px 56px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        borderRadius: '0 0 40px 40px',
      }}>
        {/* Logo */}
        <div style={{
          width: '80px', height: '80px',
          borderRadius: '20px',
          background: 'rgba(255,255,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(10px)',
          overflow: 'hidden',
          border: '2px solid rgba(255,255,255,0.3)',
        }}>
          {logoUrl
            ? <img src={logoUrl} alt={config.collegeName + ' Logo'}
                style={{ width: '60px', height: '60px', objectFit: 'contain' }}
                onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='block'; }} />
            : null}
          <span style={{ fontSize: '32px', display: logoUrl ? 'none' : 'block' }}>🍽️</span>
        </div>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ color: 'white', fontSize: '28px', fontFamily: 'var(--font-heading)' }}>
            CanteenBite
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px', marginTop: '4px' }}>
            {config.collegeName} Smart Canteen
          </p>
        </div>
      </div>

      {/* Form card */}
      <div style={{ flex: 1, padding: '24px 20px', marginTop: '-20px' }}>
        <div className="card" style={{ padding: '24px', animation: 'fadeIn 0.4s ease' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '20px', textAlign: 'center' }}>
            Welcome back! 👋
          </h2>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleLogin}>
            <div className="input-group">
              <label className="input-label">Email Address</label>
              <input
                type="email"
                className="input-field"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input-field"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{ paddingRight: '44px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--gray-500)',
                  }}
                >
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginTop: '8px' }}>
              {loading ? <><span className="spinner" /> Signing in...</> : 'Sign In'}
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--gray-200)' }} />
            <span style={{ color: 'var(--gray-400)', fontSize: '12px', fontWeight: '700' }}>OR</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--gray-200)' }} />
          </div>

          <button
            onClick={handleGoogle}
            className="btn btn-ghost btn-full"
            disabled={gLoading}
          >
            {gLoading ? <><span className="spinner spinner-dark" /> Connecting...</> : (
              <>
                <GoogleIcon />
                Continue with Google
              </>
            )}
          </button>
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: 'var(--gray-500)' }}>
          New to CanteenBite?{' '}
          <Link to="/register" style={{ color: 'var(--primary)', fontWeight: '700', textDecoration: 'none' }}>
            Create Account
          </Link>
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function getFirebaseError(code) {
  const errors = {
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
    'auth/invalid-credential': 'Invalid email or password.',
  };
  return errors[code] || 'Login failed. Please check your credentials.';
}
