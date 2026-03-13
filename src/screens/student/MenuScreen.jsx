import { useState, useEffect, useRef, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import BottomNav from '../../components/BottomNav';

const CATEGORIES = ['Beverages', 'Ice Creams', 'Indian Food', 'Maharashtrian Special'];

const CATEGORY_EMOJI = {
  'Beverages':              '☕',
  'Ice Creams':             '🍦',
  'Indian Food':            '🍛',
  'Maharashtrian Special':  '🌶️',
};

// Fisher-Yates shuffle — creates a new randomized array without mutating original
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function MenuScreen() {
  const [menuItems, setMenuItems] = useState([]);
  const [mode, setMode]           = useState('all'); // 'all' | 'categorized'
  const [loading, setLoading]     = useState(true);
  const { addItem, removeItem, getItemQty } = useCart();
  const { profile } = useAuth();

  // Shuffle order is fixed per page-load (not per re-render)
  // Stored in a ref so it survives re-renders but resets on each page load/refresh
  const shuffleOrder = useRef(null);

  useEffect(() => {
    const q = query(collection(db, 'menuItems'), orderBy('category'));
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Generate shuffle order once per mount (= once per page load)
      if (!shuffleOrder.current) {
        shuffleOrder.current = shuffle(items.map(i => i.id));
      }
      setMenuItems(items);
      setLoading(false);
    });
    return unsub;
  }, []);

  // ALL mode: items in random order (fixed for this page load)
  const allItems = useMemo(() => {
    if (!shuffleOrder.current) return menuItems;
    const orderMap = {};
    shuffleOrder.current.forEach((id, idx) => { orderMap[id] = idx; });
    return [...menuItems].sort((a, b) => {
      const ai = orderMap[a.id] ?? 9999;
      const bi = orderMap[b.id] ?? 9999;
      return ai - bi;
    });
  }, [menuItems]);

  // CATEGORIZED mode: grouped by category, preserving category order
  const grouped = useMemo(() => {
    return CATEGORIES.reduce((acc, cat) => {
      const items = menuItems.filter(i => i.category === cat);
      if (items.length > 0) acc[cat] = items;
      return acc;
    }, {});
  }, [menuItems]);

  const renderItem = (item) => (
    <MenuItemCard
      key={item.id}
      item={item}
      qty={getItemQty(item.id)}
      onAdd={() => addItem({ itemId: item.id, name: item.name, price: item.price, prepTime: item.prepTime, imageUrl: item.imageUrl, category: item.category })}
      onRemove={() => removeItem(item.id)}
    />
  );

  return (
    <div className="screen">
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
        padding: '20px 16px 16px',
        flexShrink: 0,
      }}>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', marginBottom: '2px' }}>
          Welcome back, {profile?.name?.split(' ')[0] || 'there'} 👋
        </p>
        <h1 style={{ color: 'white', fontSize: '22px', fontFamily: 'var(--font-heading)' }}>
          What are you craving?
        </h1>

        {/* Mode toggle */}
        <div style={{
          display: 'flex',
          background: 'rgba(255,255,255,0.15)',
          borderRadius: 'var(--radius-full)',
          padding: '3px',
          marginTop: '14px',
          width: 'fit-content',
        }}>
          {[
            { key: 'all',         label: '✨ All Items' },
            { key: 'categorized', label: '📂 Categories' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              style={{
                padding: '7px 18px',
                borderRadius: 'var(--radius-full)',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '800',
                fontFamily: 'var(--font-body)',
                transition: 'all 0.2s',
                background: mode === key ? 'white' : 'transparent',
                color: mode === key ? 'var(--primary)' : 'rgba(255,255,255,0.9)',
                boxShadow: mode === key ? 'var(--shadow-sm)' : 'none',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="screen-body" style={{ paddingTop: '12px' }}>
        {loading ? (
          <div className="empty-state"><div className="spinner spinner-dark" /></div>
        ) : menuItems.length === 0 ? (
          <div className="empty-state">
            <span style={{ fontSize: '48px' }}>🍽️</span>
            <h3>Menu Coming Soon</h3>
            <p>The canteen manager hasn't added items yet.</p>
          </div>
        ) : mode === 'all' ? (
          /* ── ALL MODE: flat randomized list ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p style={{ fontSize: '12px', color: 'var(--gray-400)', textAlign: 'center', marginBottom: '2px' }}>
              {allItems.length} items · refreshed order
            </p>
            {allItems.map(renderItem)}
          </div>
        ) : (
          /* ── CATEGORIZED MODE: sticky category headers ── */
          Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} style={{ marginBottom: '8px' }}>
              {/* Sticky category header */}
              <div style={{
                position: 'sticky',
                top: 0,
                zIndex: 10,
                background: 'var(--white)',
                padding: '10px 0 8px',
                borderBottom: '2px solid var(--primary-bg)',
                marginBottom: '10px',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <span style={{
                    background: 'var(--primary-bg)',
                    borderRadius: 'var(--radius-md)',
                    padding: '6px 10px',
                    fontSize: '18px',
                  }}>
                    {CATEGORY_EMOJI[cat]}
                  </span>
                  <div>
                    <h3 style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: '16px',
                      color: 'var(--gray-800)',
                      lineHeight: 1.1,
                    }}>
                      {cat}
                    </h3>
                    <p style={{ fontSize: '11px', color: 'var(--gray-400)' }}>
                      {items.length} item{items.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                {items.map(renderItem)}
              </div>
            </div>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
}

function MenuItemCard({ item, qty, onAdd, onRemove }) {
  const { available, name, price, prepTime, imageUrl, category } = item;

  return (
    <div className="card" style={{
      padding: '12px',
      display: 'flex',
      gap: '12px',
      alignItems: 'center',
      opacity: available ? 1 : 0.55,
    }}>
      {/* Image */}
      <div style={{
        width: '72px', height: '72px',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        background: 'var(--primary-bg)',
        flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {imageUrl ? (
          <img src={imageUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => { e.target.style.display = 'none'; }} />
        ) : (
          <span style={{ fontSize: '28px' }}>{CATEGORY_EMOJI[category] || '🍽️'}</span>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '4px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', lineHeight: 1.3 }}>{name}</h3>
          {!available && (
            <span className="badge badge-cancelled" style={{ flexShrink: 0, fontSize: '9px' }}>Out of Stock</span>
          )}
        </div>
        <p style={{ color: 'var(--primary)', fontWeight: '800', fontSize: '16px', margin: '2px 0 4px' }}>₹{price}</p>
        <p style={{ color: 'var(--gray-400)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}>
          ⏱ {prepTime} min prep
        </p>
      </div>

      {/* Controls */}
      {available && (
        <div style={{ flexShrink: 0 }}>
          {qty === 0 ? (
            <button onClick={onAdd} className="btn btn-primary btn-sm"
              style={{ borderRadius: 'var(--radius-md)', padding: '8px 16px' }}>
              ADD
            </button>
          ) : (
            <div className="qty-counter">
              <button className="qty-btn" onClick={onRemove}>−</button>
              <span className="qty-count">{qty}</span>
              <button className="qty-btn" onClick={onAdd}>+</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
