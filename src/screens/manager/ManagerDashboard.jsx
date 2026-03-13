import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection, query, where, orderBy, onSnapshot,
  doc, updateDoc, getDocs, Timestamp, addDoc, deleteDoc,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import OrderProgressBar from '../../components/OrderProgressBar';
import { playNewOrderSound, showNotification, requestNotificationPermission } from '../../utils/sounds';

const CATEGORIES   = ['Beverages', 'Ice Creams', 'Indian Food', 'Maharashtrian Special'];
const STATUS_FLOW  = { Placed: 'Preparing', Preparing: 'Ready', Ready: 'Completed' };
const STATUS_LABEL = { Placed: '▶ Start Preparing', Preparing: '✓ Mark Ready', Ready: '✅ Complete' };
const STATUS_PRIORITY = { Placed: 2, Preparing: 1, Ready: 0 };

const NAV_ITEMS = [
  { key: 'Orders',    icon: '📋', label: 'Orders'    },
  { key: 'Menu',      icon: '🍽️', label: 'Menu'      },
  { key: 'Users',     icon: '👥', label: 'Users'     },
  { key: 'Analytics', icon: '📊', label: 'Analytics' },
  { key: 'Export',    icon: '📥', label: 'Export'    },
];

// ─────────────────────────────────────────────────────────────────
// ROOT DASHBOARD
// ─────────────────────────────────────────────────────────────────
export default function ManagerDashboard() {
  const [activeTab, setActiveTab] = useState('Orders');
  const { profile, logout }       = useAuth();
  const navigate                  = useNavigate();

  useEffect(() => {
    requestNotificationPermission();
    const warmUp = () => {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        ctx.resume().then(() => ctx.close());
      } catch {}
    };
    document.addEventListener('click', warmUp, { once: true });
  }, []);

  // Persistent new-order listener — lives at root so it never unmounts
  useEffect(() => {
    const getSessionStart = () => {
      const key    = 'canteenbite_manager_session';
      const stored = sessionStorage.getItem(key);
      if (stored) return parseInt(stored, 10);
      const now = Date.now();
      sessionStorage.setItem(key, String(now));
      return now;
    };
    const sessionStart = getSessionStart();
    let knownIds    = null;
    let isFirstLoad = true;

    const q = query(
      collection(db, 'orders'),
      where('status', '==', 'Placed'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (isFirstLoad) {
        knownIds    = new Set(orders.map(o => o.id));
        isFirstLoad = false;
        return;
      }
      orders.forEach(order => {
        if (!knownIds.has(order.id)) {
          knownIds.add(order.id);
          const createdAt = order.createdAt?.toDate?.()?.getTime?.() || 0;
          if (createdAt >= sessionStart) {
            playNewOrderSound();
            showNotification(
              '🛎️ New Order Received!',
              `Token ${order.token} · ${order.userName} · ₹${order.totalAmount}`,
              `new-order-${order.id}`
            );
          }
        }
      });
    });
    return unsub;
  }, []);

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--gray-100)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1A1A2E 0%, #2D2D44 100%)',
        padding: '14px 16px',
        color: 'white',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '10px', opacity: 0.55, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
              CanteenBite Manager
            </p>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px' }}>
              {NAV_ITEMS.find(n => n.key === activeTab)?.icon} {activeTab}
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', opacity: 0.7 }}>{profile?.name?.split(' ')[0]}</span>
            <button
              onClick={async () => { await logout(); navigate('/login'); }}
              style={{
                background: 'rgba(255,255,255,0.12)', border: 'none',
                color: 'white', padding: '7px 13px', borderRadius: '20px',
                cursor: 'pointer', fontSize: '12px', fontWeight: '700',
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px', paddingBottom: '80px' }}>
        {activeTab === 'Orders'    && <OrdersTab />}
        {activeTab === 'Menu'      && <MenuTab />}
        {activeTab === 'Users'     && <UsersTab />}
        {activeTab === 'Analytics' && <AnalyticsTab />}
        {activeTab === 'Export'    && <ExportTab />}
      </div>

      {/* Bottom nav */}
      <nav style={{
        position: 'fixed', bottom: 0, left: '50%',
        transform: 'translateX(-50%)',
        width: '100%', maxWidth: '480px',
        height: '64px',
        background: 'var(--white)',
        borderTop: '1px solid var(--gray-200)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        padding: '0 4px',
        zIndex: 100,
        boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
      }}>
        {NAV_ITEMS.map(({ key, icon, label }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: '2px',
                padding: '6px 8px', border: 'none',
                background: 'transparent', cursor: 'pointer',
                color: active ? 'var(--primary)' : 'var(--gray-400)',
                minWidth: '52px', position: 'relative',
                transition: 'color 0.2s',
              }}
            >
              <span style={{ fontSize: '20px', lineHeight: 1 }}>{icon}</span>
              <span style={{ fontSize: '10px', fontWeight: active ? '800' : '600', fontFamily: 'var(--font-body)' }}>
                {label}
              </span>
              {active && (
                <span style={{
                  position: 'absolute', bottom: 0,
                  width: '20px', height: '3px',
                  background: 'var(--primary)',
                  borderRadius: '2px 2px 0 0',
                }} />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// ORDERS TAB
// ─────────────────────────────────────────────────────────────────
function OrdersTab() {
  const [orders, setOrders]       = useState([]);
  const [subTab, setSubTab]       = useState('active');
  const [historyFilter, setHistoryFilter] = useState('all');
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    // No orderBy in Firestore queries to avoid needing composite indexes.
    // Sorting is done client-side after fetch.
    let q;
    if (subTab === 'active') {
      q = query(
        collection(db, 'orders'),
        where('status', 'in', ['Placed', 'Preparing', 'Ready'])
      );
    } else {
      q = query(
        collection(db, 'orders'),
        where('status', 'in', ['Completed', 'Cancelled'])
      );
    }
    const unsub = onSnapshot(q, snap => {
      const raw = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort client-side: active = oldest first, history = newest first
      if (subTab === 'active') {
        raw.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
      } else {
        raw.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      }
      setOrders(raw);
      setLoading(false);
    });
    return unsub;
  }, [subTab]);

  const advanceStatus = async (order) => {
    const next = STATUS_FLOW[order.status];
    if (!next) return;
    await updateDoc(doc(db, 'orders', order.id), {
      status: next,
      updatedAt: Timestamp.now(),
    });
  };

  const sortedActive = [...orders].sort(
    (a, b) => (STATUS_PRIORITY[a.status] ?? 9) - (STATUS_PRIORITY[b.status] ?? 9)
  );

  const filteredHistory = historyFilter === 'all'
    ? orders
    : orders.filter(o => o.status === historyFilter);

  const displayOrders = subTab === 'active' ? sortedActive : filteredHistory;

  return (
    <div>
      <div className="tab-bar">
        <button className={`tab-item ${subTab === 'active' ? 'active' : ''}`} onClick={() => setSubTab('active')}>
          Active {subTab === 'active' && orders.length > 0 ? `(${orders.length})` : ''}
        </button>
        <button className={`tab-item ${subTab === 'history' ? 'active' : ''}`} onClick={() => setSubTab('history')}>
          History
        </button>
      </div>

      {subTab === 'history' && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
          {[
            { key: 'all', label: 'All' },
            { key: 'Completed', label: '✅ Completed' },
            { key: 'Cancelled', label: '✕ Cancelled' },
          ].map(f => (
            <button key={f.key} onClick={() => setHistoryFilter(f.key)} style={{
              padding: '5px 14px', borderRadius: 'var(--radius-full)',
              border: `1.5px solid ${historyFilter === f.key ? 'var(--primary)' : 'var(--gray-300)'}`,
              background: historyFilter === f.key ? 'var(--primary-bg)' : 'transparent',
              color: historyFilter === f.key ? 'var(--primary)' : 'var(--gray-500)',
              fontSize: '12px', fontWeight: '700', cursor: 'pointer',
              fontFamily: 'var(--font-body)', transition: 'all 0.2s',
            }}>{f.label}</button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="empty-state"><div className="spinner spinner-dark" /></div>
      ) : displayOrders.length === 0 ? (
        <div className="empty-state">
          <span style={{ fontSize: '40px' }}>📋</span>
          <h3>No {subTab === 'active' ? 'active' : 'past'} orders</h3>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {displayOrders.map(order => (
            <ManagerOrderCard
              key={order.id}
              order={order}
              showActions={subTab === 'active'}
              onAdvance={advanceStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ManagerOrderCard({ order, showActions, onAdvance }) {
  const [expanded, setExpanded] = useState(showActions);

  const fmt = (ts) => {
    if (!ts) return '—';
    const d = ts.toDate?.() || ts;
    return d.toLocaleString('en-IN', {
      day: '2-digit', month: 'short',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const isReady = order.status === 'Ready';

  return (
    <div className="card" style={{
      overflow: 'hidden',
      border: isReady ? '2px solid var(--success)' : undefined,
    }}>
      {isReady && (
        <div style={{
          background: 'var(--success)', color: 'white',
          padding: '5px', textAlign: 'center',
          fontSize: '11px', fontWeight: '800',
        }}>
          🔔 READY FOR PICKUP
        </div>
      )}

      {/* Header row — always visible */}
      <div
        style={{ padding: '12px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', color: 'var(--primary)', fontWeight: '800' }}>
              Token {order.token}
            </span>
            <span className={`badge badge-${order.status?.toLowerCase()}`}>{order.status}</span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--gray-500)', marginBottom: '1px' }}>
            <strong>{order.userName}</strong> · {order.userType}
          </p>
          <p style={{ fontSize: '10px', color: 'var(--gray-400)' }}>
            {order.orderId} · {fmt(order.createdAt)}
          </p>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '8px' }}>
          <p style={{ fontWeight: '800', color: 'var(--primary)', fontSize: '16px' }}>₹{order.totalAmount}</p>
          <span style={{ fontSize: '12px', color: 'var(--gray-400)' }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--gray-200)', padding: '12px 14px' }}>
          {/* Progress bar */}
          <div style={{ marginBottom: '12px' }}>
            <OrderProgressBar status={order.status} />
          </div>

          {/* Items */}
          <div style={{
            background: 'var(--gray-50)', borderRadius: 'var(--radius-md)',
            padding: '10px 12px', marginBottom: '12px',
          }}>
            <p style={{ fontSize: '10px', fontWeight: '700', color: 'var(--gray-400)', marginBottom: '6px' }}>ITEMS</p>
            {order.items?.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span style={{ fontSize: '13px', color: 'var(--gray-700)' }}>{item.name} ×{item.qty}</span>
                <span style={{ fontSize: '13px', fontWeight: '700' }}>₹{item.price * item.qty}</span>
              </div>
            ))}
          </div>

          {/* Action button */}
          {showActions && STATUS_FLOW[order.status] && (
            <button
              className="btn btn-primary btn-full btn-sm"
              onClick={() => onAdvance(order)}
            >
              {STATUS_LABEL[order.status]}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// MENU TAB — edit opens modal
// ─────────────────────────────────────────────────────────────────
function MenuTab() {
  const [items, setItems]       = useState([]);
  const [editModal, setEditModal] = useState(null); // null | 'add' | item object
  const [form, setForm]         = useState({ name: '', category: '', price: '', prepTime: '', imageUrl: '', available: true });
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'menuItems'), orderBy('category')),
      snap => setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return unsub;
  }, []);

  const openAdd = () => {
    setForm({ name: '', category: '', price: '', prepTime: '', imageUrl: '', available: true });
    setError('');
    setEditModal('add');
  };

  const openEdit = (item) => {
    setForm({
      name: item.name, category: item.category,
      price: item.price, prepTime: item.prepTime,
      imageUrl: item.imageUrl || '', available: item.available,
    });
    setError('');
    setEditModal(item);
  };

  const closeModal = () => { setEditModal(null); setError(''); };

  const saveItem = async () => {
    if (!form.name || !form.category || !form.price || !form.prepTime) {
      setError('Please fill all required fields.'); return;
    }
    setLoading(true);
    try {
      const data = {
        name: form.name, category: form.category,
        price: parseFloat(form.price), prepTime: parseInt(form.prepTime),
        imageUrl: form.imageUrl, available: form.available,
      };
      if (editModal === 'add') {
        await addDoc(collection(db, 'menuItems'), { ...data, createdAt: Timestamp.now() });
      } else {
        await updateDoc(doc(db, 'menuItems', editModal.id), data);
      }
      closeModal();
    } catch {
      setError('Failed to save item.');
    } finally {
      setLoading(false);
    }
  };

  const toggleAvail = async (item) => {
    await updateDoc(doc(db, 'menuItems', item.id), { available: !item.available });
  };

  const deleteItem = async (id) => {
    if (!window.confirm('Delete this item?')) return;
    await deleteDoc(doc(db, 'menuItems', id));
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px' }}>
          Menu Items ({items.length})
        </h3>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>+ Add Item</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {items.map(item => (
          <div key={item.id} className="card" style={{
            padding: '12px', display: 'flex', gap: '10px',
            alignItems: 'center', opacity: item.available ? 1 : 0.6,
          }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '10px',
              background: 'var(--primary-bg)', flexShrink: 0,
              overflow: 'hidden', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              {item.imageUrl
                ? <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: '22px' }}>🍽️</span>
              }
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: '700', fontSize: '14px' }}>{item.name}</p>
              <p style={{ fontSize: '12px', color: 'var(--gray-400)' }}>
                ₹{item.price} · {item.prepTime}min · {item.category}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
              <button onClick={() => toggleAvail(item)} style={{
                padding: '5px 8px', borderRadius: '20px', border: 'none',
                cursor: 'pointer', fontSize: '11px', fontWeight: '700',
                background: item.available ? '#EAFAF1' : '#FDEDEC',
                color: item.available ? '#1E8449' : '#C0392B',
              }}>
                {item.available ? '✓ Live' : '✕ OOS'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => openEdit(item)} style={{ padding: '5px 8px' }}>✏️</button>
              <button onClick={() => deleteItem(item.id)} style={{
                padding: '5px 8px', background: '#FDEDEC', color: '#C0392B',
                border: 'none', borderRadius: '20px', cursor: 'pointer', fontSize: '13px',
              }}>🗑</button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit / Add Modal */}
      {editModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          zIndex: 9000, padding: '0',
        }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div style={{
            background: 'var(--white)', width: '100%', maxWidth: '480px',
            borderRadius: '24px 24px 0 0', padding: '24px 20px 32px',
            maxHeight: '90vh', overflowY: 'auto',
            animation: 'slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px' }}>
                {editModal === 'add' ? '+ Add New Item' : '✏️ Edit Item'}
              </h3>
              <button onClick={closeModal} style={{
                background: 'var(--gray-100)', border: 'none', borderRadius: '50%',
                width: '32px', height: '32px', cursor: 'pointer', fontSize: '16px',
              }}>✕</button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="input-group">
              <label className="input-label">Item Name *</label>
              <input type="text" className="input-field" placeholder="e.g. Misal Pav"
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="input-group">
              <label className="input-label">Category *</label>
              <select className="input-field" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                <option value="">Select Category</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="input-group">
                <label className="input-label">Price (₹) *</label>
                <input type="number" className="input-field" placeholder="0"
                  value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
              </div>
              <div className="input-group">
                <label className="input-label">Prep Time (min) *</label>
                <input type="number" className="input-field" placeholder="0"
                  value={form.prepTime} onChange={e => setForm({ ...form, prepTime: e.target.value })} />
              </div>
            </div>
            <div className="input-group">
              <label className="input-label">Image URL (optional)</label>
              <input type="text" className="input-field" placeholder="https://..."
                value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--gray-700)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" checked={form.available} onChange={e => setForm({ ...form, available: e.target.checked })}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                Available (visible to users)
              </label>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveItem} disabled={loading}>
                {loading ? 'Saving...' : editModal === 'add' ? 'Add Item' : 'Save Changes'}
              </button>
              <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0.5; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// USERS TAB
// ─────────────────────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers]         = useState([]);
  const [orderStats, setOrderStats] = useState({}); // userId -> { total, cancelled, lastOrder }
  const [search, setSearch]       = useState('');
  const [rechargeModal, setRechargeModal] = useState(null); // user object
  const [rechargeAmt, setRechargeAmt]     = useState('');
  const [recharging, setRecharging]       = useState(false);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', 'in', ['student', 'staff']));
    const unsub = onSnapshot(q, snap => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  // Load order stats for all users once
  useEffect(() => {
    const loadStats = async () => {
      try {
        const snap = await getDocs(collection(db, 'orders'));
        const stats = {};
        snap.docs.forEach(d => {
          const o = d.data();
          if (!o.userId) return;
          if (!stats[o.userId]) stats[o.userId] = { total: 0, cancelled: 0, lastOrder: null };
          stats[o.userId].total++;
          if (o.status === 'Cancelled') stats[o.userId].cancelled++;
          const ct = o.createdAt?.toDate?.();
          if (ct && (!stats[o.userId].lastOrder || ct > stats[o.userId].lastOrder)) {
            stats[o.userId].lastOrder = ct;
          }
        });
        setOrderStats(stats);
      } catch {}
    };
    loadStats();
  }, []);

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.rollNumber?.toLowerCase().includes(search.toLowerCase()) ||
    u.staffId?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const openRecharge = (u) => { setRechargeModal(u); setRechargeAmt(''); };

  const doRecharge = async () => {
    const amt = parseFloat(rechargeAmt);
    if (!amt || amt <= 0) return;
    setRecharging(true);
    try {
      await updateDoc(doc(db, 'users', rechargeModal.id), {
        walletBalance: (rechargeModal.walletBalance ?? 0) + amt,
      });
      setRechargeModal(null);
    } catch { alert('Recharge failed'); }
    finally { setRecharging(false); }
  };

  const fmtDate = (d) => {
    if (!d) return 'Never';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div>
      <div className="input-group" style={{ marginBottom: '14px' }}>
        <input type="text" className="input-field"
          placeholder="🔍 Search by name, roll no, email..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <p style={{ fontSize: '12px', color: 'var(--gray-400)', marginBottom: '12px' }}>
        {filtered.length} user{filtered.length !== 1 ? 's' : ''}
      </p>

      {loading ? (
        <div className="empty-state"><div className="spinner spinner-dark" /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map(u => {
            const stats = orderStats[u.id] || { total: 0, cancelled: 0, lastOrder: null };
            const completionRate = stats.total > 0
              ? Math.round(((stats.total - stats.cancelled) / stats.total) * 100)
              : 100;

            return (
              <div key={u.id} className="card" style={{ padding: '14px', overflow: 'hidden' }}>
                {/* Top row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                      <span style={{ fontSize: '20px' }}>{u.role === 'student' ? '🎓' : '👨‍💼'}</span>
                      <p style={{ fontWeight: '700', fontSize: '15px' }}>{u.name}</p>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--gray-400)', marginBottom: '1px' }}>{u.email}</p>
                    <p style={{ fontSize: '11px', color: 'var(--gray-400)' }}>
                      {u.role === 'student'
                        ? `${u.rollNumber} · ${u.branch} · ${u.year}`
                        : `Staff ID: ${u.staffId}`}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '10px' }}>
                    <p style={{ fontSize: '10px', color: 'var(--gray-400)', marginBottom: '2px' }}>Wallet</p>
                    <p style={{ fontSize: '20px', fontWeight: '800', color: 'var(--primary)' }}>
                      ₹{u.walletBalance ?? 0}
                    </p>
                  </div>
                </div>

                {/* Stats row */}
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px', marginBottom: '12px',
                }}>
                  {[
                    { label: 'Total Orders', value: stats.total, color: 'var(--info)' },
                    { label: 'Cancelled',    value: stats.cancelled, color: stats.cancelled > 0 ? 'var(--danger)' : 'var(--gray-400)' },
                    { label: 'Completion',   value: `${completionRate}%`, color: completionRate >= 80 ? 'var(--success)' : 'var(--warning)' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{
                      background: 'var(--gray-50)', borderRadius: 'var(--radius-md)',
                      padding: '8px', textAlign: 'center',
                    }}>
                      <p style={{ fontSize: '16px', fontWeight: '800', color }}>{value}</p>
                      <p style={{ fontSize: '10px', color: 'var(--gray-400)', fontWeight: '600' }}>{label}</p>
                    </div>
                  ))}
                </div>

                <p style={{ fontSize: '11px', color: 'var(--gray-400)', marginBottom: '10px' }}>
                  Last order: {fmtDate(stats.lastOrder)}
                </p>

                {/* Recharge button */}
                <button
                  className="btn btn-primary btn-sm btn-full"
                  onClick={() => openRecharge(u)}
                >
                  + Recharge Wallet
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Recharge modal */}
      {rechargeModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9000, padding: '24px',
        }}
          onClick={(e) => { if (e.target === e.currentTarget) setRechargeModal(null); }}
        >
          <div className="card" style={{ padding: '24px', width: '100%', maxWidth: '360px', animation: 'fadeIn 0.3s ease' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', marginBottom: '4px' }}>
              Recharge Wallet
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--gray-500)', marginBottom: '16px' }}>
              {rechargeModal.name} · Current balance: ₹{rechargeModal.walletBalance ?? 0}
            </p>
            <div className="input-group">
              <label className="input-label">Amount to Add (₹)</label>
              <input type="number" className="input-field" placeholder="e.g. 200"
                value={rechargeAmt} onChange={e => setRechargeAmt(e.target.value)}
                autoFocus />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={doRecharge} disabled={recharging}>
                {recharging ? 'Processing...' : '+ Add Money'}
              </button>
              <button className="btn btn-ghost" onClick={() => setRechargeModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// ANALYTICS TAB
// ─────────────────────────────────────────────────────────────────
function AnalyticsTab() {
  const [mode, setMode]       = useState('today'); // today | monthly | custom
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const [customStart, setCustomStart] = useState(today.toISOString().slice(0, 10));
  const [customEnd,   setCustomEnd]   = useState(today.toISOString().slice(0, 10));
  const [selectedMonth, setSelectedMonth] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  );

  useEffect(() => {
    setLoading(true);
    let start, end;

    if (mode === 'today') {
      start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      end   = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    } else if (mode === 'monthly') {
      const [yr, mo] = selectedMonth.split('-').map(Number);
      start = new Date(yr, mo - 1, 1);
      end   = new Date(yr, mo, 0, 23, 59, 59);
    } else {
      start = new Date(customStart + 'T00:00:00');
      end   = new Date(customEnd   + 'T23:59:59');
    }

    const q = query(
      collection(db, 'orders'),
      where('createdAt', '>=', Timestamp.fromDate(start)),
      where('createdAt', '<=', Timestamp.fromDate(end))
    );

    const unsub = onSnapshot(q, snap => {
      const orders    = snap.docs.map(d => d.data());
      const completed = orders.filter(o => o.status === 'Completed');
      const cancelled = orders.filter(o => o.status === 'Cancelled');
      const revenue   = completed.reduce((s, o) => s + (o.totalAmount || 0), 0);

      const itemCount = {};
      orders.forEach(o => o.items?.forEach(i => {
        itemCount[i.name] = (itemCount[i.name] || 0) + i.qty;
      }));
      const topItem = Object.entries(itemCount).sort((a, b) => b[1] - a[1])[0];

      const catRevenue = {};
      completed.forEach(o => o.items?.forEach(i => {
        catRevenue[i.category || 'Other'] = (catRevenue[i.category || 'Other'] || 0) + (i.price * i.qty);
      }));

      setStats({
        total: orders.length,
        completed: completed.length,
        cancelled: cancelled.length,
        revenue,
        topItem: topItem ? `${topItem[0]} (${topItem[1]}×)` : 'None',
        catRevenue,
      });
      setLoading(false);
    });
    return unsub;
  }, [mode, selectedMonth, customStart, customEnd]);

  const cards = [
    { label: 'Total Orders',    value: stats?.total     ?? '—', icon: '📋', color: 'var(--info)' },
    { label: 'Completed',       value: stats?.completed ?? '—', icon: '✅', color: 'var(--success)' },
    { label: 'Cancelled',       value: stats?.cancelled ?? '—', icon: '✕', color: 'var(--danger)' },
    { label: 'Revenue (₹)',     value: stats ? `₹${stats.revenue}` : '—', icon: '💰', color: 'var(--primary)' },
    { label: 'Top Item',        value: stats?.topItem   ?? '—', icon: '🏆', color: 'var(--accent)' },
  ];

  return (
    <div>
      {/* Mode selector */}
      <div className="tab-bar" style={{ marginBottom: '16px' }}>
        {[
          { key: 'today',   label: 'Today'   },
          { key: 'monthly', label: 'Monthly' },
          { key: 'custom',  label: 'Custom'  },
        ].map(m => (
          <button key={m.key} className={`tab-item ${mode === m.key ? 'active' : ''}`} onClick={() => setMode(m.key)}>
            {m.label}
          </button>
        ))}
      </div>

      {/* Date controls */}
      {mode === 'monthly' && (
        <div className="input-group" style={{ marginBottom: '16px' }}>
          <label className="input-label">Select Month</label>
          <input type="month" className="input-field"
            value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
            max={`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`} />
        </div>
      )}
      {mode === 'custom' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">Start Date</label>
            <input type="date" className="input-field"
              value={customStart} onChange={e => setCustomStart(e.target.value)}
              max={today.toISOString().slice(0, 10)} />
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">End Date</label>
            <input type="date" className="input-field"
              value={customEnd} onChange={e => setCustomEnd(e.target.value)}
              max={today.toISOString().slice(0, 10)} />
          </div>
        </div>
      )}

      {loading ? (
        <div className="empty-state"><div className="spinner spinner-dark" /></div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
            {cards.map(({ label, value, icon, color }) => (
              <div key={label} className="card" style={{ padding: '14px', textAlign: 'center' }}>
                <span style={{ fontSize: '24px' }}>{icon}</span>
                <p style={{ fontWeight: '800', fontSize: '18px', color, margin: '6px 0 4px', wordBreak: 'break-word' }}>{value}</p>
                <p style={{ fontSize: '11px', color: 'var(--gray-400)', fontWeight: '700' }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Category breakdown */}
          {Object.keys(stats?.catRevenue || {}).length > 0 && (
            <div className="card" style={{ padding: '16px' }}>
              <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '15px', marginBottom: '12px' }}>
                💰 Revenue by Category
              </h4>
              {Object.entries(stats.catRevenue)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, rev]) => (
                  <div key={cat} style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '700' }}>{cat}</span>
                      <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--primary)' }}>₹{rev}</span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--gray-200)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.round((rev / Math.max(...Object.values(stats.catRevenue))) * 100)}%`,
                        background: 'var(--primary)', borderRadius: '3px',
                        transition: 'width 0.6s ease',
                      }} />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// EXPORT TAB — CSV + XLSX
// ─────────────────────────────────────────────────────────────────
function ExportTab() {
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(today);
  const [endDate,   setEndDate]   = useState(today);
  const [loading,   setLoading]   = useState(false);
  const [format,    setFormat]    = useState('csv');

  const fetchOrders = async () => {
    const start = new Date(startDate + 'T00:00:00');
    const end   = new Date(endDate   + 'T23:59:59');
    const q = query(
      collection(db, 'orders'),
      where('createdAt', '>=', Timestamp.fromDate(start)),
      where('createdAt', '<=', Timestamp.fromDate(end)),
      orderBy('createdAt', 'asc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const o = d.data();
      return {
        OrderID:     o.orderId || '',
        Token:       o.token || '',
        UserName:    o.userName || '',
        UserType:    o.userType || '',
        Items:       o.items?.map(i => `${i.name} x${i.qty}`).join('; ') || '',
        TotalAmount: o.totalAmount || 0,
        Status:      o.status || '',
        DateTime:    o.createdAt?.toDate()?.toLocaleString('en-IN') || '',
      };
    });
  };

  const exportCSV = async () => {
    setLoading(true);
    try {
      const rows  = await fetchOrders();
      const headers = Object.keys(rows[0] || {});
      const csv = [
        headers.join(','),
        ...rows.map(r => headers.map(h => `"${String(r[h]).replace(/"/g, '""')}"`).join(',')),
      ].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `canteenbite_${startDate}_${endDate}.csv`;
      a.click(); URL.revokeObjectURL(url);
    } catch (e) {
      alert('Export failed: ' + e.message);
    } finally { setLoading(false); }
  };

  const exportXLSX = async () => {
    setLoading(true);
    try {
      const rows = await fetchOrders();
      if (rows.length === 0) { alert('No orders found for this date range.'); setLoading(false); return; }

      const headers = Object.keys(rows[0]);

      // Use HTML table format — Excel opens this natively and correctly.
      // No ZIP/binary required, no library needed, zero compatibility issues.
      const esc = (v) => String(v)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

      const headerCells = headers.map(h => `<th style="background:#E8590C;color:white;padding:6px 10px;border:1px solid #ccc;">${esc(h)}</th>`).join('');
      const dataRows = rows.map((r, i) => {
        const bg = i % 2 === 0 ? '#ffffff' : '#fff5f0';
        const cells = headers.map(h => `<td style="padding:5px 10px;border:1px solid #eee;background:${bg};">${esc(r[h])}</td>`).join('');
        return `<tr>${cells}</tr>`;
      }).join('');

      const html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office"
              xmlns:x="urn:schemas-microsoft-com:office:excel"
              xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="UTF-8">
          <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets>
            <x:ExcelWorksheet><x:Name>Orders</x:Name>
            <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
            </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
        </head>
        <body>
          <table border="1" cellspacing="0" cellpadding="0"
                 style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:13px;">
            <thead><tr>${headerCells}</tr></thead>
            <tbody>${dataRows}</tbody>
          </table>
        </body></html>`;

      const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `canteenbite_${startDate}_${endDate}.xlsx`;
      a.click(); URL.revokeObjectURL(url);

    } catch (e) {
      alert('XLSX export failed: ' + e.message);
    } finally { setLoading(false); }
  };

  return (
    <div>
      <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', marginBottom: '16px' }}>
        Export Order Data
      </h3>

      <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
        {/* Date range */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">Start Date</label>
            <input type="date" className="input-field"
              value={startDate} onChange={e => setStartDate(e.target.value)} max={today} />
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">End Date</label>
            <input type="date" className="input-field"
              value={endDate} onChange={e => setEndDate(e.target.value)} max={today} />
          </div>
        </div>

        {/* Format selector */}
        <div className="tab-bar" style={{ marginBottom: '16px' }}>
          <button className={`tab-item ${format === 'csv' ? 'active' : ''}`} onClick={() => setFormat('csv')}>
            📄 CSV
          </button>
          <button className={`tab-item ${format === 'xlsx' ? 'active' : ''}`} onClick={() => setFormat('xlsx')}>
            📊 Excel (XLSX)
          </button>
        </div>

        <button
          className="btn btn-primary btn-full"
          onClick={format === 'csv' ? exportCSV : exportXLSX}
          disabled={loading}
        >
          {loading ? 'Exporting...' : `📥 Download ${format.toUpperCase()}`}
        </button>
      </div>

      {/* Column info */}
      <div className="card" style={{ padding: '16px' }}>
        <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--gray-500)', marginBottom: '8px' }}>
          EXPORTED COLUMNS
        </p>
        <p style={{ fontSize: '12px', color: 'var(--gray-600)', lineHeight: 1.8 }}>
          OrderID · Token · UserName · UserType · Items · TotalAmount · Status · DateTime
        </p>
      </div>
    </div>
  );
}
