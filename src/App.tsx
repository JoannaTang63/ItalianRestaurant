/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, X, Plus, Minus, ChevronLeft, CreditCard, Clock, MapPin, ChefHat, Trash2 } from 'lucide-react';
import { menuData, Category, MenuItem } from './menuData';
import { db, signIn, auth } from './firebase';
import { handleFirestoreError, OperationType } from './firestore-error-handler';
import { collection, doc, writeBatch, serverTimestamp, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

// ---- Types & Initial State ----
type CartItem = {
  menuItem: MenuItem;
  quantity: number;
}
type ViewState = 'menu' | 'cart' | 'checkout' | 'success' | 'orders';

export default function App() {
  const [cart, setCart] = useState<{ [id: string]: CartItem }>({});
  const [view, setView] = useState<ViewState>('menu');
  const [activeCategory, setActiveCategory] = useState<Category>('Starters');
  const [isOrdering, setIsOrdering] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState('Apple/Google Pay');
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  type OrderDetails = {
    id: string;
    total: number;
    status: string;
    createdAt: Date | null;
    items: {
      id: string;
      name: string;
      price: number;
      quantity: number;
    }[];
  };

  const [myOrders, setMyOrders] = useState<OrderDetails[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  const fetchOrders = async () => {
    if (!auth.currentUser) return;
    setIsLoadingOrders(true);
    try {
      const q = query(
        collection(db, 'orders'),
        where('userId', '==', auth.currentUser.uid)
      );
      const snapshot = await getDocs(q);
      const ordersData: OrderDetails[] = [];
      
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        
        // Fetch items subcollection
        const itemsSnap = await getDocs(collection(docSnap.ref, 'items'));
        const items = itemsSnap.docs.map(itemDoc => {
          const itemData = itemDoc.data();
          return {
            id: itemDoc.id,
            name: itemData.name,
            price: itemData.price,
            quantity: itemData.quantity,
          };
        });

        ordersData.push({
          id: docSnap.id,
          total: data.total,
          status: data.status,
          createdAt: data.createdAt?.toDate() || null,
          items: items,
        });
      }
      
      // Sort in memory to avoid index requirement (newest first)
      ordersData.sort((a, b) => {
        const timeA = a.createdAt?.getTime() || 0;
        const timeB = b.createdAt?.getTime() || 0;
        return timeB - timeA;
      });
      
      setMyOrders(ordersData);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (view === 'orders') {
      fetchOrders();
    }
  }, [view]);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
      setMyOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    } catch (error) {
      console.error("Failed to update status", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthReady(true);
        setAuthError(null);
      } else {
        signIn().catch((err) => {
          console.error('Auth error:', err);
          setAuthError(err.message || 'Failed to authenticate');
        });
      }
    });
    return () => unsubscribe();
  }, []);

  
  // Ref for category sections to allow scroll spying
  const categoryRefs = useRef<{ [key in Category]?: HTMLDivElement | null }>({});
  const navRef = useRef<HTMLDivElement>(null);
  const navButtonRefs = useRef<{ [key in string]?: HTMLButtonElement | null }>({});

  const categories = useMemo(() => {
    return Array.from(new Set(menuData.map(item => item.category)));
  }, []);

  useEffect(() => {
    const container = navRef.current;
    const activeBtn = navButtonRefs.current[activeCategory];
    
    if (container && activeBtn) {
      const containerWidth = container.offsetWidth;
      const btnLeft = activeBtn.offsetLeft;
      const btnWidth = activeBtn.offsetWidth;
      
      container.scrollTo({
        left: btnLeft - containerWidth / 2 + btnWidth / 2,
        behavior: 'smooth'
      });
    }
  }, [activeCategory]);

  const totalItems = Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = Object.values(cart).reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0);

  // ---- Cart Actions ----
  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev[item.id];
      if (existing) {
        return { ...prev, [item.id]: { ...existing, quantity: existing.quantity + 1 } };
      }
      return { ...prev, [item.id]: { menuItem: item, quantity: 1 } };
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const existing = prev[itemId];
      if (!existing) return prev;
      if (existing.quantity === 1) {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      return { ...prev, [itemId]: { ...existing, quantity: existing.quantity - 1 } };
    });
  };

  // ---- Scrolling Logic ----
  const scrollToCategory = (cat: Category) => {
    setActiveCategory(cat);
    categoryRefs.current[cat]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    if (view !== 'menu') return;
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 150; // offset for sticky header
      
      let currentActive: Category = activeCategory;
      for (const category of categories) {
        const element = categoryRefs.current[category];
        if (element && element.offsetTop <= scrollPosition) {
          currentActive = category;
        }
      }
      if (currentActive !== activeCategory) {
        setActiveCategory(currentActive);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [categories, activeCategory, view]);

  // ---- Renderers ----
  
  const renderMenu = () => (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="pb-32"
    >
      {/* Header Info */}
      <div className="pt-8 px-6 pb-6 text-center border-b border-[var(--color-border)] bg-[var(--color-paper)] relative">
        <button 
          onClick={() => setView('orders')}
          className="absolute top-4 right-4 bg-transparent border border-[var(--color-border)] px-3 py-1.5 rounded text-xs uppercase tracking-widest font-semibold text-[var(--color-ink-dim)] hover:text-[var(--color-brand)] transition-colors"
        >
          My Orders
        </button>
        <h1 className="font-serif text-4xl md:text-5xl font-semibold mb-2">Jeff's crazy restaurant</h1>
        <p className="text-[var(--color-ink-dim)] font-sans text-xs tracking-widest uppercase mb-2">Shanghai Huangpu District, East Beijing Road, Paradise</p>
        <p className="text-[var(--color-ink-dim)] font-sans text-sm tracking-widest uppercase">Table 12 &bull; View Menu & Order</p>
      </div>

      {/* Sticky Category Bar */}
      <div className="sticky top-0 z-40 bg-[var(--color-paper)]/95 backdrop-blur-md border-b border-[var(--color-border)]">
        <div ref={navRef} className="flex overflow-x-auto hide-scrollbar py-4 px-4 gap-2 relative">
          {categories.map(category => (
            <button
              key={category}
              ref={el => navButtonRefs.current[category] = el}
              onClick={() => scrollToCategory(category)}
              className={`whitespace-nowrap px-5 py-2.5 rounded text-xs font-medium uppercase tracking-widest transition-colors border ${
                activeCategory === category 
                  ? 'bg-[var(--color-brand)] text-[var(--color-paper)] border-[var(--color-brand)]' 
                  : 'bg-transparent text-[var(--color-ink-dim)] border-[var(--color-border)] hover:border-[var(--color-brand)]'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Sections */}
      <div className="max-w-3xl mx-auto px-4 mt-6">
        {categories.map(category => (
          <div 
            key={category} 
            ref={el => categoryRefs.current[category] = el}
            className="mb-12 pt-6"
          >
            <h2 className="font-serif text-3xl font-semibold mb-6 flex items-center">
               <span className="flex-1 border-t border-[var(--color-border)] mr-4"></span>
               {category}
               <span className="flex-1 border-t border-[var(--color-border)] ml-4"></span>
            </h2>
            <div className="space-y-6">
              {menuData.filter(item => item.category === category).map(item => (
                <div key={item.id} className="flex gap-4 bg-[var(--color-surface)] p-4 rounded-lg border border-[var(--color-border)]">
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      {item.tags && (
                         <div className="flex gap-2 mb-2">
                           {item.tags.map(tag => (
                             <span key={tag} className="text-[10px] uppercase tracking-widest bg-[var(--color-brand-light)] text-[var(--color-brand)] px-2 py-0.5 rounded-full">
                               {tag}
                             </span>
                           ))}
                         </div>
                      )}
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-serif font-semibold text-lg leading-tight pr-4">{item.name}</h3>
                        <span className="font-serif font-semibold text-[var(--color-brand)]">${item.price.toFixed(2)}</span>
                      </div>
                      <p className="text-[var(--color-ink-dim)] text-xs leading-relaxed mb-3">{item.description}</p>
                    </div>
                    
                    {/* Add / Quantity Controls */}
                    <div className="flex items-center mt-auto">
                      {cart[item.id] ? (
                        <div className="flex items-center bg-[var(--color-paper)] rounded overflow-hidden border border-[var(--color-border)]">
                          <button 
                            onClick={() => removeFromCart(item.id)}
                            className="p-2 text-[var(--color-ink-dim)] hover:text-[var(--color-ink)] transition-colors"
                          >
                            <Minus size={16} />
                          </button>
                          <span className="w-8 text-center font-semibold font-sans text-sm">
                            {cart[item.id].quantity}
                          </span>
                          <button 
                            onClick={() => addToCart(item)}
                            className="p-2 text-[var(--color-ink-dim)] hover:text-[var(--color-ink)] transition-colors"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => addToCart(item)}
                          className="flex items-center gap-1.5 uppercase tracking-widest bg-[var(--color-brand)] text-[var(--color-paper)] px-4 py-2 rounded text-[10px] font-semibold hover:brightness-110 transition-colors"
                        >
                          <Plus size={14} />
                          Add
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="w-28 h-28 sm:w-36 sm:h-36 shrink-0 relative overflow-hidden rounded-lg">
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover brightness-80" loading="lazy" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Floating View Cart Button */}
      {totalItems > 0 && (
        <motion.div 
          initial={{ y: 100, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }} 
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 p-4 z-50 pointer-events-none"
        >
          <div className="max-w-3xl mx-auto pointer-events-auto">
            <button 
              onClick={() => setView('cart')}
              className="w-full bg-[var(--color-brand)] text-[var(--color-paper)] p-4 rounded shadow-xl flex items-center justify-between font-sans hover:brightness-110 transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="bg-[var(--color-surface)] w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm text-[var(--color-ink)] border border-[var(--color-brand)]">
                  {totalItems}
                </div>
                <span className="font-semibold text-lg tracking-widest uppercase text-[var(--color-paper)] font-serif">View Order</span>
              </div>
              <span className="font-semibold text-lg text-[var(--color-paper)] font-serif">${cartTotal.toFixed(2)}</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* Footer */}
      <div className="pb-24 pt-8 text-center text-[var(--color-ink-dim)] font-serif italic text-lg">
        Fatto con amore in Italia.
      </div>
    </motion.div>
  );

  const renderCart = () => (
    <motion.div 
      initial={{ x: '100%' }} 
      animate={{ x: 0 }} 
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-50 bg-[var(--color-paper)] overflow-y-auto"
    >
      <div className="max-w-3xl mx-auto min-h-screen flex flex-col bg-[var(--color-surface)] relative border-x border-[var(--color-border)]">
        <div className="sticky top-0 bg-[var(--color-surface)] border-b border-[var(--color-border)] px-6 py-4 flex items-center justify-between z-10">
          <button 
            onClick={() => setView('menu')}
            className="flex items-center gap-2 text-[var(--color-ink-dim)] hover:text-[var(--color-ink)] transition-colors p-2 -ml-2 rounded"
          >
            <ChevronLeft size={24} />
            <span className="font-medium uppercase tracking-widest text-xs">Menu</span>
          </button>
          <h2 className="font-serif text-2xl font-semibold">Your Order</h2>
          {totalItems > 0 ? (
            <button 
              onClick={() => setCart({})}
              className="text-[var(--color-ink-dim)] hover:text-red-500 transition-colors p-2 -mr-2 rounded flex items-center justify-center group"
              title="Clear Order"
            >
              <Trash2 size={20} className="group-hover:scale-110 transition-transform" />
            </button>
          ) : (
            <div className="w-10"></div>
          )}
        </div>

        <div className="flex-1 p-6">
          {totalItems === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[var(--color-ink-dim)] py-20">
              <ShoppingBag size={64} className="mb-4 opacity-20" />
              <p className="font-serif text-2xl mb-6">Your cart is empty</p>
              <button 
                onClick={() => setView('menu')}
                className="px-8 py-3 rounded uppercase tracking-widest text-xs border border-[var(--color-border)] text-[var(--color-ink)] font-medium hover:border-[var(--color-brand)] transition-colors"
              >
                Browse Menu
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.values(cart).map((item) => (
                <div key={item.menuItem.id} className="flex gap-4 border-b border-[var(--color-border)] pb-6">
                  <div className="w-20 h-20 shrink-0 rounded overflow-hidden">
                    <img src={item.menuItem.imageUrl} alt={item.menuItem.name} className="w-full h-full object-cover brightness-80" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-serif text-lg">{item.menuItem.name}</h3>
                      <span className="font-serif font-semibold text-[var(--color-brand)]">${(item.menuItem.price * item.quantity).toFixed(2)}</span>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center bg-[var(--color-paper)] rounded border border-[var(--color-border)]">
                        <button 
                          onClick={() => removeFromCart(item.menuItem.id)}
                          className="p-2.5 text-[var(--color-ink-dim)] hover:text-[var(--color-ink)] transition-colors"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-8 text-center font-medium font-sans text-sm">
                          {item.quantity}
                        </span>
                        <button 
                          onClick={() => addToCart(item.menuItem)}
                          className="p-2.5 text-[var(--color-ink-dim)] hover:text-[var(--color-ink)] transition-colors"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <button 
                        onClick={() => {
                           const newCart = {...cart};
                           delete newCart[item.menuItem.id];
                           setCart(newCart);
                        }}
                        className="text-[var(--color-ink-dim)] hover:text-[var(--color-brand)] text-xs uppercase tracking-widest font-medium underline underline-offset-4"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <div className="pt-6 space-y-3 font-sans">
                <div className="flex justify-between text-[var(--color-ink-dim)] text-sm">
                  <span>Subtotal</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[var(--color-ink-dim)] text-sm">
                  <span>Taxes & Fees (8.5%)</span>
                  <span>${(cartTotal * 0.085).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-serif font-semibold text-xl pt-4 border-t border-[var(--color-border)]">
                  <span>Total</span>
                  <span className="text-[var(--color-brand)]">${(cartTotal * 1.085).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {totalItems > 0 && (
          <div className="sticky bottom-0 p-6 bg-[var(--color-surface)] border-t border-[var(--color-border)]">
            <button 
              onClick={() => setView('checkout')}
              className="w-full bg-[var(--color-brand)] text-[var(--color-paper)] p-4 rounded flex items-center justify-center gap-3 font-semibold uppercase tracking-widest text-sm hover:brightness-110 transition-colors"
            >
              <span>Continue to Checkout</span>
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );

  const renderCheckout = () => (
    <motion.div 
      initial={{ x: '100%' }} 
      animate={{ x: 0 }} 
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-50 bg-[var(--color-paper)] overflow-y-auto"
    >
      <div className="max-w-2xl mx-auto min-h-screen py-8 px-4 flex flex-col bg-[var(--color-surface)] border-x border-[var(--color-border)]">
         <div className="flex items-center gap-4 mb-8">
            <button 
              onClick={() => setView('cart')}
              className="w-10 h-10 rounded border border-[var(--color-border)] bg-[var(--color-paper)] flex items-center justify-center text-[var(--color-ink-dim)] hover:text-[var(--color-ink)] hover:border-[var(--color-brand)] transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
            <h2 className="font-serif text-3xl font-semibold">Checkout</h2>
         </div>

         <div className="bg-[var(--color-paper)] rounded-lg p-6 border border-[var(--color-border)] mb-6">
            <h3 className="font-serif text-xl font-semibold mb-4 flex items-center gap-2">
              <MapPin size={20} className="text-[var(--color-brand)]" />
              Dining Location
            </h3>
            <div className="bg-[var(--color-surface)] rounded p-4 border border-[var(--color-border)] flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm uppercase tracking-widest">Table 12</p>
                <p className="text-xs text-[var(--color-ink-dim)]">Main Dining Room</p>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-widest border border-[var(--color-brand)] text-[var(--color-brand)] px-3 py-1 rounded">Confirmed</span>
            </div>
         </div>

         <div className="bg-[var(--color-paper)] rounded-lg p-6 border border-[var(--color-border)] mb-6 space-y-4">
            <h3 className="font-serif text-xl font-semibold flex items-center gap-2">
              <CreditCard size={20} className="text-[var(--color-brand)]" />
              Payment Method
            </h3>
            
            <label className="flex items-center gap-4 p-4 border border-[var(--color-brand)] bg-[var(--color-brand-light)] rounded cursor-pointer">
               <input type="radio" name="payment" checked={selectedPayment === 'Apple/Google Pay'} onChange={() => setSelectedPayment('Apple/Google Pay')} className="w-5 h-5 accent-[var(--color-brand)]" />
               <div className="flex-1">
                 <p className="font-medium text-sm">Pay via Apple/Google Pay</p>
               </div>
            </label>

            <label className="flex items-center gap-4 p-4 border border-[var(--color-border)] rounded cursor-pointer hover:border-[var(--color-brand)] transition-colors">
               <input type="radio" name="payment" checked={selectedPayment === 'Credit / Debit Card'} onChange={() => setSelectedPayment('Credit / Debit Card')} className="w-5 h-5 accent-[var(--color-brand)]" />
               <div className="flex-1">
                 <p className="font-medium text-sm">Credit / Debit Card</p>
               </div>
            </label>

            <label className="flex items-center gap-4 p-4 border border-[var(--color-border)] rounded cursor-pointer hover:border-[var(--color-brand)] transition-colors">
               <input type="radio" name="payment" checked={selectedPayment === 'Alipay'} onChange={() => setSelectedPayment('Alipay')} className="w-5 h-5 accent-[var(--color-brand)]" />
               <div className="flex-1">
                 <p className="font-medium text-sm">Alipay</p>
               </div>
            </label>

            <label className="flex items-center gap-4 p-4 border border-[var(--color-border)] rounded cursor-pointer hover:border-[var(--color-brand)] transition-colors">
               <input type="radio" name="payment" checked={selectedPayment === 'WeChat Pay'} onChange={() => setSelectedPayment('WeChat Pay')} className="w-5 h-5 accent-[var(--color-brand)]" />
               <div className="flex-1">
                 <p className="font-medium text-sm">WeChat Pay</p>
               </div>
            </label>
            
            <label className="flex items-center gap-4 p-4 border border-[var(--color-border)] rounded cursor-pointer hover:border-[var(--color-brand)] transition-colors">
               <input type="radio" name="payment" checked={selectedPayment === 'Cash'} onChange={() => setSelectedPayment('Cash')} className="w-5 h-5 accent-[var(--color-brand)]" />
               <div className="flex-1">
                 <p className="font-medium text-sm">Pay with Cash</p>
                 <p className="text-xs text-[var(--color-ink-dim)]">Waitstaff will assist you.</p>
               </div>
            </label>
         </div>

         <div className="mt-auto pt-6 border-t border-[var(--color-border)]">
            {authError && (
              <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-600 text-xs rounded text-center">
                Authentication failed: {authError}. Please ensure Anonymous login is enabled and refresh the page.
              </div>
            )}
            <button 
              disabled={isOrdering || !isAuthReady}
              onClick={async () => {
                if (!auth.currentUser) return;
                setIsOrdering(true);
                try {
                  const batch = writeBatch(db);
                  const orderRef = doc(collection(db, 'orders'));
                  batch.set(orderRef, {
                    userId: auth.currentUser.uid,
                    table: 'Table 12',
                    total: Number((cartTotal * 1.085).toFixed(2)),
                    status: 'pending',
                    paymentMethod: selectedPayment,
                    createdAt: serverTimestamp(),
                  });
                  
                  const itemsRef = collection(orderRef, 'items');
                  Object.values(cart).forEach(cartItem => {
                    batch.set(doc(itemsRef), {
                      menuItemId: cartItem.menuItem.id,
                      name: cartItem.menuItem.name,
                      price: cartItem.menuItem.price,
                      quantity: cartItem.quantity,
                    });
                  });
                  
                  await batch.commit();
                  setView('success');
                  setCart({}); // clear cart on success
                } catch (error) {
                  handleFirestoreError(error, OperationType.CREATE, 'orders');
                } finally {
                  setIsOrdering(false);
                }
              }}
              className="w-full bg-[var(--color-brand)] text-[var(--color-paper)] p-5 rounded flex flex-col items-center justify-center font-semibold hover:brightness-110 active:scale-[0.98] transition-all uppercase tracking-widest text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{isOrdering ? 'Processing...' : (!isAuthReady ? 'Waiting for Auth...' : `Confirm Order \u2022 $${(cartTotal * 1.085).toFixed(2)}`)}</span>
            </button>
         </div>
      </div>
    </motion.div>
  );

  const renderSuccess = () => (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="fixed inset-0 z-50 bg-[var(--color-paper)] text-[var(--color-ink)] flex flex-col items-center justify-center p-6 text-center"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring' }}
      >
        <div className="bg-[var(--color-surface)] w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 relative">
           <ChefHat size={48} className="text-[var(--color-brand)]" />
           <motion.div 
              className="absolute inset-0 border border-[var(--color-brand)] rounded-full"
              initial={{ scale: 1, opacity: 1 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{ repeat: Infinity, duration: 2 }}
           />
        </div>
        <h2 className="font-serif text-4xl sm:text-5xl font-semibold mb-4 text-[var(--color-brand)]">Ordine Ricevuto!</h2>
        <p className="text-sm text-[var(--color-ink-dim)] max-w-sm mx-auto mb-8 uppercase tracking-widest mt-4">
          Your order has been sent to the kitchen.
        </p>
        
        <div className="bg-[var(--color-surface)] rounded-lg p-6 mb-8 max-w-sm mx-auto border border-[var(--color-border)]">
           <div className="flex items-center justify-center gap-3 mb-2">
             <Clock size={20} className="text-[var(--color-ink-dim)]" />
             <span className="font-sans font-medium uppercase tracking-widest text-[10px] text-[var(--color-ink-dim)]">Estimated Time</span>
           </div>
           <p className="text-3xl font-semibold font-serif text-[var(--color-ink)]">15 - 20 mins</p>
        </div>
        
        <button 
          onClick={() => setView('menu')}
          className="bg-[var(--color-brand)] text-[var(--color-paper)] px-8 py-4 rounded font-semibold uppercase tracking-widest text-xs hover:brightness-110 transition-colors"
        >
          View Menu Again
        </button>
        <button 
          onClick={() => setView('orders')}
          className="bg-transparent border border-[var(--color-inner)] text-[var(--color-ink)] px-8 py-4 rounded font-semibold uppercase tracking-widest text-xs hover:border-[var(--color-brand)] hover:text-[var(--color-brand)] transition-colors ml-4"
        >
          View Order Status
        </button>
      </motion.div>
    </motion.div>
  );

  const renderOrders = () => (
    <motion.div 
      initial={{ x: '100%' }} 
      animate={{ x: 0 }} 
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-50 bg-[var(--color-paper)] overflow-y-auto"
    >
      <div className="max-w-3xl mx-auto min-h-screen flex flex-col bg-[var(--color-surface)] border-x border-[var(--color-border)]">
        <div className="sticky top-0 bg-[var(--color-surface)] border-b border-[var(--color-border)] px-6 py-4 flex items-center justify-between z-10">
          <button 
            onClick={() => setView('menu')}
            className="flex items-center gap-2 text-[var(--color-ink-dim)] hover:text-[var(--color-ink)] transition-colors p-2 -ml-2 rounded"
          >
            <ChevronLeft size={24} />
            <span className="font-medium uppercase tracking-widest text-xs">Menu</span>
          </button>
          <h2 className="font-serif text-2xl font-semibold">Order History</h2>
          <div className="w-10"></div>
        </div>

        <div className="flex-1 p-6">
          {isLoadingOrders ? (
            <div className="text-center text-[var(--color-ink-dim)] py-12">Loading orders...</div>
          ) : myOrders.length === 0 ? (
           <div className="text-center text-[var(--color-ink-dim)] py-12 flex flex-col items-center">
             <Clock size={48} className="mb-4 opacity-20" />
             <p className="font-serif text-xl">No orders found.</p>
           </div>
          ) : (
            <div className="space-y-6">
              {myOrders.map(order => (
                <div key={order.id} className="bg-[var(--color-paper)] border border-[var(--color-border)] rounded shadow-sm p-5">
                  <div className="flex justify-between items-center mb-4 pb-4 border-b border-[var(--color-border)]">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-[var(--color-ink-dim)] mb-1">
                        {order.createdAt ? order.createdAt.toLocaleString() : 'Just now'}
                      </p>
                      <p className="font-sans font-semibold text-sm">Order #{order.id.slice(-6).toUpperCase()}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-widest ${
                        order.status === 'completed' ? 'bg-[#e6f4ea] text-[#137333] border border-[#ceead6]' :
                        'bg-[#fef7e0] text-[#e37400] border border-[#fde293]'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    {order.items.map(item => (
                      <div key={item.id} className="flex justify-between items-center text-sm">
                        <span className="font-serif text-[var(--color-ink)]">
                          <span className="text-[var(--color-ink-dim)] mr-2">{item.quantity}x</span> 
                          {item.name}
                        </span>
                        <span className="text-[var(--color-ink-dim)] font-sans">
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-end pt-4 border-t border-[var(--color-border)]">
                    <div>
                      <span className="block text-[10px] uppercase tracking-widest text-[var(--color-ink-dim)] mb-1">Total Paid</span>
                      <span className="font-semibold font-serif text-lg text-[var(--color-ink)]">${order.total.toFixed(2)}</span>
                    </div>
                    {order.status === 'pending' && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'completed')}
                        className="bg-transparent border border-[var(--color-brand)] text-[var(--color-brand)] px-4 py-2 rounded font-semibold text-[10px] uppercase tracking-widest hover:bg-[var(--color-brand)] hover:text-[var(--color-paper)] transition-all"
                      >
                        Mark as Completed
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen relative selection:bg-[var(--color-brand)] selection:text-white">
      <AnimatePresence mode="wait">
        {view === 'menu' && <motion.div key="menu">{renderMenu()}</motion.div>}
        {view === 'cart' && <motion.div key="cart" className="fixed inset-0 z-50">{renderCart()}</motion.div>}
        {view === 'checkout' && <motion.div key="checkout" className="fixed inset-0 z-50">{renderCheckout()}</motion.div>}
        {view === 'success' && <motion.div key="success" className="fixed inset-0 z-50">{renderSuccess()}</motion.div>}
        {view === 'orders' && <motion.div key="orders" className="fixed inset-0 z-50">{renderOrders()}</motion.div>}
      </AnimatePresence>
    </div>
  );
}
