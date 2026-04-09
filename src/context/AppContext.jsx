import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';

export const AppContext = createContext();

const API_BASE = 'http://localhost:5000/api';

export const AppProvider = ({ children }) => {
  const [vendors, setVendors] = useState([]);
  const [orders, setOrders] = useState([]);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('streetconnect_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [backendOnline, setBackendOnline] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const initialFetchDone = useRef(false);

  // Dark mode
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem('streetconnect_darkmode') === 'true'; } catch { return false; }
  });

  useEffect(() => {
    localStorage.setItem('streetconnect_darkmode', darkMode.toString());
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.body.style.backgroundColor = '#111827';
      document.body.style.color = '#f3f4f6';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = '';
      document.body.style.color = '';
    }
  }, [darkMode]);

  // Rider locations: { orderId: { lat, lng, status } }
  const [riderLocations, setRiderLocations] = useState({});

  // Generate a fake rider location near a given lat/lng
  const generateNearbyLocation = (lat, lng, radiusMeters = 800) => {
    const r = radiusMeters / 111320;
    const angle = Math.random() * 2 * Math.PI;
    return {
      lat: lat + r * Math.cos(angle),
      lng: lng + r * Math.sin(angle)
    };
  };

  // Update rider location when order status changes
  const updateRiderLocation = (orderId, vendorLat, vendorLng, customerLat, customerLng, status) => {
    setRiderLocations(prev => {
      const updated = { ...prev };
      if (status === 'ready' || status === 'accepted') {
        // Rider is near the restaurant
        updated[orderId] = { ...generateNearbyLocation(vendorLat, vendorLng, 500), status: 'near_restaurant' };
      } else if (status === 'picked_up') {
        // Rider is at the restaurant picking up
        updated[orderId] = { lat: vendorLat, lng: vendorLng, status: 'picked_up' };
      } else if (status === 'delivered') {
        // Rider is at the customer location
        updated[orderId] = { lat: customerLat, lng: customerLng, status: 'delivered' };
        // Clean up after 30 seconds
        setTimeout(() => {
          setRiderLocations(p => { const u = { ...p }; delete u[orderId]; return u; });
        }, 30000);
      }
      return updated;
    });
  };

  // Simulate rider movement for active deliveries
  useEffect(() => {
    const interval = setInterval(() => {
      setRiderLocations(prev => {
        const updated = { ...prev };
        for (const [orderId, loc] of Object.entries(updated)) {
          const order = orders.find(o => o.id === orderId);
          if (!order) continue;

          if ((loc.status === 'out_for_delivery' || order.status === 'out_for_delivery') && order.status !== 'delivered') {
            // Rider moving toward customer
            const targetLat = order.customerLat || 12.9735;
            const targetLng = order.customerLng || 77.5960;
            const dLat = (targetLat - loc.lat) * 0.15;
            const dLng = (targetLng - loc.lng) * 0.15;
            if (Math.abs(dLat) < 0.00005 && Math.abs(dLng) < 0.00005) continue;
            updated[orderId] = { lat: loc.lat + dLat, lng: loc.lng + dLng, status: 'out_for_delivery' };
          } else if (loc.status === 'near_restaurant' || (order.status === 'picked_up' && loc.status !== 'out_for_delivery')) {
            // Rider is near restaurant waiting — small jitter
            const vendor = vendors.find(v => v.id === order.vendorId);
            if (vendor) {
              const jitter = 0.0001;
              updated[orderId] = {
                lat: vendor.lat + (Math.random() - 0.5) * jitter,
                lng: vendor.lng + (Math.random() - 0.5) * jitter,
                status: 'near_restaurant'
              };
            }
          }
        }
        return updated;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [orders, vendors]);

  // Persist user session
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('streetconnect_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('streetconnect_user');
    }
  }, [currentUser]);

  // Get user's real location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setUserLocation({ lat: 12.9716, lng: 77.5946 })
      );
    } else {
      setUserLocation({ lat: 12.9716, lng: 77.5946 });
    }
  }, []);

  const fetchState = useCallback(async () => {
    try {
      let vendorUrl = `${API_BASE}/vendors`;
      if (userLocation) vendorUrl += `?lat=${userLocation.lat}&lng=${userLocation.lng}`;
      const [vRes, oRes] = await Promise.all([fetch(vendorUrl), fetch(`${API_BASE}/orders`)]);
      if (vRes.ok) {
        const vData = await vRes.json();
        // Sort by ID to keep vendor list stable across polls (prevents reshuffling)
        if (vData && vData.length > 0) setVendors(prev => {
          const sorted = [...vData].sort((a, b) => a.id.localeCompare(b.id));
          // Deep-compare lat/lng/name to skip update if nothing meaningful changed
          if (prev.length === sorted.length && prev.every((v, i) => 
            v.id === sorted[i].id && 
            v.lat === sorted[i].lat && 
            v.lng === sorted[i].lng &&
            v.name === sorted[i].name
          )) return prev; // Reuse exact same reference → no re-render
          return sorted;
        });
      }
      if (oRes.ok) setOrders(await oRes.json());
      setBackendOnline(true);
    } catch (err) {
      if (!initialFetchDone.current) console.warn("Backend offline — using local fallback data");
      setBackendOnline(false);
    }
    initialFetchDone.current = true;
  }, [userLocation]);

  useEffect(() => {
    if (userLocation) {
      fetchState();
      const interval = setInterval(fetchState, 3000);
      return () => clearInterval(interval);
    }
  }, [fetchState, userLocation]);

  const refreshVendors = async (lat, lng) => {
    try {
      await fetch(`${API_BASE}/vendors/refresh`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng, radius: 3000 })
      });
      fetchState();
    } catch (e) { console.warn("Could not refresh vendors"); }
  };

  const toggleVendorStatus = async (vendorId) => {
    setVendors(prev => prev.map(v => v.id === vendorId ? { ...v, isOpen: !v.isOpen } : v));
    try { await fetch(`${API_BASE}/vendors/${vendorId}/status`, { method: 'PUT' }); } 
    catch (e) { setVendors(prev => prev.map(v => v.id === vendorId ? { ...v, isOpen: !v.isOpen } : v)); }
  };

  const toggleVendorItem = async (vendorId, itemId) => {
    setVendors(prev => prev.map(v => {
      if (v.id === vendorId) return { ...v, menu: v.menu.map(m => m.id === itemId ? { ...m, available: !m.available } : m) };
      return v;
    }));
    try { await fetch(`${API_BASE}/vendors/${vendorId}/items/${itemId}`, { method: 'PUT' }); } 
    catch (e) {
      setVendors(prev => prev.map(v => {
        if (v.id === vendorId) return { ...v, menu: v.menu.map(m => m.id === itemId ? { ...m, available: !m.available } : m) };
        return v;
      }));
    }
  };

  const placeOrder = async (order) => {
    const vendor = vendors.find(v => v.id === order.vendorId);
    // Embed vendorName at order time so past orders always show correct name
    const enrichedOrder = { ...order, vendorName: vendor?.name || order.vendorName || 'Restaurant' };
    setOrders(prev => [...prev, enrichedOrder]);
    // Initialize rider location near vendor
    if (vendor) {
      updateRiderLocation(enrichedOrder.id, vendor.lat, vendor.lng, enrichedOrder.customerLat, enrichedOrder.customerLng, 'accepted');
    }
    try {
      await fetch(`${API_BASE}/orders`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enrichedOrder)
      });
    } catch (e) {}
  };

  const updateOrderStatus = async (orderId, status) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    // Update rider location based on status
    const order = orders.find(o => o.id === orderId);
    if (order) {
      const vendor = vendors.find(v => v.id === order.vendorId);
      if (vendor) {
        updateRiderLocation(orderId, vendor.lat, vendor.lng, order.customerLat || 12.9735, order.customerLng || 77.5960, status);
      }
    }
    try {
      await fetch(`${API_BASE}/orders/${orderId}/status`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
    } catch (e) {}
  };

  const signup = async (userData) => {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Signup failed');
    setCurrentUser(data.user);
    return data.user;
  };

  const login = async (userData) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    setCurrentUser(data.user);
    return data.user;
  };

  const forgotPassword = async (email) => {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data.message;
  };

  const logout = () => setCurrentUser(null);
  
  const clearOrders = async () => {
    setOrders([]);
    try { await fetch(`${API_BASE}/orders`, { method: 'DELETE' }); } catch (e) {}
  };

  const toggleStreetVIP = () => {
    setCurrentUser(prev => prev ? { ...prev, streetVIP: !prev.streetVIP } : null);
  };

  // Edit profile
  const updateProfile = (updates) => {
    setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
  };

  return (
    <AppContext.Provider value={{
      vendors, setVendors, toggleVendorStatus, toggleVendorItem,
      orders, placeOrder, updateOrderStatus, clearOrders,
      currentUser, setCurrentUser, login, signup, forgotPassword, logout, toggleStreetVIP, updateProfile,
      backendOnline, userLocation, setUserLocation, refreshVendors,
      riderLocations, darkMode, setDarkMode
    }}>
      {children}
    </AppContext.Provider>
  );
};
