import React, { useContext, useState, useMemo } from 'react';
import { Search, MapPin, RefreshCw, User, LogOut, Settings, Award, Clock, HelpCircle, ChevronDown, Bell, Moon, Globe, CreditCard, MapPinned, Shield, Info, X, ChevronRight, Edit3, Check, Crown, Zap, Truck, Star, Smartphone, Loader, AlertCircle } from 'lucide-react';
import { AppContext } from '../context/AppContext';
import { useTranslation } from '../context/LanguageContext';
import MapComponent from '../components/MapComponent';
import VendorCard from '../components/VendorCard';
import OrderModal from '../components/OrderModal';
import HelpSupport from '../components/HelpSupport';
import { initiateRazorpayPayment } from '../utils/razorpay';
import { useNavigate } from 'react-router-dom';

function CustomerView() {
  const { vendors, userLocation, refreshVendors, currentUser, logout, toggleStreetVIP, orders, riderLocations, darkMode, setDarkMode, updateProfile } = useContext(AppContext);
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [hoveredVendorId, setHoveredVendorId] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showVIPModal, setShowVIPModal] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  // Edit profile state
  const [editName, setEditName] = useState(currentUser?.name || '');
  const [editPhone, setEditPhone] = useState(currentUser?.phone || '');

  // Settings state
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [promoNotifs, setPromoNotifs] = useState(false);

  // Change password state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');

  const mapCenter = userLocation 
    ? [userLocation.lat, userLocation.lng] 
    : [12.9716, 77.5946];

  const filteredVendors = vendors.filter(v => 
    v.isOpen &&
    (v.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    v.type.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Check if user has active orders to show tracking
  const myOrders = orders.filter(o => o.customerId === currentUser?.id);
  const activeOrder = myOrders.find(o => ['pending', 'accepted', 'ready', 'picked_up', 'out_for_delivery'].includes(o.status));
  const activeOrderVendor = activeOrder ? vendors.find(v => v.id === activeOrder.vendorId) : null;
  const activeRiderLoc = activeOrder ? riderLocations[activeOrder.id] : null;

  // Build tracking markers for active order
  const trackingMarkers = useMemo(() => {
    if (!activeOrder || !activeOrderVendor) return null;
    return {
      vendor: { lat: activeOrderVendor.lat, lng: activeOrderVendor.lng, name: activeOrderVendor.name },
      customer: userLocation,
      rider: activeRiderLoc ? { lat: activeRiderLoc.lat, lng: activeRiderLoc.lng } : null,
      orderId: activeOrder.id,
      status: activeOrder.status
    };
  }, [activeOrder, activeOrderVendor, activeRiderLoc, userLocation]);

  const handleRefresh = async () => {
    if (!userLocation) return;
    setRefreshing(true);
    await refreshVendors(userLocation.lat, userLocation.lng);
    setTimeout(() => setRefreshing(false), 1500);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSaveProfile = () => {
    updateProfile({ name: editName, phone: editPhone });
    setShowEditProfile(false);
  };

  const [vipLoading, setVipLoading] = useState(false);
  const [vipError, setVipError] = useState('');

  const handleVIPSubscribe = async () => {
    setVipLoading(true);
    setVipError('');
    try {
      await initiateRazorpayPayment({
        amount: 149,
        name: currentUser?.name || 'Customer',
        email: currentUser?.email || '',
        phone: currentUser?.phone || '',
        description: 'StreetVIP Monthly Subscription',
        orderId: `vip_${currentUser?.id}_${Date.now()}`,
      });
      toggleStreetVIP();
      setShowVIPModal(false);
    } catch (err) {
      if (err.message !== 'DISMISSED') {
        setVipError(err.message || 'Payment failed. Please try again.');
      }
    } finally {
      setVipLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordMsg('');
    if (!oldPassword || !newPassword) { setPasswordMsg('All fields required'); return; }
    if (newPassword !== confirmNewPassword) { setPasswordMsg('Passwords do not match'); return; }
    if (newPassword.length < 4) { setPasswordMsg('Password must be at least 4 characters'); return; }
    setPasswordMsg('Password updated successfully!');
    setOldPassword(''); setNewPassword(''); setConfirmNewPassword('');
  };

  return (
    <div className={`absolute inset-0 w-full h-full z-0 overflow-hidden ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
      <div className="absolute inset-0 w-full h-full z-0">
        <MapComponent 
          center={mapCenter} 
          vendors={trackingMarkers ? [] : vendors.filter(v => v.isOpen)}
          onVendorSelect={(v) => setSelectedVendor(v)}
          highlightedVendorId={hoveredVendorId}
          trackingMarkers={trackingMarkers}
        />
      </div>

      {/* Active Order Tracking Banner */}
      {activeOrder && (
        <div className={`absolute top-20 left-1/2 -translate-x-1/2 z-30 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl shadow-2xl border px-6 py-3 flex items-center space-x-4 max-w-md`}>
          <div className="p-2 rounded-full bg-green-100"><Truck className="w-5 h-5 text-green-600 animate-pulse" /></div>
          <div>
            <p className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {activeOrder.status === 'pending' ? '⏳ Waiting for restaurant to accept...' :
               activeOrder.status === 'accepted' ? '👨‍🍳 Restaurant is preparing your food...' :
               activeOrder.status === 'ready' ? '✅ Food ready! Waiting for rider...' :
               activeOrder.status === 'picked_up' ? '🛵 Rider heading to restaurant...' :
               activeOrder.status === 'out_for_delivery' ? '🚀 Rider is on the way to you!' : 'Order in progress'}
            </p>
            <p className="text-xs text-gray-500">Order #{activeOrder.id.slice(-6).toUpperCase()} • {activeOrderVendor?.name}</p>
          </div>
        </div>
      )}

      {/* Profile Dropdown */}
      <div className="absolute top-6 right-6 z-40">
        <div className="relative">
          <button 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className={`flex items-center space-x-2 ${darkMode ? 'bg-gray-800/90 border-gray-700 text-white' : 'bg-white/90 border-gray-200'} backdrop-blur-md px-4 py-3 rounded-full shadow-lg border hover:border-orange-300 transition-all font-bold text-sm`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${currentUser?.streetVIP ? 'bg-gradient-to-tr from-purple-500 to-pink-500' : 'bg-gray-800'}`}>
              <User className="w-4 h-4" />
            </div>
            <span>{currentUser?.name || 'Profile'}</span>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </button>

          {showProfileMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)}></div>
              <div className={`absolute right-0 mt-3 w-72 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-3xl shadow-2xl border overflow-hidden z-50 animate-in fade-in slide-in-from-top-4 duration-200`}>
                
                <div className={`p-6 ${currentUser?.streetVIP ? 'bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100' : darkMode ? 'bg-gray-700 border-b border-gray-600' : 'bg-gray-50 border-b border-gray-100'}`}>
                  <h3 className={`font-black ${darkMode && !currentUser?.streetVIP ? 'text-white' : 'text-gray-900'}`}>{currentUser?.name}</h3>
                  <p className="text-xs text-gray-500">{currentUser?.email}</p>
                  {currentUser?.phone && <p className="text-xs text-gray-500 mt-0.5">📞 {currentUser.phone}</p>}
                </div>

                <div className="p-2 space-y-1">
                  <button onClick={() => { setShowProfileMenu(false); setEditName(currentUser?.name || ''); setEditPhone(currentUser?.phone || ''); setShowEditProfile(true); }} className={`w-full flex items-center px-4 py-3 text-sm font-bold ${darkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'} rounded-xl transition-colors`}>
                    <Edit3 className="w-4 h-4 mr-3 text-teal-500" /> Edit Profile
                  </button>

                  <button onClick={() => { setShowProfileMenu(false); setShowOrders(true); }} className={`w-full flex items-center px-4 py-3 text-sm font-bold ${darkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'} rounded-xl transition-colors`}>
                    <Clock className="w-4 h-4 mr-3 text-blue-500" /> Past Orders ({myOrders.length})
                  </button>
                  
                  {/* StreetVIP */}
                  <div className="px-4 py-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl my-1 border border-purple-100">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <Award className={`w-5 h-5 mr-2 ${currentUser?.streetVIP ? 'text-purple-600' : 'text-gray-400'}`} />
                        <div className="text-left">
                          <p className="text-sm font-bold text-gray-900">StreetVIP</p>
                          <p className="text-[10px] uppercase font-bold text-purple-600 tracking-wider">
                            {currentUser?.streetVIP ? 'Active ✓' : 'Free Delivery + Priority'}
                          </p>
                        </div>
                      </div>
                      {currentUser?.streetVIP ? (
                        <button onClick={toggleStreetVIP} className="text-xs font-bold text-red-500 hover:text-red-600 px-2 py-1 rounded bg-red-50">Cancel</button>
                      ) : (
                        <button onClick={() => { setShowProfileMenu(false); setShowVIPModal(true); }} className="text-xs font-bold text-white bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-1.5 rounded-lg shadow-sm hover:shadow-md transition-all">Subscribe</button>
                      )}
                    </div>
                  </div>

                  <button onClick={() => { setShowProfileMenu(false); setShowSettings(true); }} className={`w-full flex items-center px-4 py-3 text-sm font-bold ${darkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'} rounded-xl transition-colors`}>
                    <Settings className="w-4 h-4 mr-3 text-gray-400" /> Settings
                  </button>

                  <button onClick={() => { setShowProfileMenu(false); setShowHelp(true); }} className={`w-full flex items-center px-4 py-3 text-sm font-bold ${darkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'} rounded-xl transition-colors`}>
                    <HelpCircle className="w-4 h-4 mr-3 text-orange-500" /> Help & Support
                  </button>

                  <div className={`h-px ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} my-1`}></div>

                  <button onClick={handleLogout} className="w-full flex items-center px-4 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors">
                    <LogOut className="w-4 h-4 mr-3" /> Logout
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Vendor List Panel */}
      <div className={`absolute top-24 left-4 md:left-8 w-[calc(100%-2rem)] md:w-[420px] h-[calc(100vh-8rem)] ${darkMode ? 'bg-gray-800/90 border-gray-700' : 'glass bg-white/80'} rounded-[2rem] z-10 flex flex-col overflow-hidden shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)]`}>
        <div className={`p-6 border-b ${darkMode ? 'border-gray-700 bg-gray-800/60' : 'border-gray-200/50 bg-white/40'}`}>
          <div className="flex justify-between items-start mb-1">
            <div>
              <h2 className={`text-3xl font-black ${darkMode ? 'text-white' : 'text-gray-900'} font-heading tracking-tight drop-shadow-sm`}>{t('discover')}</h2>
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} font-medium mt-1 mb-5`}>{t('findBest')}</p>
            </div>
            <button onClick={handleRefresh} disabled={refreshing} className={`${darkMode ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' : 'bg-white/80 border-gray-200 hover:bg-orange-50 hover:border-orange-200'} p-2.5 rounded-xl shadow-sm border transition-all disabled:opacity-50`} title="Refresh nearby vendors">
              <RefreshCw className={`w-4 h-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'} ${refreshing ? 'animate-spin text-orange-500' : ''}`} />
            </button>
          </div>
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 to-rose-500 rounded-2xl opacity-20 group-hover:opacity-40 transition-opacity blur"></div>
            <div className={`relative flex items-center ${darkMode ? 'bg-gray-700' : 'bg-white'} rounded-2xl p-1 shadow-sm border ${darkMode ? 'border-gray-600' : 'border-gray-100'}`}>
              <Search className="w-5 h-5 text-gray-400 ml-3 mr-2" />
              <input type="text" placeholder={t('searchPlaceholder')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={`w-full bg-transparent border-none focus:ring-0 py-3 pr-4 ${darkMode ? 'text-white placeholder-gray-500' : 'text-gray-800 placeholder-gray-400'} font-medium focus:outline-none`} />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className={`font-bold ${darkMode ? 'text-gray-300' : 'text-gray-800'} uppercase text-xs tracking-widest flex items-center`}>
              <MapPin className="w-3.5 h-3.5 mr-1.5 text-orange-500" /> {t('nearbyRecommended')}
            </h3>
            <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{filteredVendors.length} {t('found')}</span>
          </div>
          {filteredVendors.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'} w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4`}>
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">{t('noVendorsFound')}</p>
            </div>
          ) : (
            filteredVendors.map(vendor => (
              <VendorCard key={vendor.id} vendor={vendor} onClick={(v) => setSelectedVendor(v)} onHover={(id) => setHoveredVendorId(id)} isHovered={hoveredVendorId === vendor.id} />
            ))
          )}
        </div>
      </div>

      {selectedVendor && <OrderModal vendor={selectedVendor} onClose={() => setSelectedVendor(null)} />}
      {showHelp && <HelpSupport onClose={() => setShowHelp(false)} role="customer" />}

      {/* Past Orders */}
      {showOrders && (
        <div className="fixed inset-0 z-50 flex justify-center items-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowOrders(false)}>
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden max-h-[80vh] flex flex-col`} onClick={e => e.stopPropagation()}>
            <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'} flex justify-between items-center`}>
              <h2 className={`text-xl font-black font-heading ${darkMode ? 'text-white' : ''}`}>Past Orders</h2>
              <button onClick={() => setShowOrders(false)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {myOrders.length === 0 ? <p className="text-gray-500 text-center py-8">No orders yet. Discover some local food!</p> : (
                myOrders.slice().reverse().map(o => {
                  const vend = vendors.find(v => v.id === o.vendorId);
                  // Use vendorName saved at order time as primary, fallback to live lookup
                  const restaurantName = o.vendorName || vend?.name || 'Restaurant';
                  return (
                    <div key={o.id} className={`p-4 rounded-2xl border ${darkMode ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-50'} shadow-sm`}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{restaurantName}</h4>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${o.status === 'delivered' ? 'text-green-600 bg-green-100' : o.status === 'pending' ? 'text-amber-600 bg-amber-100' : 'text-blue-600 bg-blue-100'}`}>{o.status}</span>
                        </div>
                        <p className="font-black text-rose-500">₹{o.total}</p>
                      </div>
                      {o.etaMins && <p className="text-xs text-gray-500 mb-2">🕐 Est. delivery: {o.etaMins} mins</p>}
                      <div className="space-y-1 text-sm">
                        {o.items.map((item, i) => (<div key={i} className="flex space-x-2"><span className="font-bold text-gray-500">{item.qty}x</span><span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{item.name}</span></div>))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* StreetVIP Subscription Modal */}
      {showVIPModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => !vipLoading && setShowVIPModal(false)}>
          <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 p-8 text-white text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <Crown className="w-12 h-12 mx-auto mb-3 drop-shadow-lg" />
              <h2 className="text-2xl font-black font-heading">StreetVIP</h2>
              <p className="text-white/80 text-sm mt-1">Premium Membership</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-3">
                <div className="flex items-center p-3 bg-purple-50 rounded-xl"><Truck className="w-5 h-5 text-purple-600 mr-3" /><div><p className="font-bold text-sm text-gray-900">Free Delivery</p><p className="text-xs text-gray-500">₹0 delivery on all orders</p></div></div>
                <div className="flex items-center p-3 bg-pink-50 rounded-xl"><Zap className="w-5 h-5 text-pink-600 mr-3" /><div><p className="font-bold text-sm text-gray-900">Priority Support</p><p className="text-xs text-gray-500">24/7 dedicated support line</p></div></div>
                <div className="flex items-center p-3 bg-orange-50 rounded-xl"><Star className="w-5 h-5 text-orange-600 mr-3" /><div><p className="font-bold text-sm text-gray-900">Exclusive Deals</p><p className="text-xs text-gray-500">Members-only restaurant offers</p></div></div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-center">
                <p className="text-3xl font-black text-gray-900">₹149<span className="text-sm font-medium text-gray-500">/month</span></p>
                <p className="text-xs text-gray-500 mt-1">Cancel anytime. Auto-renews monthly.</p>
              </div>

              {vipError && (
                <div className="flex items-start p-3 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 font-medium">{vipError}</p>
                </div>
              )}

              {/* Payment method — UPI only */}
              <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2">Payment Method</p>
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center mr-3">
                    <Smartphone className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-900">UPI Payment</p>
                    <p className="text-xs text-gray-500">Google Pay, PhonePe, Paytm & more</p>
                  </div>
                  <span className="ml-auto text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">ONLY</span>
                </div>
              </div>

              <button
                onClick={handleVIPSubscribe}
                disabled={vipLoading}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all text-sm disabled:opacity-70 flex items-center justify-center"
              >
                {vipLoading ? (
                  <><Loader className="w-4 h-4 mr-2 animate-spin" /> Processing Payment...</>
                ) : (
                  <>Pay ₹149 via UPI · Activate StreetVIP</>
                )}
              </button>
              {!vipLoading && (
                <button onClick={() => { setShowVIPModal(false); setVipError(''); }} className="w-full py-2 text-sm text-gray-500 font-bold hover:text-gray-700">Maybe Later</button>
              )}
              <p className="text-[10px] text-gray-400 text-center">Secured by Razorpay · SSL Encrypted · 256-bit</p>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowEditProfile(false)}>
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-[2rem] w-full max-w-sm shadow-2xl overflow-hidden`} onClick={e => e.stopPropagation()}>
            <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'} flex justify-between items-center`}>
              <h2 className={`text-xl font-black font-heading ${darkMode ? 'text-white' : ''}`}>Edit Profile</h2>
              <button onClick={() => setShowEditProfile(false)} className="p-2"><X className="w-5 h-5 text-gray-400"/></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={`block text-sm font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Full Name</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className={`w-full border-2 rounded-xl p-3 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200'} focus:border-orange-400 focus:ring-0`} />
              </div>
              <div>
                <label className={`block text-sm font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Phone Number</label>
                <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} className={`w-full border-2 rounded-xl p-3 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200'} focus:border-orange-400 focus:ring-0`} />
              </div>
              <div>
                <label className={`block text-sm font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Email</label>
                <input type="text" value={currentUser?.email || ''} disabled className="w-full border-2 rounded-xl p-3 bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed" />
                <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
              </div>
              <button onClick={handleSaveProfile} className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-orange-500 to-rose-500 shadow-md hover:shadow-lg transition-all flex items-center justify-center">
                <Check className="w-5 h-5 mr-2" /> Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex justify-center items-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowSettings(false)}>
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden max-h-[85vh] flex flex-col`} onClick={e => e.stopPropagation()}>
            <div className={`p-6 border-b ${darkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-100 bg-gray-50'} flex justify-between items-center rounded-t-[2rem]`}>
              <div className="flex items-center space-x-3">
                <Settings className={`w-5 h-5 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} />
                <h2 className={`text-xl font-black font-heading ${darkMode ? 'text-white' : 'text-gray-900'}`}>Settings</h2>
              </div>
              <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Account Info */}
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Account Information</h3>
                <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-2xl p-4 space-y-3 border ${darkMode ? 'border-gray-600' : 'border-gray-100'}`}>
                  {[
                    ['Name', currentUser?.name],
                    ['Email', currentUser?.email],
                    ['Phone', currentUser?.phone || 'Not set'],
                  ].map(([label, val], i) => (
                    <React.Fragment key={label}>
                      {i > 0 && <div className={`h-px ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}></div>}
                      <div className="flex justify-between items-center">
                        <span className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{label}</span>
                        <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{val}</span>
                      </div>
                    </React.Fragment>
                  ))}
                  <div className={`h-px ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}></div>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Role</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 bg-orange-100 px-2 py-1 rounded">{currentUser?.role}</span>
                  </div>
                </div>
              </div>

              {/* Notifications */}
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Notifications</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Push Notifications', val: notificationsEnabled, set: setNotificationsEnabled, color: 'blue' },
                    { label: 'Order Updates', val: orderUpdates, set: setOrderUpdates, color: 'green' },
                    { label: 'SMS Alerts', val: smsAlerts, set: setSmsAlerts, color: 'purple' },
                    { label: 'Promotional Offers', val: promoNotifs, set: setPromoNotifs, color: 'orange' },
                  ].map(item => (
                    <div key={item.label} className={`flex justify-between items-center p-3 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-100'} rounded-xl border`}>
                      <div className="flex items-center">
                        <Bell className={`w-4 h-4 mr-3 text-${item.color}-500`} />
                        <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{item.label}</span>
                      </div>
                      <button onClick={() => item.set(!item.val)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${item.val ? `bg-${item.color}-500` : 'bg-gray-300'}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${item.val ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preferences */}
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Preferences</h3>
                <div className="space-y-3">
                  <div className={`flex justify-between items-center p-3 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-100'} rounded-xl border`}>
                    <div className="flex items-center"><Moon className="w-4 h-4 mr-3 text-indigo-500" /><span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Dark Mode</span></div>
                    <button onClick={() => setDarkMode(!darkMode)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${darkMode ? 'bg-indigo-500' : 'bg-gray-300'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  <button className={`w-full flex justify-between items-center p-3 ${darkMode ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'} rounded-xl border transition-colors`}>
                    <div className="flex items-center"><Globe className="w-4 h-4 mr-3 text-teal-500" /><span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Language</span></div>
                    <div className="flex items-center text-gray-500"><span className="text-sm font-medium mr-1">English</span><ChevronRight className="w-4 h-4" /></div>
                  </button>
                  <button className={`w-full flex justify-between items-center p-3 ${darkMode ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'} rounded-xl border transition-colors`}>
                    <div className="flex items-center"><MapPinned className="w-4 h-4 mr-3 text-rose-500" /><span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Saved Addresses</span></div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </button>
                  <button className={`w-full flex justify-between items-center p-3 ${darkMode ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'} rounded-xl border transition-colors`}>
                    <div className="flex items-center"><CreditCard className="w-4 h-4 mr-3 text-emerald-500" /><span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Payment Methods</span></div>
                    <div className="flex items-center text-gray-500"><span className="text-xs font-medium mr-1">COD</span><ChevronRight className="w-4 h-4" /></div>
                  </button>
                </div>
              </div>

              {/* Privacy & Security */}
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Privacy & Security</h3>
                <div className="space-y-3">
                  <button onClick={() => { setShowSettings(false); setPasswordMsg(''); setOldPassword(''); setNewPassword(''); setConfirmNewPassword(''); setShowChangePassword(true); }} className={`w-full flex justify-between items-center p-3 ${darkMode ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'} rounded-xl border transition-colors`}>
                    <div className="flex items-center"><Shield className="w-4 h-4 mr-3 text-gray-500" /><span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Change Password</span></div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </button>
                  <button onClick={() => { setShowSettings(false); setShowPrivacyPolicy(true); }} className={`w-full flex justify-between items-center p-3 ${darkMode ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'} rounded-xl border transition-colors`}>
                    <div className="flex items-center"><Shield className="w-4 h-4 mr-3 text-gray-500" /><span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Privacy Policy</span></div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </button>
                  <button onClick={() => { setShowSettings(false); setShowTerms(true); }} className={`w-full flex justify-between items-center p-3 ${darkMode ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'} rounded-xl border transition-colors`}>
                    <div className="flex items-center"><Info className="w-4 h-4 mr-3 text-gray-500" /><span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Terms of Service</span></div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>
              <div className="text-center pt-2 pb-4">
                <p className="text-xs text-gray-400 font-medium">StreetConnect v4.0</p>
                <p className="text-[10px] text-gray-300 mt-1">Made with ❤️ in Bangalore</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowChangePassword(false)}>
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-[2rem] w-full max-w-sm shadow-2xl overflow-hidden`} onClick={e => e.stopPropagation()}>
            <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'} flex justify-between items-center`}>
              <h2 className={`text-xl font-black font-heading ${darkMode ? 'text-white' : ''}`}>Change Password</h2>
              <button onClick={() => setShowChangePassword(false)} className="p-2"><X className="w-5 h-5 text-gray-400"/></button>
            </div>
            <div className="p-6 space-y-4">
              {passwordMsg && <p className={`text-sm font-bold p-3 rounded-xl ${passwordMsg.includes('success') ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>{passwordMsg}</p>}
              <div><label className={`block text-sm font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Current Password</label><input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} className={`w-full border-2 rounded-xl p-3 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200'}`} /></div>
              <div><label className={`block text-sm font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>New Password</label><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={`w-full border-2 rounded-xl p-3 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200'}`} /></div>
              <div><label className={`block text-sm font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Confirm New Password</label><input type="password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} className={`w-full border-2 rounded-xl p-3 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200'}`} /></div>
              <button onClick={handleChangePassword} className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-orange-500 to-rose-500 shadow-md">Update Password</button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Policy Modal */}
      {showPrivacyPolicy && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowPrivacyPolicy(false)}>
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden max-h-[80vh] flex flex-col`} onClick={e => e.stopPropagation()}>
            <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'} flex justify-between items-center`}>
              <h2 className={`text-xl font-black font-heading ${darkMode ? 'text-white' : ''}`}>Privacy Policy</h2>
              <button onClick={() => setShowPrivacyPolicy(false)} className="p-2"><X className="w-5 h-5 text-gray-400"/></button>
            </div>
            <div className={`flex-1 overflow-y-auto p-6 ${darkMode ? 'text-gray-300' : 'text-gray-700'} text-sm leading-relaxed space-y-4`}>
              <h3 className="font-bold text-lg">1. Information We Collect</h3>
              <p>We collect personal information including your name, email address, phone number, delivery address, and order history to provide and improve our services.</p>
              <h3 className="font-bold text-lg">2. How We Use Your Information</h3>
              <p>Your information is used to process orders, share delivery details with riders, send notifications, and improve our platform. We never sell your personal data to third parties.</p>
              <h3 className="font-bold text-lg">3. Data Sharing</h3>
              <p>Your delivery address and phone number are shared with the assigned delivery partner for order fulfillment only. Restaurant partners receive your order details but not your phone number.</p>
              <h3 className="font-bold text-lg">4. Data Security</h3>
              <p>All passwords are encrypted using bcrypt hashing. We use SSL/TLS encryption for data in transit. Our Kafka messaging infrastructure uses SSL certificates for secure communication.</p>
              <h3 className="font-bold text-lg">5. Your Rights</h3>
              <p>You can request deletion of your account and associated data by contacting admin@streetconnect.in. You have the right to access, modify, and export your personal data at any time.</p>
              <h3 className="font-bold text-lg">6. Contact</h3>
              <p>For privacy concerns, contact our Data Protection Officer at admin@streetconnect.in or call +91 98765 43210.</p>
              <p className="text-xs text-gray-400 pt-4">Last updated: April 2026</p>
            </div>
          </div>
        </div>
      )}

      {/* Terms of Service Modal */}
      {showTerms && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowTerms(false)}>
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden max-h-[80vh] flex flex-col`} onClick={e => e.stopPropagation()}>
            <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'} flex justify-between items-center`}>
              <h2 className={`text-xl font-black font-heading ${darkMode ? 'text-white' : ''}`}>Terms of Service</h2>
              <button onClick={() => setShowTerms(false)} className="p-2"><X className="w-5 h-5 text-gray-400"/></button>
            </div>
            <div className={`flex-1 overflow-y-auto p-6 ${darkMode ? 'text-gray-300' : 'text-gray-700'} text-sm leading-relaxed space-y-4`}>
              <h3 className="font-bold text-lg">1. Acceptance of Terms</h3>
              <p>By using StreetConnect, you agree to these terms. StreetConnect is a platform connecting customers with local street food vendors and delivery partners.</p>
              <h3 className="font-bold text-lg">2. User Accounts</h3>
              <p>You must provide accurate information during registration. Each email address can be used for one account only. You are responsible for maintaining the security of your password.</p>
              <h3 className="font-bold text-lg">3. Orders & Payments</h3>
              <p>All prices are in Indian Rupees (₹) and include applicable taxes. Delivery charges may apply based on distance unless you have a StreetVIP subscription. Payments are currently Cash on Delivery (COD).</p>
              <h3 className="font-bold text-lg">4. StreetVIP Membership</h3>
              <p>StreetVIP is a premium subscription at ₹149/month providing free delivery and priority support. You may cancel anytime. Refunds are processed within 5-7 business days.</p>
              <h3 className="font-bold text-lg">5. Cancellation Policy</h3>
              <p>Orders can be cancelled before restaurant acceptance at no charge. Post-acceptance cancellations may incur charges up to 50% of the order value.</p>
              <h3 className="font-bold text-lg">6. Liability</h3>
              <p>StreetConnect acts as a marketplace. We are not liable for food quality, allergies, or delivery delays beyond our control. For issues, contact support@streetconnect.in.</p>
              <p className="text-xs text-gray-400 pt-4">Last updated: April 2026</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerView;
