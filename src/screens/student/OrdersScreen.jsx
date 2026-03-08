import { useState, useEffect, useRef } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, runTransaction } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { playOrderReadySound, showNotification } from '../../utils/sounds';
import OrderProgressBar from '../../components/OrderProgressBar';
import BottomNav from '../../components/BottomNav';

const STATUS_COLOR = {
  Placed:    'badge-placed',
  Preparing: 'badge-preparing',
  Ready:     'badge-ready',
  Completed: 'badge-completed',
  Cancelled: 'badge-cancelled',
};

export default function OrdersScreen() {
  const [orders, setOrders]     = useState([]);
  const [tab, setTab]           = useState('active');
  const [loading, setLoading]   = useState(true);
  // Declare useAuth FIRST — other logic below depends on `user`
  const { user, refreshProfile } = useAuth();
  const toast = useToast();

  const prevStatusMap    = useRef(null);
  const isFirstLoad      = useRef(true);

  // sessionStartTime stored in sessionStorage so it survives
  // mobile page reloads when app is backgrounded (Chrome kills/reloads page to save RAM)
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

  // Ask for notification permission + warm up AudioContext
  // on first real user interaction (click anywhere)
  useEffect(() => {
    const init = async () => {
      const granted = await requestNotificationPermission();
      setNotifAllowed(granted);
    };
    init();

    // Warm up AudioContext on first click so sound works instantly later
    const warmUp = () => {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        ctx.resume().then(() => ctx.close());
      } catch {}
      document.removeEventListener('click', warmUp);
    };
    document.addEventListener('click', warmUp, { once: true });
  }, []);

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
        // First load — record current statuses, no sounds
        const initialMap = {};
        updatedOrders.forEach(o => { initialMap[o.id] = o.status; });
        prevStatusMap.current = initialMap;
        isFirstLoad.current   = false;
      } else {
        updatedOrders.forEach(order => {
          const prev = prevStatusMap.current?.[order.id];
          const curr = order.status;

          if (prev !== undefined && prev !== 'Ready' && curr === 'Ready') {
            // ── Freshness check ───────────────────────────────
            // Play sound only if the order became Ready AFTER this
            // browser session started. This correctly handles:
            //   ✅ Order placed 15 min ago, marked Ready just now → SOUND
            //   ✅ App was closed, order marked Ready while closed,
            //      app reopens → NO sound (was ready before this session)
            const readyAt  = order.updatedAt?.toDate?.()?.getTime?.() || 0;
            const isFresh  = readyAt >= sessionStartTime.current;

            if (isFresh) {
              playOrderReadySound();
              showNotification(
                '🍽️ Your order is Ready!',
                `Token ${order.token} · Go to the counter to collect your order.`,
                `ready-${order.id}`
              );
              toast.success(`🔔 Token ${order.token} is ready! Please collect from the counter.`);
            } else {
              // Order was already Ready before this session opened — no sound
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

  const activeOrders = orders.filter(o => !['Completed', 'Cancelled'].includes(o.status));
  const pastOrders   = orders.filter(o =>  ['Completed', 'Cancelled'].includes(o.status));

  const cancelOrder = async (order) => {
    if (!window.confirm('Cancel this order? Your wallet will be refunded.')) return;
    try {
      const orderRef = doc(db, 'orders', order.id);
      const userRef  = doc(db, 'users', user.uid);
      await runTransaction(db, async (txn) => {
        const orderSnap = await txn.get(orderRef);
        if (orderSnap.data().status !== 'Placed') {
          throw new Error('Order can no longer be cancelled.');
        }
        const userSnap = await txn.get(userRef);
        txn.update(orderRef, { status: 'Cancelled' });
        txn.update(userRef, { walletBalance: userSnap.data().walletBalance + order.totalAmount });
      });
      refreshProfile();
      toast.success(`Order cancelled. ₹${order.totalAmount} refunded to your wallet.`);
    } catch (err) {
      toast.error(err.message || 'Failed to cancel order.');
    }
  };

  const displayOrders = tab === 'active' ? activeOrders : pastOrders;

  return (
    <div className="screen">
      <div className="screen-header">
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px' }}>📋 My Orders</h2>

      </div>

      <div className="screen-body">
        <div className="tab-bar">
          <button className={`tab-item ${tab === 'active' ? 'active' : ''}`} onClick={() => setTab('active')}>
            Active {activeOrders.length > 0 && `(${activeOrders.length})`}
          </button>
          <button className={`tab-item ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
            History
          </button>
        </div>

        {loading ? (
          <div className="empty-state"><div className="spinner spinner-dark" /></div>
        ) : displayOrders.length === 0 ? (
          <div className="empty-state">
            <span style={{ fontSize: '48px' }}>{tab === 'active' ? '🍽️' : '📜'}</span>
            <h3>{tab === 'active' ? 'No active orders' : 'No past orders'}</h3>
            <p>{tab === 'active' ? 'Place an order from the menu!' : 'Your completed orders will appear here.'}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {displayOrders.map(order => (
              <OrderCard key={order.id} order={order} onCancel={cancelOrder} />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

function OrderCard({ order, onCancel }) {
  const [expanded, setExpanded] = useState(!['Completed', 'Cancelled'].includes(order.status));
  const readyTime = order.estimatedReadyTime?.toDate?.();
  const isReady   = order.status === 'Ready';

  const formatTime = (date) => {
    if (!date) return '—';
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const formatDateTime = (ts) => {
    if (!ts) return '—';
    const d = ts.toDate?.() || ts;
    return d.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
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
            {order.orderId} · {formatDateTime(order.createdAt)}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontWeight: '800', color: 'var(--primary)', fontSize: '16px' }}>₹{order.totalAmount}</p>
          <span style={{ fontSize: '16px', color: 'var(--gray-400)' }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid var(--gray-200)', padding: '12px 14px' }}>
          {!['Completed', 'Cancelled'].includes(order.status) && (
            <div style={{ marginBottom: '14px' }}>
              <OrderProgressBar status={order.status} />
              {readyTime && order.status !== 'Ready' && (
                <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--gray-500)', marginTop: '8px' }}>
                  ⏱ Estimated ready by <strong style={{ color: 'var(--primary)' }}>{formatTime(readyTime)}</strong>
                </p>
              )}
            </div>
          )}
          <div style={{ marginBottom: '10px' }}>
            <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--gray-500)', marginBottom: '6px' }}>ITEMS</p>
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
