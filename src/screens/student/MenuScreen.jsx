import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import BottomNav from '../../components/BottomNav';

const CATEGORIES = ['All', 'Beverages', 'Ice Creams', 'Indian Food', 'Maharashtrian Special'];

const CATEGORY_EMOJI = {
  'Beverages': '☕',
  'Ice Creams': '🍦',
  'Indian Food': '🍛',
  'Maharashtrian Special': '🌶️',
};

export default function MenuScreen() {
  const [menuItems, setMenuItems]     = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading]         = useState(true);
  const { addItem, removeItem, getItemQty } = useCart();
  const { profile }                   = useAuth();

  // Real-time listener for menu items
  useEffect(() => {
    const q = query(collection(db, 'menuItems'), orderBy('category'));
    const unsub = onSnapshot(q, (snap) => {
      setMenuItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const filtered = activeCategory === 'All'
    ? menuItems
    : menuItems.filter(i => i.category === activeCategory);

  const grouped = activeCategory === 'All'
    ? CATEGORIES.slice(1).reduce((acc, cat) => {
        const items = menuItems.filter(i => i.category === cat);
        if (items.length > 0) acc[cat] = items;
        return acc;
      }, {})
    : { [activeCategory]: filtered };

  return (
    <div className="screen">
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
        padding: '20px 16px 16px',
      }}>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', marginBottom: '2px' }}>
          Welcome back, {profile?.name?.split(' ')[0] || 'there'} 👋
        </p>
        <h1 style={{ color: 'white', fontSize: '22px', fontFamily: 'var(--font-heading)' }}>
          What are you craving?
        </h1>

        {/* Category chips */}
        <div style={{
          display: 'flex', gap: '8px', marginTop: '14px',
          overflowX: 'auto', paddingBottom: '4px',
          scrollbarWidth: 'none',
        }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '700',
                fontFamily: 'var(--font-body)',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
                background: activeCategory === cat ? 'white' : 'rgba(255,255,255,0.2)',
                color: activeCategory === cat ? 'var(--primary)' : 'white',
              }}
            >
              {cat === 'All' ? '✨ All' : `${CATEGORY_EMOJI[cat]} ${cat}`}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="screen-body" style={{ paddingTop: '12px' }}>
        {loading ? (
          <div className="empty-state">
            <div className="spinner spinner-dark" />
          </div>
        ) : menuItems.length === 0 ? (
          <div className="empty-state">
            <span style={{ fontSize: '48px' }}>🍽️</span>
            <h3>Menu Coming Soon</h3>
            <p>The canteen manager hasn't added items yet.</p>
          </div>
        ) : (
          Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} style={{ marginBottom: '24px' }}>
              {/* Category header */}
              <div className="section-title">
                <span>{CATEGORY_EMOJI[cat]}</span>
                {cat}
                <span style={{ fontSize: '12px', color: 'var(--gray-400)', fontWeight: '400', marginLeft: 'auto' }}>
                  {items.length} items
                </span>
              </div>

              {/* Items grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {items.map(item => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    qty={getItemQty(item.id)}
                    onAdd={() => addItem({
                      itemId: item.id,
                      name: item.name,
                      price: item.price,
                      prepTime: item.prepTime,
                      imageUrl: item.imageUrl,
                    })}
                    onRemove={() => removeItem(item.id)}
                  />
                ))}
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
      opacity: available ? 1 : 0.6,
    }}>
      {/* Item image */}
      <div style={{
        width: '72px', height: '72px',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        background: 'var(--primary-bg)',
        flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ) : (
          <span style={{ fontSize: '28px' }}>
            {CATEGORY_EMOJI[category] || '🍽️'}
          </span>
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
        <p style={{ color: 'var(--primary)', fontWeight: '800', fontSize: '16px', margin: '2px 0 4px' }}>
          ₹{price}
        </p>
        <p style={{ color: 'var(--gray-400)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}>
          ⏱ {prepTime} min prep
        </p>
      </div>

      {/* Add/Remove controls */}
      {available && (
        <div style={{ flexShrink: 0 }}>
          {qty === 0 ? (
            <button
              onClick={onAdd}
              className="btn btn-primary btn-sm"
              style={{ borderRadius: 'var(--radius-md)', padding: '8px 16px' }}
            >
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
