import React, { useContext, useState, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import { useTranslation } from '../context/LanguageContext';
import { DollarSign, Package, TrendingUp, CheckCircle, ChevronRight, Activity, X, HelpCircle, LogOut, User, ChevronDown, Search } from 'lucide-react';
import HelpSupport from '../components/HelpSupport';
import { useNavigate } from 'react-router-dom';

function VendorDashboard() {
  const { currentUser, setVendors, vendors, orders, updateOrderStatus, toggleVendorStatus, toggleVendorItem, logout, clearOrders } = useContext(AppContext);
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  // Restaurant selection — persisted in localStorage so it survives page refresh
  const [selectedVendorId, setSelectedVendorIdInternal] = useState(() => {
    try { return localStorage.getItem('streetconnect_selected_vendor') || ''; } catch { return ''; }
  });
  const setSelectedVendorId = (id) => {
    setSelectedVendorIdInternal(id);
    try { localStorage.setItem('streetconnect_selected_vendor', id); } catch {}
  };

  // Inline search replaces dropdown
  const [vendorSearchQuery, setVendorSearchQuery] = useState('');
  const filteredVendorList = vendorSearchQuery.trim()
    ? vendors.filter(v => v.name.toLowerCase().includes(vendorSearchQuery.toLowerCase()))
    : [];

  // Find the selected vendor — fall back to first if saved ID no longer exists in list
  const vendor = (selectedVendorId ? vendors.find(v => v.id === selectedVendorId) : null) || vendors[0];

  const vendorOrders = vendor ? orders.filter(o => o.vendorId === vendor.id) : [];
  const pendingOrders = vendorOrders.filter(o => o.status === 'pending');
  const activeOrders = vendorOrders.filter(o => o.status === 'accepted' || o.status === 'ready');
  const completedOrders = vendorOrders.filter(o => o.status === 'delivered');
  const earnings = completedOrders.reduce((sum, o) => sum + o.total, 0);

  // All orders across all restaurants (for summary)
  const allCompletedOrders = orders.filter(o => o.status === 'delivered');
  const totalEarnings = allCompletedOrders.reduce((sum, o) => sum + o.total, 0);

  // Per-restaurant breakdown
  const restaurantBreakdown = useMemo(() => {
    const breakdown = {};
    allCompletedOrders.forEach(o => {
      const v = vendors.find(v => v.id === o.vendorId);
      const name = v?.name || 'Unknown';
      if (!breakdown[name]) breakdown[name] = { orders: 0, revenue: 0, items: [] };
      breakdown[name].orders++;
      breakdown[name].revenue += o.total;
      breakdown[name].items.push(o);
    });
    return breakdown;
  }, [allCompletedOrders, vendors]);

  const [showItemModal, setShowItemModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const handleStatusChange = (orderId, status) => updateOrderStatus(orderId, status);
  const handleToggleItem = (itemId) => toggleVendorItem(vendor.id, itemId);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if(!newItemName || !newItemPrice || isNaN(newItemPrice)) return;
    try {
      const res = await fetch(`http://localhost:5000/api/vendors/${vendor.id}/items`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newItemName, price: parseInt(newItemPrice), category: newItemCategory || 'Menu' })
      });
      if(res.ok) {
        const { item } = await res.json();
        setVendors(prev => prev.map(v => v.id === vendor.id ? { ...v, menu: [...v.menu, item] } : v));
      }
    } catch(err) {
      const localItem = { id: `m_${Math.random().toString(36).substr(2, 6)}`, name: newItemName, price: parseInt(newItemPrice), category: newItemCategory || 'Menu', available: true };
      setVendors(prev => prev.map(v => v.id === vendor.id ? { ...v, menu: [...v.menu, localItem] } : v));
    }
    setShowItemModal(false); setNewItemName(''); setNewItemPrice(''); setNewItemCategory('');
  };

  if (!vendor) return <div className="p-12 text-center font-bold text-gray-500">Vendor Identity Not Found</div>;

  return (
    <div className="absolute inset-0 bg-gray-50 flex flex-col pt-24 pb-8 px-4 md:px-8 overflow-y-auto animate-in fade-in duration-500 w-full h-full">
      
      {/* Vendor Profile Dropdown */}
      <div className="fixed top-6 right-6 z-40">
        <div className="relative">
          <button onClick={() => setShowProfile(!showProfile)} className="flex items-center space-x-2 bg-white/90 backdrop-blur-md px-4 py-3 rounded-full shadow-lg border border-gray-200 hover:border-rose-300 transition-all font-bold text-sm">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white bg-rose-600"><User className="w-4 h-4" /></div>
            <span>{currentUser?.name || 'Vendor'}</span>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </button>
          {showProfile && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)}></div>
              <div className="absolute right-0 mt-3 w-64 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-4 duration-200">
                <div className="p-6 bg-rose-50 border-b border-rose-100">
                  <h3 className="font-black text-gray-900">{currentUser?.name}</h3>
                  <p className="text-xs text-rose-600 font-bold mt-1 tracking-widest uppercase">Restaurant Partner</p>
                </div>
                <div className="p-2 space-y-1">
                  <button onClick={() => { setShowProfile(false); setShowHelp(true); }} className="w-full flex items-center px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 rounded-xl transition-colors">
                    <HelpCircle className="w-4 h-4 mr-3 text-rose-500" /> Help & Support
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

      <div className="max-w-7xl mx-auto w-full space-y-8">
        
        {/* Header + Restaurant Selector */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-rose-100 to-transparent rounded-full opacity-50 -translate-y-1/2 translate-x-1/2 z-0"></div>
          <div className="relative z-10 flex-1">
            <div className="flex items-center space-x-3 mb-2">
               <div className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase">{t('partnerPortal')}</div>
            </div>
            
            {/* Restaurant Inline Search */}
            <div className="mb-3">
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-3xl md:text-4xl font-black text-gray-900 font-heading tracking-tight">{vendor.name}</h1>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${vendor.isOpen ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>{vendor.isOpen ? 'Live' : 'Offline'}</span>
              </div>

              {/* Always-visible search bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Switch restaurant — type to search..."
                  value={vendorSearchQuery}
                  onChange={e => setVendorSearchQuery(e.target.value)}
                  onBlur={() => setTimeout(() => setVendorSearchQuery(''), 200)}
                  className="w-full max-w-sm pl-10 pr-10 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-rose-300 focus:ring-1 focus:ring-rose-100 bg-white shadow-sm"
                />
                {vendorSearchQuery && (
                  <button onClick={() => setVendorSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Results — shown inline below, scrollable, high z-index */}
              {filteredVendorList.length > 0 && (
                <div className="mt-1 w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 max-h-72 overflow-y-auto" style={{position:'relative', zIndex:9999}}>
                  <div className="sticky top-0 bg-gray-50 px-4 py-2 border-b border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{filteredVendorList.length} restaurant{filteredVendorList.length !== 1 ? 's' : ''} found</p>
                  </div>
                  {filteredVendorList.map(v => {
                    const vOrders = orders.filter(o => o.vendorId === v.id && o.status === 'delivered');
                    return (
                      <button
                        key={v.id}
                        onMouseDown={() => { setSelectedVendorId(v.id); setVendorSearchQuery(''); }}
                        className={`w-full text-left px-4 py-3.5 hover:bg-rose-50 transition-colors flex justify-between items-center border-b border-gray-50 last:border-0 ${v.id === vendor.id ? 'bg-rose-50 border-l-4 border-l-rose-500' : ''}`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-sm text-gray-900 truncate">{v.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{v.type} • {v.menu?.length || 0} items</p>
                        </div>
                        <div className="text-right ml-3 flex-shrink-0">
                          <p className="text-xs font-bold text-green-600">₹{vOrders.reduce((s, o) => s + o.total, 0)}</p>
                          <p className="text-[10px] text-gray-400">{vOrders.length} orders</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <p className="text-gray-500 font-medium">{t('manageBusiness')}</p>
          </div>
          
          <div className="mt-6 md:mt-0 relative z-10 flex items-center bg-gray-50 p-3 rounded-2xl border border-gray-200">
             <Activity className={`w-5 h-5 mr-3 ${vendor.isOpen ? 'text-green-500' : 'text-gray-400'}`} />
             <div className="flex flex-col mr-4">
               <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('storeStatus')}</span>
               <span className={`text-sm font-bold w-16 ${vendor.isOpen ? 'text-green-600' : 'text-gray-600'}`}>{vendor.isOpen ? t('live') : t('offline')}</span>
             </div>
             <button onClick={() => toggleVendorStatus(vendor.id)} className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none ${vendor.isOpen ? 'bg-gradient-to-r from-green-400 to-green-500 shadow-inner' : 'bg-gray-300'}`}>
                <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform ${vendor.isOpen ? 'translate-x-7' : 'translate-x-1'}`} />
             </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex items-center group hover:shadow-lg transition-all duration-300">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-lg shadow-green-500/30 group-hover:scale-110 transition-transform"><DollarSign className="w-8 h-8" /></div>
            <div className="ml-5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('grossEarnings')}</p>
              <h3 className="text-3xl font-black text-gray-900 font-heading">₹{earnings}</h3>
              {selectedVendorId && totalEarnings > 0 && (
                <p className="text-[10px] text-gray-400 mt-1">All restaurants: ₹{totalEarnings}</p>
              )}
            </div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex items-center group hover:shadow-lg transition-all duration-300">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 text-white shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform"><Package className="w-8 h-8" /></div>
            <div className="ml-5"><p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('activeTickets')}</p><h3 className="text-3xl font-black text-gray-900 font-heading">{activeOrders.length}</h3></div>
          </div>
          <div onClick={() => setShowOrdersModal(true)} className="cursor-pointer bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex items-center group hover:shadow-lg transition-all duration-300">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-400 to-rose-500 text-white shadow-lg shadow-orange-500/30 group-hover:scale-110 transition-transform"><TrendingUp className="w-8 h-8" /></div>
            <div className="ml-5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Orders Served (View)</p>
              <h3 className="text-3xl font-black text-gray-900 font-heading">{completedOrders.length}</h3>
              {selectedVendorId && (
                <p className="text-[10px] text-gray-400 mt-1">All restaurants: {allCompletedOrders.length}</p>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Pending Orders */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden relative">
              <div className="px-8 py-5 border-b border-rose-100 bg-rose-50/30 flex justify-between items-center">
                <h3 className="text-xl font-black text-gray-900 font-heading flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 mr-3 animate-ping"></span>{t('actionRequired')}</h3>
                <span className="bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">{pendingOrders.length} {t('newOrders')}</span>
              </div>
              <div className="divide-y divide-gray-50/50">
                {pendingOrders.length === 0 ? (
                  <div className="py-16 text-center"><Package className="w-12 h-12 text-gray-200 mx-auto mb-3" /><p className="text-gray-400 font-medium">{t('pipelineEmpty')}</p></div>
                ) : (
                  pendingOrders.map(order => (
                    <div key={order.id} className="p-8 hover:bg-rose-50/30 transition-colors">
                      <div className="flex flex-col sm:flex-row justify-between items-start">
                        <div>
                          <div className="flex items-center space-x-3 mb-2">
                             <span className="bg-gray-100 text-gray-600 font-bold text-xs px-2 py-1 rounded-md">ID: {order.id.slice(-6).toUpperCase()}</span>
                             <span className="text-sm font-medium text-gray-400">{t('justNow')}</span>
                          </div>
                          {order.customerName && <p className="text-sm font-bold text-gray-800 mb-1">👤 {order.customerName}</p>}
                          {order.customerPhone && <p className="text-sm text-gray-500 mb-1">📞 {order.customerPhone}</p>}
                          {order.deliveryAddress && <p className="text-sm text-gray-500 mt-1 mb-2">📍 {order.deliveryAddress}</p>}
                          <ul className="mt-4 space-y-2">
                            {order.items.map((item, i) => (
                              <li key={i} className="text-base font-semibold text-gray-800 flex items-center">
                                <span className="bg-orange-100 text-orange-600 text-xs px-2.5 py-1 rounded font-bold mr-3">{item.qty}x</span> {item.name}
                              </li>
                            ))}
                          </ul>
                          <p className="mt-5 font-black text-rose-500 text-2xl">₹{order.total}</p>
                        </div>
                        <div className="mt-6 sm:mt-0 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
                          <button onClick={() => handleStatusChange(order.id, 'accepted')} className="bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-xl flex justify-center items-center font-bold shadow-lg shadow-gray-900/20 transition-all hover:-translate-y-0.5">
                            <CheckCircle className="w-5 h-5 mr-2" /> {t('acceptOrder')}
                          </button>
                          <button onClick={() => handleStatusChange(order.id, 'rejected')} className="bg-white border-2 border-gray-200 text-gray-500 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 px-6 py-3 rounded-xl flex justify-center items-center font-bold transition-all">
                            {t('reject')}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Kitchen Queue */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-8 py-5 border-b border-gray-100"><h3 className="text-xl font-black text-gray-900 font-heading">{t('kitchenQueue')} ({activeOrders.length})</h3></div>
              <div className="divide-y divide-gray-50">
                {activeOrders.length === 0 ? (
                  <p className="py-12 text-center text-gray-400 font-medium">{t('noTickets')}</p>
                ) : (
                  activeOrders.map(order => (
                    <div key={order.id} className="p-6 flex flex-col sm:flex-row justify-between items-center hover:bg-gray-50 transition-colors group">
                      <div className="w-full sm:w-auto mb-4 sm:mb-0">
                        <div className="flex items-center space-x-3"><div className="w-2 h-2 rounded-full bg-amber-400"></div><p className="font-bold text-gray-900 text-lg">Ticket #{order.id.slice(-4).toUpperCase()}</p></div>
                        <p className="text-sm font-medium text-gray-500 mt-1 ml-5">{order.items.length} {t('itemsPreparing')}</p>
                        {order.customerName && <p className="text-xs font-bold text-gray-600 mt-1 ml-5">👤 {order.customerName}</p>}
                      </div>
                      <div className="w-full sm:w-auto text-right">
                        {order.status === 'accepted' ? (
                          <button onClick={() => handleStatusChange(order.id, 'ready')} className="w-full sm:w-auto bg-white border-2 border-green-500 text-green-600 hover:bg-green-500 hover:text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-sm flex items-center justify-center">
                            {t('markReady')} <ChevronRight className="w-4 h-4 ml-1" />
                          </button>
                         ) : (
                          <span className="inline-block w-full sm:w-auto bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-6 py-2.5 rounded-xl font-bold text-center shadow-md">{t('awaitingCourier')}</span>
                         )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Inventory Management */}
          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8 self-start sticky top-28">
            <h3 className="text-xl font-black text-gray-900 font-heading mb-6 flex items-center justify-between">
               {t('inventoryManagement')}
               <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded font-bold">{vendor.menu.length} {t('items')}</span>
            </h3>
            <div className="space-y-4">
              {vendor.menu.map(item => (
                <div key={item.id} className={`flex flex-col p-5 rounded-2xl border transition-all duration-300 ${item.available ? 'bg-white border-gray-200 shadow-sm hover:shadow-md' : 'bg-gray-50 border-dashed border-gray-200 opacity-70'}`}>
                  <div className="flex justify-between items-center mb-3">
                     <h4 className={`font-bold text-lg ${item.available ? 'text-gray-900' : 'text-gray-400 line-through'}`}>{item.name}</h4>
                     <p className={`font-black ${item.available ? 'text-rose-500' : 'text-gray-400'}`}>₹{item.price}</p>
                  </div>
                  {item.category && <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{item.category}</p>}
                  <button onClick={() => handleToggleItem(item.id)} className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all ${item.available ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-gradient-to-r from-green-400 to-emerald-500 text-white shadow-md hover:shadow-lg'}`}>
                    {item.available ? t('pauseItem') : t('activateMenu')}
                  </button>
                </div>
              ))}
              <button onClick={() => setShowItemModal(true)} className="w-full mt-6 border-2 border-dashed border-rose-200 bg-rose-50/50 rounded-2xl p-5 text-rose-500 font-bold hover:border-rose-300 hover:bg-rose-50 transition-all flex items-center justify-center group">
                <span className="bg-rose-200 text-rose-600 w-6 h-6 rounded-full flex justify-center items-center mr-2 group-hover:scale-110 transition-transform">+</span> 
                {t('createNewItem')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showHelp && <HelpSupport onClose={() => setShowHelp(false)} role="vendor" />}

      {/* Add Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in" onClick={() => setShowItemModal(false)}>
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-black font-heading">Add New Item</h2>
              <button onClick={() => setShowItemModal(false)} className="p-2"><X className="w-5 h-5 text-gray-400"/></button>
            </div>
            <form onSubmit={handleAddItem} className="p-6 space-y-4">
              <div><label className="block text-sm font-bold text-gray-700 mb-2">Item Name</label><input type="text" value={newItemName} onChange={e => setNewItemName(e.target.value)} required className="w-full border-2 rounded-xl p-3 focus:border-rose-400 focus:ring-0" placeholder="E.g. Chicken Biryani" /></div>
              <div><label className="block text-sm font-bold text-gray-700 mb-2">Price (₹)</label><input type="number" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} required className="w-full border-2 rounded-xl p-3 focus:border-rose-400 focus:ring-0" placeholder="E.g. 250" /></div>
              <div><label className="block text-sm font-bold text-gray-700 mb-2">Category</label><input type="text" value={newItemCategory} onChange={e => setNewItemCategory(e.target.value)} className="w-full border-2 rounded-xl p-3 focus:border-rose-400 focus:ring-0" placeholder="E.g. North Indian, Starters" /></div>
              <button type="submit" className="w-full py-4 mt-2 rounded-xl font-bold text-white bg-gradient-to-r from-rose-500 to-pink-500 shadow-md hover:shadow-lg transition-all">Save Item</button>
            </form>
          </div>
        </div>
      )}

      {/* Completed Orders Modal with Per-Restaurant Breakdown */}
      {showOrdersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in" onClick={() => setShowOrdersModal(false)}>
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-black font-heading text-gray-900">Completed Orders — {vendor.name}</h2>
              <button onClick={() => setShowOrdersModal(false)} className="p-2 hover:bg-gray-200 rounded-full"><X className="w-5 h-5 text-gray-400"/></button>
            </div>
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              
              {/* Per-Restaurant Summary */}
              {Object.keys(restaurantBreakdown).length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Revenue Per Restaurant</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.entries(restaurantBreakdown).map(([name, data]) => (
                      <div key={name} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <p className="font-bold text-sm text-gray-900 truncate">{name}</p>
                        <div className="flex justify-between mt-2">
                          <span className="text-xs text-gray-500">{data.orders} orders</span>
                          <span className="text-sm font-black text-green-600">₹{data.revenue}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Orders for Selected Restaurant */}
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Order Details — {vendor.name}</h3>
                {completedOrders.length === 0 ? (
                  <p className="text-center text-gray-400 py-8">No completed orders yet.</p>
                ) : (
                  <div className="space-y-4">
                    {completedOrders.slice().reverse().map(o => (
                      <div key={o.id} className="p-5 border border-gray-200 rounded-2xl bg-white shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-bold text-gray-900">{o.customerName || 'Customer'}</h4>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-0.5">{new Date(o.createdAt || Date.now()).toLocaleString()}</p>
                          </div>
                          <p className="font-black text-green-600 text-lg">₹{o.total}</p>
                        </div>
                        {o.customerPhone && <p className="text-xs text-gray-600 mb-1 font-bold">📞 {o.customerPhone}</p>}
                        {o.deliveryAddress && <p className="text-xs text-gray-600 mb-3 bg-gray-50 p-2 rounded">📍 {o.deliveryAddress}</p>}
                        <div className="h-px bg-gray-100 my-3"></div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Items Ordered</p>
                        <ul className="space-y-1 text-sm font-medium">
                          {o.items.map((item, i) => (
                            <li key={i} className="flex justify-between text-gray-700">
                              <span><span className="font-bold text-gray-400 mr-2">{item.qty}x</span>{item.name}</span>
                              {item.price && <span className="text-gray-500">₹{item.price * item.qty}</span>}
                            </li>
                          ))}
                        </ul>
                        {o.etaMins && <p className="text-xs text-gray-500 mt-3 pt-2 border-t border-gray-100">🕐 Est. delivery time: {o.etaMins} mins</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VendorDashboard;
