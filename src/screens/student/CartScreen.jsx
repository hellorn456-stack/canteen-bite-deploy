import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection, doc, runTransaction, query, where,
  orderBy, getDocs, getDoc, serverTimestamp, Timestamp
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import BottomNav from '../../components/BottomNav';

export default function CartScreen() {
  const { items, addItem, removeItem, clearCart, totalAmount, totalPrepTime } = useCart();
  const { user, profile, refreshProfile } = useAuth();
  const toast    = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const calculateQueueTime = async () => {
    const q = query(
      collection(db, 'orders'),
      where('status', 'in', ['Placed', 'Preparing']),
      orderBy('createdAt', 'asc')
    );
    const snap = await getDocs(q);
    let queueMinutes = 0;
    snap.docs.forEach(d => {
      queueMinutes += d.data().totalPrepTime || 0;
    });
    return queueMinutes;
  };

  const getNextDailyNumber = async (dateStr) => {
    const counterRef = doc(db, 'dailyCounters', dateStr);
    let number = 1;
    await runTransaction(db, async (txn) => {
      const snap = await txn.get(counterRef);
      if (snap.exists()) {
        number = snap.data().count + 1;
        txn.update(counterRef, { count: number });
      } else {
        txn.set(counterRef, { count: 1 });
      }
    });
    return number;
  };

  const placeOrder = async () => {
    if (!user || !profile || items.length === 0) return;
    setLoading(true);

    try {
      // ── Step 1: Check wallet balance ───────────────────────
      if (profile.walletBalance < totalAmount) {
        toast.error('Insufficient wallet balance. Please visit the canteen counter to recharge.');
        setLoading(false);
        return;
      }

      // ── Step 2: Check each item is still available ─────────
      const unavailableItems = [];
      await Promise.all(
        items.map(async (cartItem) => {
          const itemSnap = await getDoc(doc(db, 'menuItems', cartItem.itemId));
          if (!itemSnap.exists() || itemSnap.data().available === false) {
            unavailableItems.push(cartItem.name);
          }
        })
      );

      if (unavailableItems.length > 0) {
        toast.error(
          `The following item(s) are no longer available: ${unavailableItems.join(', ')}. Please remove them from your cart.`
        );
        setLoading(false);
        return;
      }

      // ── Step 3: Place the order ────────────────────────────
      const now     = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');

      const dailyNumber = await getNextDailyNumber(dateStr);
      const paddedNum   = String(dailyNumber).padStart(3, '0');
      const orderId     = `${dateStr}-${paddedNum}`;
      const token       = `#${paddedNum}`;

      const queueMinutes       = await calculateQueueTime();
      const totalTime          = queueMinutes + totalPrepTime + 1;
      const estimatedReadyTime = new Date(now.getTime() + totalTime * 60000);

      const orderRef = doc(collection(db, 'orders'));
      const userRef  = doc(db, 'users', user.uid);

      await runTransaction(db, async (txn) => {
        const userSnap = await txn.get(userRef);
        const currentBalance = userSnap.data().walletBalance;
        if (currentBalance < totalAmount) {
          throw new Error('Insufficient wallet balance. Please visit the canteen counter to recharge.');
        }
        txn.update(userRef, { walletBalance: currentBalance - totalAmount });
        txn.set(orderRef, {
          orderId, token,
          dailyOrderNumber: dailyNumber,
          userId: user.uid,
          userName: profile.name,
          userType: profile.role,
          items: items.map(i => ({
            itemId: i.itemId, name: i.name,
            qty: i.qty, price: i.price, prepTime: i.prepTime,
          })),
          totalAmount, totalPrepTime,
          status: 'Placed',
          estimatedReadyTime: Timestamp.fromDate(estimatedReadyTime),
          createdAt: serverTimestamp(),
        });
      });

      refreshProfile();
      clearCart();
      toast.success(`🎉 Order placed! Your token is ${token}`);
      setTimeout(() => navigate('/orders'), 1500);
    } catch (err) {
      toast.error(err.message || 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="screen">
        <div className="screen-header">
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px' }}>🛒 Cart</h2>
        </div>
        <div className="screen-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="empty-state">
            <span style={{ fontSize: '56px' }}>🛒</span>
            <h3>Your cart is empty</h3>
            <p>Add items from the menu to get started!</p>
            <button className="btn btn-primary" onClick={() => navigate('/menu')}>Browse Menu</button>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="screen-header">
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px' }}>🛒 Your Cart</h2>
        <span style={{ color: 'var(--gray-400)', fontSize: '13px', marginLeft: 'auto' }}>
          {items.reduce((s, i) => s + i.qty, 0)} items
        </span>
      </div>

      <div className="screen-body">
        {/* Cart items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          {items.map(item => (
            <div key={item.itemId} className="card" style={{ padding: '12px', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: 'var(--radius-md)',
                background: 'var(--primary-bg)', overflow: 'hidden', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {item.imageUrl
                  ? <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: '24px' }}>🍽️</span>
                }
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: '700', fontSize: '14px' }}>{item.name}</p>
                <p style={{ color: 'var(--primary)', fontWeight: '800', fontSize: '14px' }}>
                  ₹{item.price} × {item.qty} = <strong>₹{item.price * item.qty}</strong>
                </p>
                <p style={{ fontSize: '11px', color: 'var(--gray-400)' }}>⏱ {item.prepTime} min prep</p>
              </div>
              <div className="qty-counter">
                <button className="qty-btn" onClick={() => removeItem(item.itemId)}>−</button>
                <span className="qty-count">{item.qty}</span>
                <button className="qty-btn" onClick={() => addItem(item)}>+</button>
              </div>
            </div>
          ))}
        </div>

        {/* Prep time */}
        <div className="card" style={{ padding: '14px', marginBottom: '12px', background: 'var(--primary-bg)', border: '1px solid rgba(232,89,12,0.15)' }}>
          <p style={{ fontSize: '12px', color: 'var(--gray-500)', marginBottom: '4px' }}>Estimated prep time for your items</p>
          <p style={{ fontSize: '16px', fontWeight: '800', color: 'var(--primary)' }}>⏱ ~{totalPrepTime} minutes</p>
          <p style={{ fontSize: '11px', color: 'var(--gray-400)', marginTop: '2px' }}>Actual time may vary based on current queue</p>
        </div>

        {/* Bill summary */}
        <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Bill Summary</h3>
          {items.map(item => (
            <div key={item.itemId} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '13px', color: 'var(--gray-600)' }}>{item.name} × {item.qty}</span>
              <span style={{ fontSize: '13px', fontWeight: '700' }}>₹{item.price * item.qty}</span>
            </div>
          ))}
          <div className="divider" />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: '800', fontSize: '16px' }}>Total</span>
            <span style={{ fontWeight: '800', fontSize: '18px', color: 'var(--primary)' }}>₹{totalAmount}</span>
          </div>
          <div style={{
            marginTop: '8px', padding: '8px 10px',
            background: profile?.walletBalance >= totalAmount ? '#EAFAF1' : '#FDEDEC',
            borderRadius: 'var(--radius-sm)',
          }}>
            <span style={{
              fontSize: '12px', fontWeight: '700',
              color: profile?.walletBalance >= totalAmount ? '#1E8449' : '#C0392B',
            }}>
              💳 Wallet Balance: ₹{profile?.walletBalance ?? 0}
              {profile?.walletBalance < totalAmount && ' — Insufficient!'}
            </span>
          </div>
        </div>

        <button
          className="btn btn-primary btn-full"
          onClick={placeOrder}
          disabled={loading || !profile || profile.walletBalance < totalAmount}
          style={{ fontSize: '16px', padding: '15px' }}
        >
          {loading
            ? <><span className="spinner" /> Checking &amp; Placing Order...</>
            : profile?.walletBalance < totalAmount
              ? '❌ Insufficient Wallet Balance'
              : `Place Order · ₹${totalAmount}`
          }
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
