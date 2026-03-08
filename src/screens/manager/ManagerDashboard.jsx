import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection, query, where, orderBy, onSnapshot,
  doc, updateDoc, getDocs, Timestamp, addDoc, deleteDoc, getDoc
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import OrderProgressBar from '../../components/OrderProgressBar';
import {
  playNewOrderSound,
  showNotification,
  requestNotificationPermission,
} from '../../utils/sounds';

const TABS = ['Orders', 'Menu', 'Wallets', 'Analytics', 'Export'];
const CATEGORIES = ['Beverages', 'Ice Creams', 'Indian Food', 'Maharashtrian Special'];
const STATUS_FLOW = { Placed: 'Preparing', Preparing: 'Ready', Ready: 'Completed' };

export default function ManagerDashboard() {
  const [activeTab, setActiveTab] = useState('Orders');
  const { profile, logout } = useAuth();
  const navigate = useNavigate();

  // Request notification permission when manager opens dashboard
  useEffect(() => {
    requestNotificationPermission();
    const warmUp = () => {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        ctx.resume().then(() => ctx.close());
      } catch {}
      document.removeEventListener('click', warmUp);
    };
    document.addEventListener('click', warmUp, { once: true });
  }, []);

  // ── PERSISTENT new-order listener ─────────────────────────
  // Lives in the ROOT component so it NEVER unmounts regardless
  // of which tab the manager is viewing (Orders, Menu, Wallets…)
  useEffect(() => {
    const getSessionStartTime = () => {
      const key    = 'canteenbite_manager_session';
      const stored = sessionStorage.getItem(key);
      if (stored) return parseInt(stored, 10);
      const now = Date.now();
      sessionStorage.setItem(key, String(now));
      return now;
    };

    const sessionStart = getSessionStartTime();
    let   knownIds     = null; // null = first snapshot
    let   isFirstLoad  = true;

    const q = query(
      collection(db, 'orders'),
      where('status', '==', 'Placed'),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const placedOrders = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      if (isFirstLoad) {
        // First snapshot — just record existing IDs, no sound
        knownIds     = new Set(placedOrders.map(o => o.id));
        isFirstLoad  = false;
        return;
      }

      // Check for brand new orders not seen before
      placedOrders.forEach(order => {
        if (!knownIds.has(order.id)) {
          knownIds.add(order.id);
          const createdAt = order.createdAt?.toDate?.()?.getTime?.() || 0;
          // Only notify for orders placed after this session started
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
  }, []); // runs once on mount, never re-runs

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gray-50)' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, var(--secondary) 0%, #2D2D44 100%)',
        padding: '16px',
        color: 'white',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '11px', opacity: 0.6, letterSpacing: '1px', textTransform: 'uppercase' }}>Canteen Manager</p>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px' }}>CanteenBite Admin</h1>
          </div>
          <button
            onClick={handleLogout}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '8px 14px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px' }}
          >
            Sign Out
          </button>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: '4px', marginTop: '16px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '7px 14px',
                borderRadius: '20px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '700',
                fontFamily: 'var(--font-body)',
                whiteSpace: 'nowrap',
                background: activeTab === tab ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                color: 'white',
                transition: 'all 0.2s',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: '32px' }}>
        {activeTab === 'Orders'    && <OrdersTab />}
        {activeTab === 'Menu'      && <MenuTab />}
        {activeTab === 'Wallets'   && <WalletsTab />}
        {activeTab === 'Analytics' && <AnalyticsTab />}
        {activeTab === 'Export'    && <ExportTab />}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// ORDERS TAB
// ─────────────────────────────────────────────────────────────────
function OrdersTab() {
  const [orders, setOrders]   = useState([]);
  const [filter, setFilter]   = useState('active');
  const [loading, setLoading] = useState(true);

  // Sound/notification for new orders is handled by the persistent
  // listener in the root ManagerDashboard component — so it fires
  // regardless of which tab or filter the manager is currently on.

  useEffect(() => {
    const statuses = filter === 'active' ? ['Placed', 'Preparing', 'Ready'] : ['Completed', 'Cancelled'];
    const q = query(
      collection(db, 'orders'),
      where('status', 'in', statuses),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, snap => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [filter]);

  const advanceStatus = async (order) => {
    const next = STATUS_FLOW[order.status];
    if (!next) return;
    // updatedAt lets the student app know exactly when status changed
    // so it can ignore stale notifications that pile up while app was closed
    await updateDoc(doc(db, 'orders', order.id), {
      status: next,
      updatedAt: Timestamp.now(),
    });
  };

  const STATUS_LABEL = { Placed: '▶ Start Preparing', Preparing: '✓ Mark Ready', Ready: '✅ Complete' };

  return (
    <div>
      <div className="tab-bar">
        <button className={`tab-item ${filter === 'active' ? 'active' : ''}`} onClick={() => setFilter('active')}>
          Active Orders
        </button>
        <button className={`tab-item ${filter === 'history' ? 'active' : ''}`} onClick={() => setFilter('history')}>
          History
        </button>
      </div>

      {loading ? (
        <div className="empty-state"><div className="spinner spinner-dark" /></div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <span style={{ fontSize: '40px' }}>📋</span>
          <h3>No {filter === 'active' ? 'active' : 'past'} orders</h3>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {orders.map(order => (
            <div key={order.id} className="card" style={{ padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-heading)', fontSize: '22px', color: 'var(--primary)' }}>
                      Token {order.token}
                    </span>
                    <span className={`badge badge-${order.status.toLowerCase()}`}>{order.status}</span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--gray-400)' }}>{order.userName} · {order.userType}</p>
                </div>
                <span style={{ fontWeight: '800', color: 'var(--primary)', fontSize: '16px' }}>₹{order.totalAmount}</span>
              </div>

              <OrderProgressBar status={order.status} />

              {/* Items */}
              <div style={{ margin: '10px 0', padding: '10px', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)' }}>
                {order.items?.map((item, i) => (
                  <span key={i} style={{ fontSize: '13px', color: 'var(--gray-700)' }}>
                    {item.name} ×{item.qty}{i < order.items.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </div>

              {STATUS_FLOW[order.status] && (
                <button
                  className="btn btn-primary btn-full btn-sm"
                  onClick={() => advanceStatus(order)}
                >
                  {STATUS_LABEL[order.status]}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// MENU TAB
// ─────────────────────────────────────────────────────────────────
function MenuTab() {
  const [items, setItems]     = useState([]);
  const [form, setForm]       = useState({ name: '', category: '', price: '', prepTime: '', imageUrl: '', available: true });
  const [editId, setEditId]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'menuItems'), snap => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  const resetForm = () => {
    setForm({ name: '', category: '', price: '', prepTime: '', imageUrl: '', available: true });
    setEditId(null);
    setShowForm(false);
    setError('');
  };

  const startEdit = (item) => {
    setForm({ name: item.name, category: item.category, price: item.price, prepTime: item.prepTime, imageUrl: item.imageUrl || '', available: item.available });
    setEditId(item.id);
    setShowForm(true);
  };

  const saveItem = async () => {
    setError('');
    if (!form.name || !form.category || !form.price || !form.prepTime) {
      setError('Please fill all required fields.');
      return;
    }
    setLoading(true);
    try {
      const data = {
        name: form.name,
        category: form.category,
        price: parseFloat(form.price),
        prepTime: parseInt(form.prepTime),
        imageUrl: form.imageUrl,
        available: form.available,
      };
      if (editId) {
        await updateDoc(doc(db, 'menuItems', editId), data);
      } else {
        await addDoc(collection(db, 'menuItems'), { ...data, createdAt: Timestamp.now() });
      }
      resetForm();
    } catch (e) {
      setError('Failed to save item.');
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailability = async (item) => {
    await updateDoc(doc(db, 'menuItems', item.id), { available: !item.available });
  };

  const deleteItem = async (id) => {
    if (!window.confirm('Delete this item?')) return;
    await deleteDoc(doc(db, 'menuItems', id));
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px' }}>Menu Items ({items.length})</h3>
        <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setShowForm(true); }}>
          + Add Item
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card" style={{ padding: '16px', marginBottom: '16px', border: '2px solid var(--primary)' }}>
          <h4 style={{ marginBottom: '12px' }}>{editId ? 'Edit Item' : 'Add New Item'}</h4>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="input-group">
            <label className="input-label">Item Name *</label>
            <input type="text" className="input-field" placeholder="e.g. Misal Pav" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          </div>
          <div className="input-group">
            <label className="input-label">Category *</label>
            <select className="input-field" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
              <option value="">Select Category</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="input-group">
              <label className="input-label">Price (₹) *</label>
              <input type="number" className="input-field" placeholder="0" value={form.price} onChange={e => setForm({...form, price: e.target.value})} />
            </div>
            <div className="input-group">
              <label className="input-label">Prep Time (min) *</label>
              <input type="number" className="input-field" placeholder="0" value={form.prepTime} onChange={e => setForm({...form, prepTime: e.target.value})} />
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">Image URL (or leave blank)</label>
            <input type="text" className="input-field" placeholder="https://..." value={form.imageUrl} onChange={e => setForm({...form, imageUrl: e.target.value})} />
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveItem} disabled={loading}>
              {loading ? 'Saving...' : editId ? 'Update Item' : 'Add Item'}
            </button>
            <button className="btn btn-ghost" onClick={resetForm}>Cancel</button>
          </div>
        </div>
      )}

      {/* Items list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {items.map(item => (
          <div key={item.id} className="card" style={{ padding: '12px', display: 'flex', gap: '10px', alignItems: 'center', opacity: item.available ? 1 : 0.6 }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '10px', background: 'var(--primary-bg)', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {item.imageUrl
                ? <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: '24px' }}>🍽️</span>
              }
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: '700', fontSize: '14px' }}>{item.name}</p>
              <p style={{ fontSize: '12px', color: 'var(--gray-400)' }}>₹{item.price} · {item.prepTime}min · {item.category}</p>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
              <button
                onClick={() => toggleAvailability(item)}
                style={{ padding: '5px 10px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '700', background: item.available ? '#EAFAF1' : '#FDEDEC', color: item.available ? '#1E8449' : '#C0392B' }}
              >
                {item.available ? '✓ Live' : '✕ OOS'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => startEdit(item)} style={{ padding: '5px 10px' }}>✏️</button>
              <button className="btn btn-sm" onClick={() => deleteItem(item.id)} style={{ padding: '5px 10px', background: '#FDEDEC', color: '#C0392B', border: 'none', borderRadius: '20px', cursor: 'pointer' }}>🗑</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// WALLETS TAB
// ─────────────────────────────────────────────────────────────────
function WalletsTab() {
  const [users, setUsers]   = useState([]);
  const [search, setSearch] = useState('');
  const [rechargeAmt, setRechargeAmt] = useState({});
  const [loading, setLoading] = useState({});

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', 'in', ['student', 'staff']));
    const unsub = onSnapshot(q, snap => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  const recharge = async (userId, currentBalance) => {
    const amt = parseFloat(rechargeAmt[userId]);
    if (!amt || amt <= 0) { alert('Enter a valid amount'); return; }
    setLoading(prev => ({ ...prev, [userId]: true }));
    try {
      await updateDoc(doc(db, 'users', userId), { walletBalance: currentBalance + amt });
      setRechargeAmt(prev => ({ ...prev, [userId]: '' }));
    } catch (e) {
      alert('Failed to recharge wallet');
    } finally {
      setLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.rollNumber?.toLowerCase().includes(search.toLowerCase()) ||
    u.staffId?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="input-group" style={{ marginBottom: '16px' }}>
        <input
          type="text"
          className="input-field"
          placeholder="🔍 Search by name, roll number, staff ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filtered.map(u => (
          <div key={u.id} className="card" style={{ padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <div>
                <p style={{ fontWeight: '700', fontSize: '15px' }}>{u.name}</p>
                <p style={{ fontSize: '12px', color: 'var(--gray-400)' }}>
                  {u.role === 'student' ? `🎓 ${u.rollNumber} · ${u.branch}` : `👨‍💼 ${u.staffId}`}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '11px', color: 'var(--gray-400)' }}>Balance</p>
                <p style={{ fontWeight: '800', fontSize: '18px', color: 'var(--primary)' }}>₹{u.walletBalance ?? 0}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="number"
                className="input-field"
                placeholder="Amount (₹)"
                value={rechargeAmt[u.id] || ''}
                onChange={e => setRechargeAmt(prev => ({ ...prev, [u.id]: e.target.value }))}
                style={{ flex: 1, marginBottom: 0, fontSize: '14px', padding: '10px 12px' }}
              />
              <button
                className="btn btn-primary btn-sm"
                onClick={() => recharge(u.id, u.walletBalance ?? 0)}
                disabled={loading[u.id]}
                style={{ whiteSpace: 'nowrap' }}
              >
                {loading[u.id] ? '...' : '+ Add'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// ANALYTICS TAB
// ─────────────────────────────────────────────────────────────────
function AnalyticsTab() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const q = query(
      collection(db, 'orders'),
      where('createdAt', '>=', Timestamp.fromDate(start))
    );
    const unsub = onSnapshot(q, snap => {
      const orders = snap.docs.map(d => d.data());
      const completed = orders.filter(o => o.status === 'Completed');
      const revenue = completed.reduce((s, o) => s + o.totalAmount, 0);

      // Most ordered item
      const itemCount = {};
      orders.forEach(o => o.items?.forEach(i => {
        itemCount[i.name] = (itemCount[i.name] || 0) + i.qty;
      }));
      const mostOrdered = Object.entries(itemCount).sort((a, b) => b[1] - a[1])[0];

      setStats({
        total: orders.length,
        completed: completed.length,
        revenue,
        mostOrdered: mostOrdered ? `${mostOrdered[0]} (${mostOrdered[1]}×)` : 'None',
      });
    });
    return unsub;
  }, []);

  const cards = [
    { label: "Today's Orders", value: stats?.total ?? '—', icon: '📋', color: 'var(--info)' },
    { label: 'Completed', value: stats?.completed ?? '—', icon: '✅', color: 'var(--success)' },
    { label: "Today's Revenue", value: stats ? `₹${stats.revenue}` : '—', icon: '💰', color: 'var(--primary)' },
    { label: 'Top Item', value: stats?.mostOrdered ?? '—', icon: '🏆', color: 'var(--accent)' },
  ];

  return (
    <div>
      <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', marginBottom: '16px' }}>Today's Analytics</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {cards.map(({ label, value, icon, color }) => (
          <div key={label} className="card" style={{ padding: '16px', textAlign: 'center' }}>
            <span style={{ fontSize: '28px' }}>{icon}</span>
            <p style={{ fontWeight: '800', fontSize: '18px', color, marginTop: '6px', marginBottom: '4px', wordBreak: 'break-word' }}>{value}</p>
            <p style={{ fontSize: '11px', color: 'var(--gray-400)', fontWeight: '700' }}>{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// EXPORT TAB
// ─────────────────────────────────────────────────────────────────
function ExportTab() {
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate]     = useState(today);
  const [loading, setLoading]     = useState(false);

  const exportCSV = async () => {
    setLoading(true);
    try {
      const start = new Date(startDate + 'T00:00:00');
      const end   = new Date(endDate   + 'T23:59:59');
      const q = query(
        collection(db, 'orders'),
        where('createdAt', '>=', Timestamp.fromDate(start)),
        where('createdAt', '<=', Timestamp.fromDate(end)),
        orderBy('createdAt', 'asc')
      );
      const snap = await getDocs(q);
      const rows = [['OrderID', 'Token', 'UserName', 'UserType', 'Items', 'TotalAmount', 'Status', 'DateTime']];
      snap.docs.forEach(d => {
        const o = d.data();
        const itemsStr = o.items?.map(i => `${i.name} x${i.qty}`).join('; ') || '';
        const dt = o.createdAt?.toDate()?.toLocaleString('en-IN') || '';
        rows.push([o.orderId, o.token, o.userName, o.userType, `"${itemsStr}"`, o.totalAmount, o.status, dt]);
      });
      const csv = rows.map(r => r.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `canteenbite_${startDate}_${endDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Export failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', marginBottom: '16px' }}>Export Order Data</h3>
      <div className="card" style={{ padding: '16px' }}>
        <div className="input-group">
          <label className="input-label">Start Date</label>
          <input type="date" className="input-field" value={startDate} onChange={e => setStartDate(e.target.value)} max={today} />
        </div>
        <div className="input-group">
          <label className="input-label">End Date</label>
          <input type="date" className="input-field" value={endDate} onChange={e => setEndDate(e.target.value)} max={today} />
        </div>
        <button className="btn btn-primary btn-full" onClick={exportCSV} disabled={loading}>
          {loading ? 'Exporting...' : '📥 Download CSV'}
        </button>
        <p style={{ fontSize: '12px', color: 'var(--gray-400)', marginTop: '10px', textAlign: 'center' }}>
          Exports: OrderID, Token, User, Items, Amount, Status, DateTime
        </p>
      </div>
    </div>
  );
}
