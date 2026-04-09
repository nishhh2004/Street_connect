import React, { useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const userIcon = new L.DivIcon({
  className: '',
  html: `<div style="width:20px;height:20px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 10px rgba(59,130,246,0.5);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

function createVendorIcon(highlighted = false) {
  const size = highlighted ? 36 : 28;
  const glow = highlighted ? 'box-shadow:0 0 16px rgba(249,115,22,0.8);' : 'box-shadow:0 2px 8px rgba(249,115,22,0.4);';
  const border = highlighted ? 'border:3px solid #f97316;' : 'border:3px solid white;';
  return new L.DivIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:linear-gradient(135deg,#f97316,#ec4899);${border}${glow}display:flex;align-items:center;justify-content:center;transition:all 0.3s;">
      <span style="color:white;font-size:${highlighted ? 18 : 14}px;font-weight:bold;">🍜</span>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const vendorIcon = createVendorIcon(false);
const vendorIconHighlighted = createVendorIcon(true);

const pickupIcon = new L.DivIcon({
  className: '',
  html: `<div style="width:28px;height:28px;border-radius:50%;background:#f97316;border:3px solid white;box-shadow:0 2px 8px rgba(249,115,22,0.4);display:flex;align-items:center;justify-content:center;">
    <span style="color:white;font-size:14px;">📦</span>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const dropoffIcon = new L.DivIcon({
  className: '',
  html: `<div style="width:28px;height:28px;border-radius:50%;background:#22c55e;border:3px solid white;box-shadow:0 2px 8px rgba(34,197,94,0.4);display:flex;align-items:center;justify-content:center;">
    <span style="color:white;font-size:14px;">🏠</span>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

// Rider icon for live tracking
const riderIcon = new L.DivIcon({
  className: '',
  html: `<div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:3px solid white;box-shadow:0 0 14px rgba(99,102,241,0.6);display:flex;align-items:center;justify-content:center;animation:pulse 2s infinite;">
    <span style="color:white;font-size:16px;">🛵</span>
  </div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

// Restaurant marker for tracking mode
const restaurantTrackIcon = new L.DivIcon({
  className: '',
  html: `<div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#f97316,#ec4899);border:3px solid white;box-shadow:0 0 12px rgba(249,115,22,0.5);display:flex;align-items:center;justify-content:center;">
    <span style="color:white;font-size:15px;">🍽️</span>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// Only recenter when coordinates change MORE than a meaningful threshold
// Using ref to track previous center and only fly when genuinely different
function RecenterMap({ center }) {
  const map = useMap();
  const prevCenter = useRef(null);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!center) return;
    const lat = Array.isArray(center) ? center[0] : center.lat;
    const lng = Array.isArray(center) ? center[1] : center.lng;
    if (isNaN(lat) || isNaN(lng)) return;

    // First mount: set view immediately without animation
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      prevCenter.current = [lat, lng];
      map.setView([lat, lng], 14, { animate: false });
      return;
    }

    // Only re-fly if location changed by more than ~250m
    if (prevCenter.current) {
      const dLat = Math.abs(prevCenter.current[0] - lat);
      const dLng = Math.abs(prevCenter.current[1] - lng);
      if (dLat < 0.003 && dLng < 0.003) return; // Skip tiny changes
    }

    prevCenter.current = [lat, lng];
    map.flyTo([lat, lng], map.getZoom(), { duration: 1.5 });
  }, [center, map]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

function MapComponent({ center, vendors = [], onVendorSelect, routeOrigin, routeDestination, highlightedVendorId, trackingMarkers }) {
  const showRoute = routeOrigin && routeDestination;
  const showTracking = !!trackingMarkers;
  const mapCenter = Array.isArray(center) ? center : [center?.lat || 12.9716, center?.lng || 77.5946];

  return (
    <MapContainer
      center={mapCenter}
      zoom={14}
      scrollWheelZoom={true}
      style={{ width: '100%', height: '100%' }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <RecenterMap center={center} />

      {/* Order Tracking Mode — show only rider, restaurant, and user */}
      {showTracking && (
        <>
          {/* Restaurant marker */}
          <Marker position={[trackingMarkers.vendor.lat, trackingMarkers.vendor.lng]} icon={restaurantTrackIcon}>
            <Tooltip permanent direction="top" offset={[0, -20]}>
              <strong>🍽️ {trackingMarkers.vendor.name}</strong>
            </Tooltip>
          </Marker>

          {/* Customer/User marker */}
          {trackingMarkers.customer && (
            <Marker position={[trackingMarkers.customer.lat, trackingMarkers.customer.lng]} icon={userIcon}>
              <Popup>📍 Your Location</Popup>
            </Marker>
          )}

          {/* Rider marker with animation */}
          {trackingMarkers.rider && (
            <Marker 
              position={[trackingMarkers.rider.lat, trackingMarkers.rider.lng]} 
              icon={riderIcon}
              zIndexOffset={2000}
            >
              <Tooltip permanent direction="top" offset={[0, -20]}>
                <strong>🛵 Delivery Partner</strong>
              </Tooltip>
            </Marker>
          )}

          {/* Line from rider to destination (restaurant or customer) */}
          {trackingMarkers.rider && (
            <Polyline
              positions={
                trackingMarkers.status === 'picked_up' && trackingMarkers.customer
                  ? [[trackingMarkers.rider.lat, trackingMarkers.rider.lng], [trackingMarkers.customer.lat, trackingMarkers.customer.lng]]
                  : [[trackingMarkers.rider.lat, trackingMarkers.rider.lng], [trackingMarkers.vendor.lat, trackingMarkers.vendor.lng]]
              }
              pathOptions={{ color: '#6366f1', weight: 4, dashArray: '8, 8', opacity: 0.7 }}
            />
          )}

          {/* Line from restaurant to customer */}
          {trackingMarkers.customer && (
            <Polyline
              positions={[
                [trackingMarkers.vendor.lat, trackingMarkers.vendor.lng],
                [trackingMarkers.customer.lat, trackingMarkers.customer.lng]
              ]}
              pathOptions={{ color: '#f97316', weight: 3, dashArray: '4, 8', opacity: 0.3 }}
            />
          )}
        </>
      )}

      {/* Route Mode (delivery dashboard) */}
      {showRoute && !showTracking && (
        <>
          <Marker position={[routeOrigin.lat, routeOrigin.lng]} icon={pickupIcon}>
            <Popup>Pickup Point</Popup>
          </Marker>
          <Marker position={[routeDestination.lat, routeDestination.lng]} icon={dropoffIcon}>
            <Popup>Dropoff Point</Popup>
          </Marker>
          <Polyline
            positions={[
              [routeOrigin.lat, routeOrigin.lng],
              [routeDestination.lat, routeDestination.lng]
            ]}
            pathOptions={{ color: '#f97316', weight: 5, dashArray: '10, 10' }}
          />
        </>
      )}

      {/* User Location (normal mode) */}
      {center && !showRoute && !showTracking && (
        <Marker position={mapCenter} icon={userIcon}>
          <Popup>You are here</Popup>
        </Marker>
      )}

      {/* Vendor Markers (normal mode) */}
      {!showRoute && !showTracking && vendors.map(vendor => {
        const isHighlighted = vendor.id === highlightedVendorId;
        return (
          <Marker
            key={vendor.id}
            position={[vendor.lat, vendor.lng]}
            icon={isHighlighted ? vendorIconHighlighted : vendorIcon}
            zIndexOffset={isHighlighted ? 1000 : 0}
            eventHandlers={{
              click: () => onVendorSelect && onVendorSelect(vendor)
            }}
          >
            {isHighlighted ? (
              <Tooltip permanent direction="top" offset={[0, -20]} className="vendor-tooltip">
                <strong>{vendor.name}</strong><br/>
                <span style={{fontSize:'11px',color:'#666'}}>⭐ {vendor.rating} • {vendor.type}</span>
              </Tooltip>
            ) : (
              <Popup>
                <strong>{vendor.name}</strong><br />
                ⭐ {vendor.rating} • {vendor.type}
              </Popup>
            )}
          </Marker>
        );
      })}
    </MapContainer>
  );
}

// Custom memo comparator: only re-render when meaningful props actually change
function mapsAreEqual(prev, next) {
  // Compare center numerically (not by reference)
  const prevLat = Array.isArray(prev.center) ? prev.center[0] : prev.center?.lat;
  const prevLng = Array.isArray(prev.center) ? prev.center[1] : prev.center?.lng;
  const nextLat = Array.isArray(next.center) ? next.center[0] : next.center?.lat;
  const nextLng = Array.isArray(next.center) ? next.center[1] : next.center?.lng;
  if (Math.abs(prevLat - nextLat) > 0.003 || Math.abs(prevLng - nextLng) > 0.003) return false;

  // Compare vendor list by ID only (ignore rating/menu changes that don't affect map)
  if (prev.vendors?.length !== next.vendors?.length) return false;
  if (prev.vendors && next.vendors) {
    for (let i = 0; i < prev.vendors.length; i++) {
      if (prev.vendors[i].id !== next.vendors[i].id ||
          prev.vendors[i].lat !== next.vendors[i].lat ||
          prev.vendors[i].lng !== next.vendors[i].lng) return false;
    }
  }

  if (prev.highlightedVendorId !== next.highlightedVendorId) return false;
  if (prev.routeOrigin?.lat !== next.routeOrigin?.lat) return false;
  if (prev.routeDestination?.lat !== next.routeDestination?.lat) return false;
  if (JSON.stringify(prev.trackingMarkers) !== JSON.stringify(next.trackingMarkers)) return false;

  return true; // Props are effectively equal — skip re-render
}

export default React.memo(MapComponent, mapsAreEqual);
