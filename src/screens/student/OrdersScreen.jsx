import { useState, useEffect, useRef } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, runTransaction } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { playOrderReadySound, showNotification } from '../../utils/sounds';
import OrderProgressBar from '../../components/OrderProgressBar';
import BottomNav from '../../components/BottomNav';

const STATUS_PRIORITY = { Ready: 0, Preparing: 1, Placed: 2 };

const STATUS_COLOR = {
  Placed:    'badge-placed',
  Preparing: 'badge-preparing',
  Ready:     'badge-ready',
  Completed: 'badge-completed',
  Cancelled: 'badge-cancelled',
};

const HISTORY_FILTERS = [
  { key: 'all',       label: 'All' },
  { key: 'Completed', label: '✅ Completed' },
  { key: 'Cancelled', label: '✕ Cancelled' },
];

export default function OrdersScreen() {
  const [orders, setOrders]       = useState([]);
  const [tab, setTab]             = useState('active');
  const [historyFilter, setHistoryFilter] = useState('all');
  const [loading, setLoading]     = useState(true);

  const { user } = useAuth();
  const toast    = useToast();

  const prevStatusMap = useRef(null);
  const isFirstLoad   = useRef(true);

  const SESSION_KEY = user ? `canteenbite_session_${user.uid}` : null;
  const getSessionStartTime = () => {
    if (!SESSION_KEY) return Date.now();
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) return parseInt(stored, 10);
    const now = Date.now();
    sessionStorage.setItem(SESSION_KEY, String(now));
    return now;
  };
  const sessionStartTime = useRef(getSessionStartTime());

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'orders'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, snap => {
      const updatedOrders = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      if (isFirstLoad.current) {
        const initialMap = {};
        updatedOrders.forEach(o => { initialMap[o.id] = o.status; });
        prevStatusMap.current = initialMap;
        isFirstLoad.current   = false;
      } else {
        updatedOrders.forEach(order => {
          const prev = prevStatusMap.current?.[order.id];
          const curr = order.status;

          if (prev !== undefined && prev !== 'Ready' && curr === 'Ready') {
            const readyAt = order.updatedAt?.toDate?.()?.getTime?.() || 0;
            const isFresh = readyAt >= sessionStartTime.current;
            if (isFresh) {
              playOrderReadySound();
              showNotification(
                '🍽️ Your order is Ready!',
                `Token ${order.token} · Go to the counter to collect your order.`,
                `ready-${order.id}`
              );
              toast.success(`🔔 Token ${order.token} is ready! Please collect from the counter.`);
            } else {
              toast.info(`Token ${order.token} was already ready. Please collect from the counter.`);
            }
          }

          prevStatusMap.current[order.id] = curr;
        });
        updatedOrders.forEach(o => {
          if (!(o.id in prevStatusMap.current)) {
            prevStatusMap.current[o.id] = o.status;
          }
        });
      }

      setOrders(updatedOrders);
      setLoading(false);
    });

    return unsub;
  }, [user]);

  const activeOrders = [...orders.filter(o => !['Completed', 'Cancelled'].includes(o.status))]
    .sort((a, b) => (STATUS_PRIORITY[a.status] ?? 9) - (STATUS_PRIORITY[b.status] ?? 9));

  const pastOrders = orders.filter(o => ['Completed', 'Cancelled'].includes(o.status));

  const filteredHistory = historyFilter === 'all'
    ? pastOrders
    : pastOrders.filter(o => o.status === historyFilter);

  const cancelOrder = async (order) => {
    if (!window.confirm('Cancel this order? Your wallet will be refunded.')) return;
    try {
      const orderRef = doc(db, 'orders', order.id);
      const userRef  = doc(db, 'users', user.uid);
      await runTransaction(db, async (txn) => {
        const orderSnap = await txn.get(orderRef);
        if (orderSnap.data().status !== 'Placed') throw new Error('Order can no longer be cancelled.');
        const userSnap = await txn.get(userRef);
        txn.update(orderRef, { status: 'Cancelled' });
        txn.update(userRef, { walletBalance: userSnap.data().walletBalance + order.totalAmount });
      });
      toast.success(`Order cancelled. ₹${order.totalAmount} refunded to your wallet.`);
    } catch (err) {
      toast.error(err.message || 'Failed to cancel order.');
    }
  };

  return (
    <div className="screen">
      <div className="screen-header">
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px' }}>📋 My Orders</h2>
      </div>

      <div className="screen-body">
        {/* Main tabs */}
        <div className="tab-bar">
          <button className={`tab-item ${tab === 'active' ? 'active' : ''}`} onClick={() => setTab('active')}>
            Active {activeOrders.length > 0 && `(${activeOrders.length})`}
          </button>
          <button className={`tab-item ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
            History
          </button>
        </div>

        {/* History filter pills */}
        {tab === 'history' && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
            {HISTORY_FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setHistoryFilter(f.key)}
                style={{
                  padding: '5px 14px',
                  borderRadius: 'var(--radius-full)',
                  border: `1.5px solid ${historyFilter === f.key ? 'var(--primary)' : 'var(--gray-300)'}`,
                  background: historyFilter === f.key ? 'var(--primary-bg)' : 'transparent',
                  color: historyFilter === f.key ? 'var(--primary)' : 'var(--gray-500)',
                  fontSize: '12px', fontWeight: '700',
                  cursor: 'pointer', fontFamily: 'var(--font-body)',
                  transition: 'all 0.2s',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="empty-state"><div className="spinner spinner-dark" /></div>
        ) : tab === 'active' && activeOrders.length === 0 ? (
          <div className="empty-state">
            <span style={{ fontSize: '48px' }}>🍽️</span>
            <h3>No active orders</h3>
            <p>Place an order from the menu!</p>
          </div>
        ) : tab === 'history' && filteredHistory.length === 0 ? (
          <div className="empty-state">
            <span style={{ fontSize: '48px' }}>📜</span>
            <h3>No orders found</h3>
            <p>{historyFilter === 'all' ? 'Your completed orders will appear here.' : `No ${historyFilter.toLowerCase()} orders.`}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(tab === 'active' ? activeOrders : filteredHistory).map(order => (
              <OrderCard key={order.id} order={order} onCancel={cancelOrder} isHistory={tab === 'history'} />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

function OrderCard({ order, onCancel, isHistory }) {
  const [expanded, setExpanded] = useState(!isHistory);
  const readyTime = order.estimatedReadyTime?.toDate?.();
  const isReady   = order.status === 'Ready';

  const fmt = (ts) => {
    if (!ts) return '—';
    const d = ts.toDate?.() || ts;
    return d.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const fmtTime = (date) => {
    if (!date) return '—';
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  return (
    <div className="card" style={{
      overflow: 'hidden',
      animation: 'fadeIn 0.3s ease',
      border: isReady ? '2px solid var(--success)' : undefined,
    }}>
      {isReady && (
        <div style={{
          background: 'var(--success)', color: 'white',
          textAlign: 'center', padding: '7px',
          fontSize: '12px', fontWeight: '800', letterSpacing: '0.5px',
        }}>
          🔔 YOUR ORDER IS READY — COLLECT FROM COUNTER
        </div>
      )}

      <div
        style={{ padding: '12px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
        onClick={() => setExpanded(!expanded)}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', color: 'var(--primary)', fontWeight: '800' }}>
              Token {order.token}
            </span>
            <span className={`badge ${STATUS_COLOR[order.status] || 'badge-placed'}`}>{order.status}</span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--gray-400)' }}>
            {order.orderId} · {fmt(order.createdAt)}
          </p>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ fontWeight: '800', color: 'var(--primary)', fontSize: '16px' }}>₹{order.totalAmount}</p>
          <span style={{ fontSize: '14px', color: 'var(--gray-400)' }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid var(--gray-200)', padding: '12px 14px' }}>
          {!['Completed', 'Cancelled'].includes(order.status) && (
            <div style={{ marginBottom: '14px' }}>
              <OrderProgressBar status={order.status} />
              {readyTime && order.status !== 'Ready' && (
                <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--gray-500)', marginTop: '8px' }}>
                  ⏱ Estimated ready by <strong style={{ color: 'var(--primary)' }}>{fmtTime(readyTime)}</strong>
                </p>
              )}
            </div>
          )}

          {/* Items */}
          <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--gray-400)', marginBottom: '6px' }}>ITEMS</p>
          <div style={{ marginBottom: '10px' }}>
            {order.items?.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '13px', color: 'var(--gray-700)' }}>{item.name} × {item.qty}</span>
                <span style={{ fontSize: '13px', fontWeight: '700' }}>₹{item.price * item.qty}</span>
              </div>
            ))}
          </div>

          {order.status === 'Placed' && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => onCancel(order)}
              style={{ width: '100%', color: 'var(--danger)', borderColor: 'var(--danger)' }}
            >
              Cancel Order
            </button>
          )}
        </div>
      )}
    </div>
  );
}
