import config from '../../config';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../../components/BottomNav';

export default function ProfileScreen() {
  const { profile, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (!window.confirm('Are you sure you want to sign out?')) return;
    await logout();
    navigate('/login');
  };

  const avatar = profile?.name?.charAt(0)?.toUpperCase() || '?';

  return (
    <div className="screen">
      <div className="screen-header">
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px' }}>👤 Profile</h2>
      </div>

      <div className="screen-body">
        {/* Avatar card */}
        <div className="card" style={{ padding: '24px', textAlign: 'center', marginBottom: '16px' }}>
          <div style={{
            width: '72px', height: '72px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
            color: 'white',
            fontFamily: 'var(--font-heading)',
            fontSize: '32px',
            fontWeight: '800',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
            boxShadow: 'var(--shadow-primary)',
          }}>
            {avatar}
          </div>
          <h2 style={{ fontSize: '20px' }}>{profile?.name}</h2>
          <p style={{ color: 'var(--gray-500)', fontSize: '13px', marginTop: '4px' }}>
            {user?.email}
          </p>
          <span className={`badge ${profile?.role === 'manager' ? '' : 'badge-placed'}`} style={{
            marginTop: '8px',
            display: 'inline-flex',
            background: profile?.role === 'manager' ? 'linear-gradient(135deg, var(--primary), var(--primary-dark))' : undefined,
            color: profile?.role === 'manager' ? 'white' : undefined,
          }}>
            {profile?.role === 'student' ? '🎓 Student'
              : profile?.role === 'staff' ? '👨‍💼 Staff'
              : '⚙️ Manager'}
          </span>
        </div>

        {/* Details */}
        <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '15px', marginBottom: '14px', color: 'var(--gray-500)', fontWeight: '700' }}>
            ACCOUNT DETAILS
          </h3>
          {profile?.role === 'student' && (
            <>
              <ProfileRow label="Roll Number" value={profile?.rollNumber} />
              <ProfileRow label="Branch" value={profile?.branch} />
              <ProfileRow label="Year" value={profile?.year} />
            </>
          )}
          {profile?.role === 'staff' && (
            <ProfileRow label="Staff ID" value={profile?.staffId} />
          )}
          <ProfileRow label="Wallet Balance" value={`₹${profile?.walletBalance ?? 0}`} highlight />
        </div>

        {/* Logout */}
        <button
          className="btn btn-ghost btn-full"
          onClick={handleLogout}
          style={{ color: 'var(--danger)', borderColor: 'var(--danger)', marginBottom: '12px' }}
        >
          Sign Out
        </button>

        <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--gray-400)' }}>
          {config.appName} v1.0 · {config.collegeName}
        </p>
      </div>

      <BottomNav />
    </div>
  );
}

function ProfileRow({ label, value, highlight }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 0', borderBottom: '1px solid var(--gray-100)',
    }}>
      <span style={{ fontSize: '13px', color: 'var(--gray-500)' }}>{label}</span>
      <span style={{
        fontSize: '14px',
        fontWeight: '700',
        color: highlight ? 'var(--primary)' : 'var(--gray-800)',
      }}>
        {value || '—'}
      </span>
    </div>
  );
}
