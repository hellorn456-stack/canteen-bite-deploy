import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);

const loadCart = (userId) => {
  if (!userId) return [];
  try {
    const saved = localStorage.getItem(`cart_${userId}`);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const saveCart = (userId, items) => {
  if (!userId) return;
  try {
    localStorage.setItem(`cart_${userId}`, JSON.stringify(items));
  } catch {}
};

export function CartProviderWrapper({ userId, children }) {
  const [items, setItems] = useState(() => loadCart(userId));

  // When userId changes (login/logout/switch), load that user's cart
  useEffect(() => {
    setItems(loadCart(userId));
  }, [userId]);

  // Persist cart to localStorage whenever items change
  useEffect(() => {
    saveCart(userId, items);
  }, [items, userId]);

  const addItem = (item) => {
    setItems(prev => {
      const existing = prev.find(i => i.itemId === item.itemId);
      if (existing) {
        return prev.map(i =>
          i.itemId === item.itemId ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const removeItem = (itemId) => {
    setItems(prev => {
      const existing = prev.find(i => i.itemId === itemId);
      if (existing && existing.qty > 1) {
        return prev.map(i =>
          i.itemId === itemId ? { ...i, qty: i.qty - 1 } : i
        );
      }
      return prev.filter(i => i.itemId !== itemId);
    });
  };

  const clearCart = () => {
    setItems([]);
    if (userId) localStorage.removeItem(`cart_${userId}`);
  };

  const totalAmount   = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const totalItems    = items.reduce((sum, i) => sum + i.qty, 0);

  // prepTime is per unique item regardless of qty
  // Thalipeeth x2 = 3 min, not 6 min
  const totalPrepTime = items.reduce((sum, i) => sum + i.prepTime, 0);

  const getItemQty = (itemId) => items.find(i => i.itemId === itemId)?.qty || 0;

  return (
    <CartContext.Provider value={{
      items, addItem, removeItem, clearCart,
      totalAmount, totalItems, totalPrepTime, getItemQty,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be inside CartProviderWrapper');
  return ctx;
};
