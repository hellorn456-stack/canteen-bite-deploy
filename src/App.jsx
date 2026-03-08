import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProviderWrapper } from './contexts/CartContext';
import { ToastProvider } from './contexts/ToastContext';
import './styles/global.css';

// Auth screens
import LoginScreen    from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';

// Student / Staff screens
import MenuScreen    from './screens/student/MenuScreen';
import CartScreen    from './screens/student/CartScreen';
import OrdersScreen  from './screens/student/OrdersScreen';
import WalletScreen  from './screens/student/WalletScreen';
import ProfileScreen from './screens/student/ProfileScreen';

// Manager
import ManagerDashboard from './screens/manager/ManagerDashboard';

// Permission modal
import PermissionModal from './components/PermissionModal';

// ─── Route Guards ──────────────────────────────────────────
function PrivateRoute({ children, managerOnly = false }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user)   return <Navigate to="/login" replace />;
  // If user is logged in but profile not yet in Firestore
  // (e.g. new Google user who hasn't completed registration yet)
  // redirect them to complete their profile
  if (!profile) return <Navigate to="/register?google=1" replace />;
  if (managerOnly && profile?.role !== 'manager') return <Navigate to="/menu" replace />;
  if (!managerOnly && profile?.role === 'manager') return <Navigate to="/manager" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to={profile?.role === 'manager' ? '/manager' : '/menu'} replace />;
  return children;
}

function LoadingScreen() {
  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
    }}>
      <div style={{
        width: '60px', height: '60px', borderRadius: '16px',
        background: 'rgba(255,255,255,0.2)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: '20px',
      }}>
        <span style={{ fontSize: '32px' }}>🍽️</span>
      </div>
      <div style={{
        width: '36px', height: '36px',
        border: '3px solid rgba(255,255,255,0.3)',
        borderTopColor: 'white', borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Cart wrapper that re-mounts when user changes ─────────
// Using user.uid as the key means React fully resets the cart
// when a different user logs in — no cart bleeding between accounts
function CartWrapper({ children }) {
  const { user, profile } = useAuth();
  return (
    <CartProviderWrapper key={user?.uid ?? 'guest'} userId={user?.uid ?? null}>
      {/* Show permission modal for ALL logged-in users including manager */}
      {user && <PermissionModal />}
      {children}
    </CartProviderWrapper>
  );
}

// ─── App Routes ────────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      <Route path="/login"    element={<PublicRoute><LoginScreen /></PublicRoute>} />
      {/* /register is NOT wrapped in PublicRoute because Google sign-in users
          need to access it WHILE already authenticated to complete their profile */}
      <Route path="/register" element={<RegisterScreen />} />

      <Route path="/menu"    element={<PrivateRoute><MenuScreen /></PrivateRoute>} />
      <Route path="/cart"    element={<PrivateRoute><CartScreen /></PrivateRoute>} />
      <Route path="/orders"  element={<PrivateRoute><OrdersScreen /></PrivateRoute>} />
      <Route path="/wallet"  element={<PrivateRoute><WalletScreen /></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><ProfileScreen /></PrivateRoute>} />

      <Route path="/manager" element={<PrivateRoute managerOnly><ManagerDashboard /></PrivateRoute>} />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <CartWrapper>
            <AppRoutes />
          </CartWrapper>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
