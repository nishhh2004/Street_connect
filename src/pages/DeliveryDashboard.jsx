import React, { useContext, useState, useRef, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import { useTranslation } from '../context/LanguageContext';
import { MapPin, Navigation, Clock, CheckCircle, Phone, List, User, HelpCircle, LogOut, ChevronDown, Package, Bike, ShoppingBag } from 'lucide-react';
import MapComponent from '../components/MapComponent';
import HelpSupport from '../components/HelpSupport';
import { useNavigate } from 'react-router-dom';

function DeliveryDashboard() {
  const { orders, vendors, updateOrderStatus, currentUser, logout } = useContext(AppContext);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Stable fake location — computed ONCE from rider ID, stored in ref (NEVER changes)
  const stableLocation = useMemo(() => {
    const seed = (currentUser?.id || 'rider').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return {
      lat: 12.9716 + ((seed % 100) - 50) * 0.001,
      lng: 77.5946 + ((seed % 77) - 38) * 0.001,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]); // Only recompute if user changes

  // Rider's active order — PERSISTED in localStorage so it survives logout/refresh
  const storageKey = `streetconnect_rider_order_${currentUser?.id}`;
  const [myOrderId, setMyOrderIdState] = useState(() => {
    try { return localStorage.getItem(storageKey) || null; } catch { return null; }
  });

  const setMyOrderId = (id) => {
    setMyOrderIdState(id);
    try {
      if (id) localStorage.setItem(storageKey, id);
      else localStorage.removeItem(storageKey);
    } catch {}
  };

  const myOrder = myOrderId ? orders.find(o => o.id === myOrderId) : null;

  // If myOrder was delivered or doesn't exist anymore, clear it
  React.useEffect(() => {
    if (myOrderId && (!myOrder || myOrder.status === 'delivered')) {
      setMyOrderId(null);
    }
  }, [myOrderId, myOrder]);

  // Available new requests
  const availableRequests = orders.filter(o => o.status === 'ready');
  const getVendor = (vendorId) => vendors.find(v => v.id === vendorId);

  // Step 1: Accept order — rider heads to restaurant
  const handleAccept = (order) => {
    updateOrderStatus(order.id, 'picked_up');
    setMyOrderId(order.id);
  };

  // Step 2: Collected from restaurant — rider heads to customer
  const handleCollected = () => {
    if (!myOrder) return;
    updateOrderStatus(myOrder.id, 'out_for_delivery');
  };

  // Step 3: Delivered to customer
  const handleDelivered = () => {
    if (!myOrder) return;
    updateOrderStatus(myOrder.id, 'delivered');
    setMyOrderId(null);
  };

  const handleLogout = () => {
    // Do NOT clear myOrderId on logout — it's in localStorage and will restore on next login
    logout();
    navigate('/login');
  };

  const vendor = myOrder ? getVendor(myOrder.vendorId) : null;

  const { riderLocations } = useContext(AppContext);
  const activeRiderLoc = myOrder ? riderLocations[myOrder.id] || stableLocation : stableLocation;
  
  // Real-time map center tracking rider
  const mapCenter = useMemo(() => {
    if (myOrder && activeRiderLoc) return [activeRiderLoc.lat, activeRiderLoc.lng];
    return [stableLocation.lat, stableLocation.lng];
  }, [stableLocation, myOrder, activeRiderLoc]);

  const currentStep = myOrder?.status === 'picked_up' ? 1
    : myOrder?.status === 'out_for_delivery' ? 2
    : null;

  const trackingMarkers = useMemo(() => {
    if (!myOrder || !vendor) return null;
    return {
      vendor: { lat: vendor.lat, lng: vendor.lng, name: vendor.name },
      customer: { lat: myOrder.customerLat || 12.9735, lng: myOrder.customerLng || 77.5960 },
      rider: { lat: activeRiderLoc.lat, lng: activeRiderLoc.lng },
      orderId: myOrder.id,
      status: myOrder.status
    };
  }, [myOrder, vendor, activeRiderLoc]);

  return (
    <div className="absolute inset-0 w-full h-full z-0 overflow-hidden bg-gray-50 flex flex-col md:flex-row pt-0">

      {/* Rider Header */}
      <div className="absolute top-6 right-6 z-40">
        <div className="relative">
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center space-x-2 bg-white/90 backdrop-blur-md px-4 py-3 rounded-full shadow-lg border border-gray-200 hover:border-indigo-300 transition-all font-bold text-sm text-gray-800"
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white bg-indigo-600">
              <User className="w-4 h-4" />
            </div>
            <span>{currentUser?.name || 'Rider'}</span>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </button>

          {showProfile && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)}></div>
              <div className="absolute right-0 mt-3 w-64 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                <div className="p-6 bg-indigo-50 border-b border-indigo-100">
                  <h3 className="font-black text-gray-900">{currentUser?.name}</h3>
                  <p className="text-xs text-indigo-600 font-bold mt-1 tracking-widest uppercase">Active Courier</p>
                  <p className="text-[10px] text-gray-500 mt-1">📍 {activeRiderLoc.lat.toFixed(4)}, {activeRiderLoc.lng.toFixed(4)}</p>
                </div>
                <div className="p-2 space-y-1">
                  <button onClick={() => { setShowProfile(false); setShowHelp(true); }} className="w-full flex items-center px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 rounded-xl transition-colors">
                    <HelpCircle className="w-4 h-4 mr-3 text-indigo-500" /> Help & Support
                  </button>
                  <div className="h-px bg-gray-100 my-1"></div>
                  <button onClick={handleLogout} className="w-full flex items-center px-4 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors">
                    <LogOut className="w-4 h-4 mr-3" /> Logout
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {showHelp && <HelpSupport onClose={() => setShowHelp(false)} role="delivery" />}

      {/* Side Panel */}
      <div className="w-full md:w-[450px] flex flex-col bg-white shadow-2xl z-10 flex-shrink-0 md:h-screen rounded-none md:border-r border-gray-100">
        
        <div className="p-8 pb-6 border-b border-gray-100 bg-gradient-to-br from-indigo-50 to-white pt-10 md:pt-8 flex-shrink-0">
          <div className="flex items-center space-x-2 mb-3">
            <span className="bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase">Courier App</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase ${myOrder ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
              {myOrder ? '● On Delivery' : '● Online'}
            </span>
          </div>
          <h2 className="text-3xl font-black text-gray-900 font-heading">
            {myOrder ? 'Active Delivery' : 'Live Requests'}
          </h2>
          <p className="text-gray-500 font-medium text-sm mt-1">
            {myOrder ? 'Complete your current delivery' : 'Accept and deliver orders'}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/50">

          {/* ===== ACTIVE DELIVERY VIEW ===== */}
          {myOrder && (
            <div className="space-y-4">
              
              {/* Progress Steps */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Delivery Progress</p>
                <div className="flex items-center">
                  <div className="flex-1 text-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-1 ${currentStep >= 1 ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                      <Bike className="w-5 h-5" />
                    </div>
                    <p className="text-[10px] font-bold text-gray-500">Head to<br/>Restaurant</p>
                  </div>
                  <div className={`h-1 flex-1 rounded mx-1 ${currentStep >= 2 ? 'bg-indigo-400' : 'bg-gray-200'}`}></div>
                  <div className="flex-1 text-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-1 ${currentStep >= 2 ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <p className="text-[10px] font-bold text-gray-500">Order<br/>Collected</p>
                  </div>
                  <div className="h-1 flex-1 rounded mx-1 bg-gray-200"></div>
                  <div className="flex-1 text-center">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-1 bg-gray-100 text-gray-400">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <p className="text-[10px] font-bold text-gray-500">Delivered<br/>to Customer</p>
                  </div>
                </div>
              </div>

              {/* Order Info Card */}
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden text-white">
                <div className="absolute top-0 right-0 bg-gradient-to-r from-orange-400 to-orange-500 text-white text-[10px] tracking-widest font-bold px-4 py-1.5 rounded-bl-2xl">
                  {currentStep === 1 ? '🛵 HEADING TO RESTAURANT' : '🚀 OUT FOR DELIVERY'}
                </div>

                <div className="mb-5 mt-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Pick Up From</p>
                  <p className="font-bold text-lg">{vendor?.name}</p>
                  <p className="text-sm text-gray-400 mt-0.5">📍 {vendor?.address}</p>
                </div>

                <div className="bg-gray-800/80 p-3 rounded-xl mb-5">
                  <p className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-widest flex items-center">
                    <List className="w-3 h-3 mr-1" /> Items
                  </p>
                  <ul className="space-y-1">
                    {myOrder.items.map((it, idx) => (
                      <li key={idx} className="text-sm font-medium">
                        <span className="text-orange-400 bg-orange-400/10 px-1.5 rounded mr-2">{it.qty}x</span>{it.name}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mb-5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Deliver To</p>
                  <p className="font-bold text-base">{myOrder.customerName || 'Customer'}</p>
                  <p className="text-sm text-gray-300 mt-0.5">📍 {myOrder.deliveryAddress}</p>
                  {myOrder.customerPhone && (
                    <div className="flex items-center mt-2 bg-gray-700 px-3 py-1.5 rounded-lg border border-gray-600 w-fit">
                      <Phone className="w-4 h-4 mr-2 text-green-400" />
                      <span className="font-bold text-sm">{myOrder.customerPhone}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center border-t border-gray-700 pt-4 mb-5">
                  <p className="text-sm font-bold text-gray-400">Cash to Collect</p>
                  <p className="font-black text-2xl text-white">₹{myOrder.paymentMethod === 'UPI' ? '0 (Paid Online)' : myOrder.total}</p>
                </div>

                {currentStep === 1 && (
                  <button
                    onClick={handleCollected}
                    className="w-full bg-gradient-to-r from-orange-400 to-amber-500 hover:from-orange-500 hover:to-amber-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center transition-all shadow-lg transform hover:-translate-y-0.5"
                  >
                    <ShoppingBag className="w-5 h-5 mr-2" /> Order Collected from Restaurant ✓
                  </button>
                )}
                {currentStep === 2 && (
                  <button
                    onClick={handleDelivered}
                    className="w-full bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center transition-all shadow-lg transform hover:-translate-y-0.5"
                  >
                    <CheckCircle className="w-5 h-5 mr-2" /> Delivered to Customer ✓
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ===== AVAILABLE REQUESTS ===== */}
          {!myOrder && (
            availableRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center p-8 min-h-48">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                  <Clock className="w-10 h-10 text-gray-300" />
                </div>
                <p className="font-bold text-xl text-gray-900 font-heading">No Active Requests</p>
                <p className="text-gray-500 font-medium text-sm mt-2">Stay online. New delivery requests will appear here.</p>
              </div>
            ) : (
              availableRequests.map((order) => {
                const v = getVendor(order.vendorId);
                return (
                  <div key={order.id} className="bg-white border-2 hover:border-indigo-200 rounded-[2rem] p-6 shadow-sm hover:shadow-xl transition-all duration-300 group">
                    <div className="flex justify-between items-start mb-5">
                      <div>
                        <h4 className="font-black text-gray-900 text-lg font-heading">#{order.id.slice(-4).toUpperCase()}</h4>
                        <p className="text-xs font-bold text-gray-500 mt-1">{order.items.length} Items • ₹{order.total}</p>
                      </div>
                      <span className="bg-indigo-50 text-indigo-600 border border-indigo-100 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">Ready</span>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-start">
                        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0"><MapPin className="w-4 h-4 text-orange-600" /></div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Restaurant</p>
                          <p className="font-bold text-gray-800">{v?.name}</p>
                          <p className="text-xs text-gray-500">{v?.address}</p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0"><Navigation className="w-4 h-4 text-green-600" /></div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Deliver To</p>
                          <p className="font-bold text-gray-800">{order.customerName || 'Customer'}</p>
                          <p className="text-sm font-medium text-gray-600">{order.deliveryAddress}</p>
                          {order.customerPhone && <p className="text-xs font-bold text-gray-500">📞 {order.customerPhone}</p>}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center">
                        <Package className="w-3 h-3 mr-1" /> Items
                      </p>
                      {order.items.map((it, idx) => (
                        <p key={idx} className="text-xs font-medium text-gray-700">
                          <span className="font-bold text-indigo-600 mr-1">{it.qty}x</span>{it.name}
                        </p>
                      ))}
                    </div>

                    <div className="flex justify-between items-center border-t border-gray-100 pt-5 mt-5">
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Est. Payout</p>
                        <p className="font-black text-xl text-gray-900">₹{Math.round(order.total * 0.15 + 20)}</p>
                      </div>
                      <button
                        onClick={() => handleAccept(order)}
                        className="bg-gray-900 hover:bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-md transition-colors"
                      >
                        Accept Run
                      </button>
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>
      </div>

      {/* Map — uses stable mapCenter so it never re-flies on vendor poll */}
      <div className="flex-1 relative bg-gray-100 z-0">
        {trackingMarkers ? (
          <MapComponent
            center={mapCenter}
            vendors={[]}
            trackingMarkers={trackingMarkers}
          />
        ) : (
          <MapComponent
            center={mapCenter}
            vendors={vendors.filter(v => v.isOpen)}
            onVendorSelect={() => {}}
          />
        )}
      </div>
    </div>
  );
}

export default DeliveryDashboard;
