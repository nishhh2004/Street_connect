import React, { useContext, useState } from 'react';
import { X, Plus, Minus, ShoppingBag, MapPin, Phone, Clock, Info, Truck, Award, Banknote, Smartphone, CheckCircle, Loader, AlertCircle, ArrowLeft } from 'lucide-react';
import { AppContext } from '../context/AppContext';
import { useTranslation } from '../context/LanguageContext';
import { initiateRazorpayPayment } from '../utils/razorpay';

// Steps: 'cart' → 'payment' → 'processing' → 'success'

function OrderModal({ vendor, onClose }) {
  const { placeOrder, currentUser } = useContext(AppContext);
  const { t } = useTranslation();

  const [cart, setCart] = useState({});
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [addressError, setAddressError] = useState(false);
  const [phoneError, setPhoneError] = useState(false);

  // Payment step state
  const [step, setStep] = useState('cart'); // 'cart' | 'payment' | 'processing' | 'success'
  const [paymentMethod, setPaymentMethod] = useState(null); // 'cod' | 'upi'
  const [paymentError, setPaymentError] = useState('');
  const [paymentId, setPaymentId] = useState('');

  const availableMenu = vendor.menu.filter(item => item.available);

  const handleAdd = (item) => setCart(prev => ({ ...prev, [item.id]: (prev[item.id] || 0) + 1 }));
  const handleRemove = (item) => {
    setCart(prev => {
      const current = prev[item.id] || 0;
      if (current <= 1) { const n = { ...prev }; delete n[item.id]; return n; }
      return { ...prev, [item.id]: current - 1 };
    });
  };

  const itemTotal = availableMenu.reduce((total, item) => total + (item.price * (cart[item.id] || 0)), 0);
  const taxes = Math.round(itemTotal * 0.05);
  const baseDelivery = 30;
  const deliveryFee = currentUser?.streetVIP ? 0 : baseDelivery + Math.round((vendor.distance || 0) / 100);
  const finalTotal = itemTotal + taxes + deliveryFee;
  const etaMins = 15 + Math.round((vendor.distance || 0) / 200);

  const calculateItems = () => {
    const items = [];
    availableMenu.forEach(item => { if (cart[item.id]) items.push({ name: item.name, qty: cart[item.id], price: item.price }); });
    return items;
  };

  const pendingOrder = () => ({
    id: `ord_${Math.random().toString(36).substr(2, 9)}`,
    vendorId: vendor.id,
    customerId: currentUser?.id || 'guest',
    customerName: currentUser?.name || 'Guest',
    customerPhone: phone,
    items: calculateItems(),
    itemTotal,
    taxes,
    deliveryFee,
    total: finalTotal,
    etaMins,
    status: 'pending',
    deliveryAddress: address,
    customerLat: 12.9735,
    customerLng: 77.5960,
    createdAt: Date.now(),
  });

  // Step 1: Validate cart details and move to payment
  const handleProceedToPayment = () => {
    if (itemTotal === 0) return;
    let hasErr = false;
    if (!address.trim()) { setAddressError(true); hasErr = true; } else setAddressError(false);
    if (!phone.trim()) { setPhoneError(true); hasErr = true; } else setPhoneError(false);
    if (hasErr) return;
    setStep('payment');
    setPaymentError('');
  };

  // Step 2a: Cash on Delivery
  const handleCOD = () => {
    const order = { ...pendingOrder(), paymentMethod: 'COD', paymentStatus: 'pending' };
    placeOrder(order);
    setStep('success');
  };

  // Step 2b: UPI via Razorpay
  const handleUPI = async () => {
    setStep('processing');
    setPaymentError('');
    try {
      const orderId = `ord_${Math.random().toString(36).substr(2, 9)}`;
      const { paymentId: pid } = await initiateRazorpayPayment({
        amount: finalTotal,
        name: currentUser?.name || 'Customer',
        email: currentUser?.email || '',
        phone,
        description: `Order at ${vendor.name}`,
        orderId,
      });
      setPaymentId(pid);
      const order = {
        ...pendingOrder(),
        id: orderId,
        paymentMethod: 'UPI',
        paymentStatus: 'paid',
        razorpayPaymentId: pid,
      };
      placeOrder(order);
      setStep('success');
    } catch (err) {
      if (err.message === 'DISMISSED') {
        setStep('payment');
      } else {
        setPaymentError(err.message || 'Payment failed. Please try again.');
        setStep('payment');
      }
    }
  };

  if (!vendor) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={step !== 'processing' ? (e => { if (e.target === e.currentTarget) onClose(); }) : undefined}
    >
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md flex flex-col max-h-[95vh] overflow-hidden" onClick={e => e.stopPropagation()}>

        {/* ===== HEADER ===== */}
        <div className="p-5 border-b flex justify-between items-start bg-gray-50 rounded-t-[2rem] flex-shrink-0">
          <div className="flex items-center">
            {step === 'payment' && (
              <button onClick={() => setStep('cart')} className="p-1.5 rounded-full hover:bg-gray-200 mr-2 transition-colors">
                <ArrowLeft className="w-4 h-4 text-gray-600" />
              </button>
            )}
            <div>
              <h2 className="text-xl font-black text-gray-900 font-heading">{vendor.name}</h2>
              <div className="flex items-center text-sm text-gray-500 mt-0.5 flex-wrap gap-2">
                <span>{vendor.type}</span>
                <span>•</span>
                <span className="flex items-center text-orange-600 font-bold"><Clock className="w-3.5 h-3.5 mr-1" /> {etaMins} mins</span>
                {vendor.distance != null && (
                  <>
                    <span>•</span>
                    <span className="text-blue-600 font-bold text-xs">
                      {vendor.distance >= 1000 ? `${(vendor.distance / 1000).toFixed(1)} km` : `${vendor.distance} m`}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          {step !== 'processing' && step !== 'success' && (
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 text-gray-500 transition-colors flex-shrink-0">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* ===== CART STEP ===== */}
        {step === 'cart' && (
          <>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {(() => {
                const groups = {};
                availableMenu.forEach(item => {
                  const cat = item.category || 'Menu';
                  if (!groups[cat]) groups[cat] = [];
                  groups[cat].push(item);
                });
                const cats = Object.keys(groups);
                if (cats.length === 0) return <div className="text-center py-8 text-gray-400">All menu items currently unavailable.</div>;
                return cats.map(cat => (
                  <div key={cat}>
                    <div className="flex items-center gap-2 mb-2 mt-1">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-100">{cat}</span>
                      <div className="flex-1 h-px bg-gray-200"></div>
                    </div>
                    <div className="space-y-2">
                      {groups[cat].map(item => (
                        <div key={item.id} className={`flex justify-between items-center p-3.5 border rounded-xl transition-all ${cart[item.id] ? 'border-orange-200 bg-orange-50/30' : 'border-gray-100 hover:border-gray-200'}`}>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-gray-900 text-sm truncate">{item.name}</p>
                            <p className="text-orange-600 font-bold text-sm">₹{item.price}</p>
                          </div>
                          <div className="flex items-center space-x-2 bg-gray-50 rounded-xl p-1 ml-3 flex-shrink-0">
                            <button disabled={!cart[item.id]} onClick={() => handleRemove(item)} className="p-1.5 rounded-lg text-gray-500 hover:bg-white hover:text-red-500 disabled:opacity-30 transition-all"><Minus className="w-3.5 h-3.5" /></button>
                            <span className="font-bold w-4 text-center text-sm">{cart[item.id] || 0}</span>
                            <button onClick={() => handleAdd(item)} className="p-1.5 rounded-lg text-gray-500 hover:bg-white hover:text-green-500 transition-all"><Plus className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}

              {itemTotal > 0 && (
                <div className="mt-8 border-t border-gray-100 pt-6">
                  <h3 className="font-black text-gray-800 mb-4">Delivery Details</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="flex items-center text-sm font-bold text-gray-700 mb-2"><MapPin className="w-4 h-4 mr-1.5 text-orange-500" />Delivery Address</label>
                      <textarea value={address} onChange={e => { setAddress(e.target.value); setAddressError(false); }} placeholder="E.g., Flat 402, Oakwood Apartments..." rows={2} className={`w-full border-2 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none ${addressError ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'}`} />
                      {addressError && <p className="text-red-500 text-xs mt-1 font-medium">Address is required</p>}
                    </div>
                    <div>
                      <label className="flex items-center text-sm font-bold text-gray-700 mb-2"><Phone className="w-4 h-4 mr-1.5 text-orange-500" />Phone Number</label>
                      <input type="tel" value={phone} onChange={e => { setPhone(e.target.value); setPhoneError(false); }} placeholder="Enter 10-digit number" className={`w-full border-2 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 ${phoneError ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'}`} />
                      {phoneError && <p className="text-red-500 text-xs mt-1 font-medium">Phone number is required</p>}
                    </div>
                    <div className="flex items-center p-3 bg-amber-50 border border-amber-100 rounded-xl">
                      <Truck className="w-5 h-5 text-amber-600 mr-3 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-amber-900">Estimated Delivery Time</p>
                        <p className="text-xs text-amber-700 font-medium">{etaMins} minutes from order confirmation</p>
                      </div>
                    </div>
                    <div className="flex items-start p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
                      <Info className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5 text-blue-500" />
                      <span className="font-medium">Your phone number and address will be shared with the delivery partner.</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {itemTotal > 0 && (
              <div className="p-5 border-t bg-gray-50 rounded-b-[2rem] flex-shrink-0">
                <div className="space-y-2 mb-4 text-sm font-medium text-gray-600">
                  <div className="flex justify-between"><span>Item Total</span><span>₹{itemTotal}</span></div>
                  <div className="flex justify-between"><span>Taxes & charges (5%)</span><span>₹{taxes}</span></div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center">Delivery Fee {currentUser?.streetVIP && <span className="ml-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">VIP</span>}</span>
                    {currentUser?.streetVIP ? <span className="text-green-600 font-bold">FREE <span className="line-through text-gray-400 text-xs ml-1 font-normal">₹{baseDelivery + Math.round((vendor.distance || 0) / 100)}</span></span> : <span>₹{deliveryFee}</span>}
                  </div>
                </div>
                {!currentUser?.streetVIP && (
                  <div className="mb-4 p-2.5 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-100 flex items-center text-xs">
                    <Award className="w-4 h-4 text-purple-600 mr-2 flex-shrink-0" />
                    <span className="text-purple-700 font-bold">Get StreetVIP for FREE delivery on all orders!</span>
                  </div>
                )}
                <div className="flex justify-between items-center mb-4 pt-3 border-t border-gray-200">
                  <span className="text-gray-800 font-black">Grand Total</span>
                  <span className="text-2xl font-black text-gray-900">₹{finalTotal}</span>
                </div>
                <button onClick={handleProceedToPayment} className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-orange-500 to-rose-500 hover:shadow-lg transition-all flex justify-center items-center shadow-md">
                  <ShoppingBag className="w-5 h-5 mr-2" /> Continue to Payment • ₹{finalTotal}
                </button>
              </div>
            )}
          </>
        )}

        {/* ===== PAYMENT METHOD STEP ===== */}
        {step === 'payment' && (
          <div className="flex-1 overflow-y-auto p-6">
            <h3 className="text-xl font-black text-gray-900 mb-1">Choose Payment</h3>
            <p className="text-sm text-gray-500 mb-6">Select how you'd like to pay for your order</p>

            {paymentError && (
              <div className="flex items-start p-4 bg-red-50 border border-red-200 rounded-2xl mb-5">
                <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm text-red-700">Payment Failed</p>
                  <p className="text-xs text-red-600 mt-0.5">{paymentError}</p>
                </div>
              </div>
            )}

            {/* Bill Summary */}
            <div className="bg-gray-50 rounded-2xl p-4 mb-6 border border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Order Summary</p>
              <div className="space-y-1.5 text-sm text-gray-600">
                <div className="flex justify-between"><span>Item Total</span><span>₹{itemTotal}</span></div>
                <div className="flex justify-between"><span>Taxes (5%)</span><span>₹{taxes}</span></div>
                <div className="flex justify-between"><span>Delivery</span><span>{currentUser?.streetVIP ? <span className="text-green-600 font-bold">FREE</span> : `₹${deliveryFee}`}</span></div>
                <div className="h-px bg-gray-200 my-2"></div>
                <div className="flex justify-between font-black text-gray-900 text-base">
                  <span>Total to Pay</span><span>₹{finalTotal}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {/* UPI */}
              <button
                onClick={handleUPI}
                className="w-full p-5 rounded-2xl border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 hover:border-indigo-400 hover:shadow-md transition-all flex items-center group"
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center mr-4 group-hover:scale-105 transition-transform shadow-lg shadow-indigo-500/25">
                  <Smartphone className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-black text-gray-900">Pay via UPI</p>
                  <p className="text-xs text-gray-500 mt-0.5">Google Pay, PhonePe, Paytm & more</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-indigo-700">₹{finalTotal}</p>
                  <span className="text-[10px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">INSTANT</span>
                </div>
              </button>

              {/* COD */}
              <button
                onClick={handleCOD}
                className="w-full p-5 rounded-2xl border-2 border-gray-200 bg-white hover:border-gray-400 hover:shadow-md transition-all flex items-center group"
              >
                <div className="w-12 h-12 rounded-2xl bg-gray-900 flex items-center justify-center mr-4 group-hover:scale-105 transition-transform shadow-lg">
                  <Banknote className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-black text-gray-900">Cash on Delivery</p>
                  <p className="text-xs text-gray-500 mt-0.5">Pay cash when your order arrives</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-gray-900">₹{finalTotal}</p>
                  <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">COD</span>
                </div>
              </button>
            </div>

            <p className="text-[10px] text-gray-400 text-center mt-6 flex items-center justify-center">
              <span className="w-4 h-px bg-gray-200 mr-2"></span>
              Secured by Razorpay · SSL Encrypted
              <span className="w-4 h-px bg-gray-200 ml-2"></span>
            </p>
          </div>
        )}

        {/* ===== PROCESSING STEP ===== */}
        {step === 'processing' && (
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
              <Loader className="w-10 h-10 text-indigo-600 animate-spin" />
            </div>
            <h3 className="font-black text-xl text-gray-900 mb-2">Processing Payment</h3>
            <p className="text-gray-500 text-sm">Please complete the payment in the Razorpay window. Do not close this page.</p>
          </div>
        )}

        {/* ===== SUCCESS STEP ===== */}
        {step === 'success' && (
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6 animate-in zoom-in duration-300">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="font-black text-xl text-gray-900 mb-2">Order Placed! 🎉</h3>
            <p className="text-gray-600 text-sm mb-1">Your order at <span className="font-bold">{vendor.name}</span> has been confirmed.</p>
            {paymentId && <p className="text-[10px] text-gray-400 font-mono mt-2">Payment ID: {paymentId}</p>}
            <p className="text-xs text-gray-500 mt-1">Estimated delivery: <span className="font-bold text-orange-600">{etaMins} mins</span></p>
            <div className="mt-6 space-y-3 w-full">
              <button onClick={onClose} className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-orange-500 to-rose-500 shadow-md hover:shadow-lg transition-all">
                Track My Order
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default OrderModal;
