import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';

const NAV_ITEMS = [
  {
    path: '/menu',
    label: 'Menu',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" width="22" height="22">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    path: '/orders',
    label: 'Orders',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" width="22" height="22">
        <path d="M16 11c0 2.21-1.79 4-4 4s-4-1.79-4-4 1.79-4 4-4 4 1.79 4 4zM12 3a9 9 0 100 18A9 9 0 0012 3z" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    path: '/cart',
    label: 'Cart',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" width="22" height="22">
        <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    path: '/wallet',
    label: 'Wallet',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" width="22" height="22">
        <path d="M3 10h18M7 15h.01M11 15h2M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    path: '/profile',
    label: 'Profile',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" width="22" height="22">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { totalItems } = useCart();

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100%',
      maxWidth: '480px',
      height: 'var(--bottom-nav-height)',
      background: 'var(--white)',
      borderTop: '1px solid var(--gray-200)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      padding: '0 8px',
      zIndex: 100,
      boxShadow: '0 -4px 20px rgba(0,0,0,0.06)',
    }}>
      {NAV_ITEMS.map(({ path, label, icon }) => {
        const active = location.pathname === path;
        const isCart = path === '/cart';
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '3px',
              padding: '8px 12px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: active ? 'var(--primary)' : 'var(--gray-400)',
              transition: 'color 0.2s',
              position: 'relative',
              minWidth: '52px',
            }}
          >
            {isCart && totalItems > 0 && (
              <span style={{
                position: 'absolute',
                top: '4px',
                right: '8px',
                background: 'var(--primary)',
                color: 'white',
                fontSize: '10px',
                fontWeight: '800',
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
              }}>
                {totalItems > 9 ? '9+' : totalItems}
              </span>
            )}
            {icon(active)}
            <span style={{
              fontSize: '10px',
              fontWeight: active ? '800' : '600',
              fontFamily: 'var(--font-body)',
            }}>
              {label}
            </span>
            {active && (
              <span style={{
                position: 'absolute',
                bottom: '0px',
                width: '20px',
                height: '3px',
                background: 'var(--primary)',
                borderRadius: '2px 2px 0 0',
              }} />
            )}
          </button>
        );
      })}
    </nav>
  );
}
