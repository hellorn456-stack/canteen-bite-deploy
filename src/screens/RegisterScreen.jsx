import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import config from '../config';

const BRANCHES = ['CSE', 'IT', 'Mechanical', 'Civil', 'Electrical', 'Electronics'];
const YEARS = ['First Year', 'Second Year', 'Third Year', 'Fourth Year'];

export default function RegisterScreen() {
  const [params]     = useSearchParams();
  const isGoogleFlow = params.get('google') === '1';

  const [role, setRole]             = useState('student');
  const [name, setName]             = useState('');
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [branch, setBranch]         = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [year, setYear]             = useState('');
  const [staffId, setStaffId]       = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  const { registerStudent, registerStaff, completeStudentProfile, user, profile } = useAuth();
  const navigate = useNavigate();

  // Pre-fill name/email for Google flow
  useEffect(() => {
    if (isGoogleFlow && user) {
      setName(user.displayName || '');
      setEmail(user.email || '');
    }
  }, [isGoogleFlow, user]);

  // If user already has a complete profile, redirect them away
  // (handles case where someone navigates to /register manually while logged in)
  useEffect(() => {
    if (profile?.role) {
      navigate(profile.role === 'manager' ? '/manager' : '/menu', { replace: true });
    }
  }, [profile, navigate]);

  // If not a Google flow and not logged in — normal register page, nothing to do
  // If Google flow but no user — send back to login
  useEffect(() => {
    if (isGoogleFlow && !user) {
      navigate('/login', { replace: true });
    }
  }, [isGoogleFlow, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Email suffix check — only for normal (non-Google) registration
      if (!isGoogleFlow && config.emailSuffix) {
        const suffix = config.emailSuffix.toLowerCase();
        if (!email.toLowerCase().endsWith('@' + suffix)) {
          throw new Error('Only ' + config.collegeName + ' email addresses are allowed (e.g. yourname@' + suffix + ').');
        }
      }

      if (role === 'student') {
        if (!branch || !year) throw new Error('Please fill in all required fields.');
        if (isGoogleFlow && user) {
          await completeStudentProfile(user.uid, { name, branch, rollNumber, year });
        } else {
          await registerStudent({ email, password, name, branch, rollNumber, year });
        }
        navigate('/menu');
      } else {
        if (!isGoogleFlow) {
          await registerStaff({ email, password, name, staffId });
          navigate('/menu');
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(160deg, var(--primary) 0%, var(--primary-dark) 100%)',
        padding: '32px 24px 48px',
        borderRadius: '0 0 40px 40px',
      }}>
        <button
          onClick={() => navigate('/login')}
          style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}
        >
          ←
        </button>
        <h1 style={{ color: 'white', fontFamily: 'var(--font-heading)', fontSize: '24px' }}>
          {isGoogleFlow ? 'Complete Your Profile' : 'Create Account'}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', marginTop: '4px' }}>
          {`Join ${config.appName} – ${config.collegeName}`}
        </p>
      </div>

      <div style={{ flex: 1, padding: '24px 20px', marginTop: '-20px' }}>
        <div className="card" style={{ padding: '24px', animation: 'fadeIn 0.4s ease' }}>

          {/* Role selector — shown only for normal registration, not Google flow */}
          {!isGoogleFlow && (
            <div className="tab-bar" style={{ marginBottom: '20px' }}>
              <button
                className={`tab-item ${role === 'student' ? 'active' : ''}`}
                onClick={() => setRole('student')}
              >
                🎓 Student
              </button>
              <button
                className={`tab-item ${role === 'staff' ? 'active' : ''}`}
                onClick={() => setRole('staff')}
              >
                👨‍💼 Staff
              </button>
            </div>
          )}

          {/* Google flow — always student only */}
          {isGoogleFlow && (
            <div className="alert alert-info" style={{ marginBottom: '16px' }}>
              🎓 Google sign-in is for <strong>Students only</strong>. Staff must register with email & password.
            </div>
          )}

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="input-label">Full Name *</label>
              <input
                type="text"
                className="input-field"
                placeholder="Your full name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>

            {/* Email & Password — hidden in Google flow */}
            {!isGoogleFlow && (
              <>
                <div className="input-group">
                  <label className="input-label">Email Address *</label>
                  <input
                    type="email"
                    className="input-field"
                    placeholder={config.emailSuffix ? 'yourname@' + config.emailSuffix : 'your@email.com'}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                  {config.emailSuffix && (
                    <p style={{ fontSize: '11px', color: 'var(--gray-400)', marginTop: '3px' }}>
                      Only @{config.emailSuffix} addresses are accepted
                    </p>
                  )}
                </div>
                <div className="input-group">
                  <label className="input-label">Password *</label>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="Minimum 6 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </>
            )}

            {/* Student fields */}
            {(role === 'student' || isGoogleFlow) && (
              <>
                <div className="input-group">
                  <label className="input-label">Roll Number *</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. CS2021001"
                    value={rollNumber}
                    onChange={e => setRollNumber(e.target.value.toUpperCase())}
                    required
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Branch *</label>
                  <select className="input-field" value={branch} onChange={e => setBranch(e.target.value)} required>
                    <option value="">Select Branch</option>
                    {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Year *</label>
                  <select className="input-field" value={year} onChange={e => setYear(e.target.value)} required>
                    <option value="">Select Year</option>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </>
            )}

            {/* Staff fields — only for normal registration */}
            {role === 'staff' && !isGoogleFlow && (
              <div className="input-group">
                <label className="input-label">Staff ID *</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. STF001"
                  value={staffId}
                  onChange={e => setStaffId(e.target.value.toUpperCase())}
                  required
                />
              </div>
            )}

            <div className="alert alert-info" style={{ marginTop: '8px' }}>
              ℹ️ After registration, visit the canteen to add money to your wallet.
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading}
              style={{ marginTop: '8px' }}
            >
              {loading
                ? <><span className="spinner" /> {isGoogleFlow ? 'Saving...' : 'Creating Account...'}</>
                : isGoogleFlow ? 'Complete Registration' : 'Create Account'
              }
            </button>
          </form>
        </div>

        {!isGoogleFlow && (
          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: 'var(--gray-500)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--primary)', fontWeight: '700', textDecoration: 'none' }}>
              Sign In
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
