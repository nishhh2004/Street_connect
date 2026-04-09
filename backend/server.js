require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const kafka = require('./kafka');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const Razorpay = require('razorpay');

const app = express();
app.use(cors());
app.use(express.json());

const EVENTS_TOPIC = 'street-connect-events';
const VENDORS_TOPIC = 'street-connect-vendors';
const FSQ_API_KEY = process.env.FOURSQUARE_API_KEY;

// ===== RAZORPAY =====
const RZP_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_SbCIEHCJVsyWMc';
const RZP_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'h9DMuW1s7NdCY4B7nEmu6mSP';

const razorpay = new Razorpay({
  key_id: RZP_KEY_ID,
  key_secret: RZP_KEY_SECRET,
});

const DEFAULT_LAT = 12.9716;
const DEFAULT_LNG = 77.5946;

let vendors = [];
let orders = [];
let kafkaConnected = false;
let vendorsLoaded = false;

// Track manual vendor mutations so polling doesn't overwrite them
let vendorMutations = {}; // vendorId -> { isOpen?, menu? }

const producer = kafka.producer();

// ===== USER DATABASE =====
const USERS_FILE = path.join(__dirname, 'users.json');

function loadUsers() {
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

// ===== AUTH ENDPOINTS =====
app.post('/api/auth/signup', async (req, res) => {
  const { name, phone, email, password } = req.body;
  
  if (!name || !phone || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  // Validate domain
  if (!email.includes('@user') && !email.includes('@admin') && !email.includes('@rider')) {
    return res.status(400).json({ error: 'Email must contain @user, @admin, or @rider domain.' });
  }

  const users = loadUsers();
  const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists. Please log in.' });
  }

  // Determine role from domain
  let role = 'customer';
  if (email.includes('@admin')) role = 'vendor';
  if (email.includes('@rider')) role = 'delivery';

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = {
    id: `${role}_${Math.random().toString(36).substr(2, 8)}`,
    name,
    phone,
    email: email.toLowerCase(),
    password: hashedPassword,
    role,
    streetVIP: false,
    createdAt: Date.now()
  };

  users.push(user);
  saveUsers(users);

  // Return user WITHOUT password
  const { password: _, ...safeUser } = user;
  res.status(201).json({ success: true, user: safeUser });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const users = loadUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  
  if (!user) {
    return res.status(401).json({ error: 'No account found with this email. Please sign up first.' });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Incorrect password. Please try again.' });
  }

  const { password: _, ...safeUser } = user;
  res.json({ success: true, user: safeUser });
});

app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }
  const users = loadUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(404).json({ error: 'No account found with this email.' });
  }
  // Simulated — no real email sent
  res.json({ success: true, message: 'Password reset link has been sent to your email.' });
});


// ===== MENU GENERATION =====
function generateMenu(name, type) {
  const n = (name + type).toLowerCase();
  if (n.includes('dosa') || n.includes('south') || n.includes('udupi') || n.includes('idli') || n.includes('tiffin')) {
    return [
      { id: `m_${rnd()}`, name: 'Masala Dosa', price: 70, available: true, category: 'South Indian' },
      { id: `m_${rnd()}`, name: 'Rava Dosa', price: 80, available: true, category: 'South Indian' },
      { id: `m_${rnd()}`, name: 'Set Dosa (3 pcs)', price: 60, available: true, category: 'South Indian' },
      { id: `m_${rnd()}`, name: 'Idli Vada Combo', price: 50, available: true, category: 'South Indian' },
      { id: `m_${rnd()}`, name: 'Pongal', price: 55, available: true, category: 'South Indian' },
      { id: `m_${rnd()}`, name: 'Medu Vada (2 pcs)', price: 40, available: true, category: 'Snacks' },
      { id: `m_${rnd()}`, name: 'Kesari Bath', price: 35, available: true, category: 'Desserts' },
      { id: `m_${rnd()}`, name: 'Filter Coffee', price: 30, available: true, category: 'Beverages' },
      { id: `m_${rnd()}`, name: 'Buttermilk', price: 20, available: true, category: 'Beverages' },
    ];
  }
  if (n.includes('biryani') || n.includes('mughlai') || n.includes('kebab') || n.includes('muslim') || n.includes('non-veg') || n.includes('non veg')) {
    return [
      { id: `m_${rnd()}`, name: 'Chicken Biryani', price: 180, available: true, category: 'North Indian' },
      { id: `m_${rnd()}`, name: 'Mutton Biryani', price: 250, available: true, category: 'North Indian' },
      { id: `m_${rnd()}`, name: 'Veg Biryani', price: 140, available: true, category: 'North Indian' },
      { id: `m_${rnd()}`, name: 'Mutton Seekh Kebab', price: 220, available: true, category: 'Starters' },
      { id: `m_${rnd()}`, name: 'Chicken 65', price: 160, available: true, category: 'Starters' },
      { id: `m_${rnd()}`, name: 'Rumali Roti', price: 25, available: true, category: 'Breads' },
      { id: `m_${rnd()}`, name: 'Butter Naan', price: 35, available: true, category: 'Breads' },
      { id: `m_${rnd()}`, name: 'Raita', price: 40, available: true, category: 'Sides' },
      { id: `m_${rnd()}`, name: 'Gulab Jamun (2 pcs)', price: 50, available: true, category: 'Desserts' },
    ];
  }
  if (n.includes('chinese') || n.includes('noodle') || n.includes('manchurian') || n.includes('chow') || n.includes('asian')) {
    return [
      { id: `m_${rnd()}`, name: 'Veg Hakka Noodles', price: 120, available: true, category: 'Chinese' },
      { id: `m_${rnd()}`, name: 'Chicken Noodles', price: 150, available: true, category: 'Chinese' },
      { id: `m_${rnd()}`, name: 'Gobi Manchurian', price: 110, available: true, category: 'Chinese' },
      { id: `m_${rnd()}`, name: 'Paneer Chilli', price: 140, available: true, category: 'Chinese' },
      { id: `m_${rnd()}`, name: 'Veg Fried Rice', price: 100, available: true, category: 'Chinese' },
      { id: `m_${rnd()}`, name: 'Chicken Fried Rice', price: 140, available: true, category: 'Chinese' },
      { id: `m_${rnd()}`, name: 'Sweet Corn Soup', price: 80, available: true, category: 'Soups' },
      { id: `m_${rnd()}`, name: 'Fresh Lime Soda', price: 40, available: true, category: 'Beverages' },
    ];
  }
  if (n.includes('chaat') || n.includes('puri') || n.includes('bhel') || n.includes('snack') || n.includes('street')) {
    return [
      { id: `m_${rnd()}`, name: 'Pani Puri (8 pcs)', price: 40, available: true, category: 'Street Food' },
      { id: `m_${rnd()}`, name: 'Sev Puri', price: 50, available: true, category: 'Street Food' },
      { id: `m_${rnd()}`, name: 'Dahi Puri', price: 55, available: true, category: 'Street Food' },
      { id: `m_${rnd()}`, name: 'Bhel Puri', price: 45, available: true, category: 'Street Food' },
      { id: `m_${rnd()}`, name: 'Samosa (2 pcs)', price: 30, available: true, category: 'Snacks' },
      { id: `m_${rnd()}`, name: 'Vada Pav', price: 25, available: true, category: 'Snacks' },
      { id: `m_${rnd()}`, name: 'Kachori', price: 35, available: true, category: 'Snacks' },
      { id: `m_${rnd()}`, name: 'Masala Chai', price: 15, available: true, category: 'Beverages' },
    ];
  }
  if (n.includes('bakery') || n.includes('cafe') || n.includes('coffee') || n.includes('tea')) {
    return [
      { id: `m_${rnd()}`, name: 'Masala Chai', price: 25, available: true, category: 'Beverages' },
      { id: `m_${rnd()}`, name: 'Filter Coffee', price: 40, available: true, category: 'Beverages' },
      { id: `m_${rnd()}`, name: 'Cold Coffee', price: 70, available: true, category: 'Beverages' },
      { id: `m_${rnd()}`, name: 'Veg Puff', price: 30, available: true, category: 'Snacks' },
      { id: `m_${rnd()}`, name: 'Paneer Puff', price: 40, available: true, category: 'Snacks' },
      { id: `m_${rnd()}`, name: 'Bun Maska', price: 35, available: true, category: 'Snacks' },
      { id: `m_${rnd()}`, name: 'Veg Sandwich', price: 60, available: true, category: 'Snacks' },
      { id: `m_${rnd()}`, name: 'Chocolate Cake Slice', price: 80, available: true, category: 'Desserts' },
    ];
  }
  if (n.includes('juice') || n.includes('shake') || n.includes('lassi')) {
    return [
      { id: `m_${rnd()}`, name: 'Fresh Lime Soda', price: 40, available: true, category: 'Beverages' },
      { id: `m_${rnd()}`, name: 'Mango Lassi', price: 50, available: true, category: 'Beverages' },
      { id: `m_${rnd()}`, name: 'Sugarcane Juice', price: 30, available: true, category: 'Beverages' },
      { id: `m_${rnd()}`, name: 'Watermelon Juice', price: 45, available: true, category: 'Beverages' },
      { id: `m_${rnd()}`, name: 'Oreo Milkshake', price: 80, available: true, category: 'Beverages' },
      { id: `m_${rnd()}`, name: 'Butter Fruit Juice', price: 60, available: true, category: 'Beverages' },
    ];
  }
  if (n.includes('pizza') || n.includes('burger') || n.includes('fast food') || n.includes('american')) {
    return [
      { id: `m_${rnd()}`, name: 'Paneer Burger', price: 120, available: true, category: 'Burgers' },
      { id: `m_${rnd()}`, name: 'Aloo Tikki Burger', price: 90, available: true, category: 'Burgers' },
      { id: `m_${rnd()}`, name: 'Masala Fries', price: 80, available: true, category: 'Sides' },
      { id: `m_${rnd()}`, name: 'Peri Peri Fries', price: 100, available: true, category: 'Sides' },
      { id: `m_${rnd()}`, name: 'Margherita Pizza', price: 199, available: true, category: 'Pizzas' },
      { id: `m_${rnd()}`, name: 'Paneer Tikka Pizza', price: 249, available: true, category: 'Pizzas' },
      { id: `m_${rnd()}`, name: 'Cold Coffee', price: 90, available: true, category: 'Beverages' },
    ];
  }
  // Default — North Indian
  return [
    { id: `m_${rnd()}`, name: 'Paneer Butter Masala', price: 160, available: true, category: 'North Indian' },
    { id: `m_${rnd()}`, name: 'Dal Tadka', price: 100, available: true, category: 'North Indian' },
    { id: `m_${rnd()}`, name: 'Chole Bhature', price: 90, available: true, category: 'North Indian' },
    { id: `m_${rnd()}`, name: 'Thali Meal', price: 120, available: true, category: 'Combos' },
    { id: `m_${rnd()}`, name: 'Butter Naan', price: 30, available: true, category: 'Breads' },
    { id: `m_${rnd()}`, name: 'Tandoori Roti', price: 20, available: true, category: 'Breads' },
    { id: `m_${rnd()}`, name: 'Jeera Rice', price: 70, available: true, category: 'Rice' },
    { id: `m_${rnd()}`, name: 'Lassi', price: 35, available: true, category: 'Beverages' },
  ];
}
function rnd() { return Math.random().toString(36).substr(2, 6); }

// Neighbourhood areas for address enrichment
const BANGALORE_ZONES = [
  { name: 'MG Road / Central',    lat: 12.9716, lng: 77.5946 },
  { name: 'Koramangala',          lat: 12.9352, lng: 77.6245 },
  { name: 'Indiranagar',          lat: 12.9784, lng: 77.6408 },
  { name: 'Jayanagar',            lat: 12.9250, lng: 77.5838 },
  { name: 'Malleshwaram',         lat: 12.9970, lng: 77.5700 },
  { name: 'HSR Layout',           lat: 12.9116, lng: 77.6389 },
  { name: 'BTM Layout',           lat: 12.9166, lng: 77.6101 },
  { name: 'Rajajinagar',          lat: 12.9900, lng: 77.5550 },
  { name: 'Basavanagudi',         lat: 12.9430, lng: 77.5730 },
  { name: 'Whitefield',           lat: 12.9698, lng: 77.7500 },
  { name: 'Electronic City',      lat: 12.8440, lng: 77.6630 },
  { name: 'Yelahanka',            lat: 13.1007, lng: 77.5963 },
  { name: 'Bannerghatta Road',    lat: 12.8900, lng: 77.5960 },
  { name: 'JP Nagar',             lat: 12.9063, lng: 77.5857 },
];

// Chains + delivery-app cloud kitchens to exclude
const CHAIN_KEYWORDS = [
  'dominos', 'domino', 'pizza hut', 'mcdonalds', 'mcdonald', 'kfc', 'subway', 'burger king',
  'starbucks', 'dunkin', 'baskin', 'ccd', 'cafe coffee day', 'taco bell',
  'papa john', 'popeyes', 'chick-fil-a', 'wendy', 'five guys',
  'faasos', 'behrouz', 'oven story', 'box8', 'lunchbox', 'firangi bake',
  'eatfit', 'eat fit', 'the bowl company', 'rebel foods', 'sweet truth',
  'wow momo', 'wow! momo', 'chaayos', 'chai point',
  'barbeque nation', 'mainland china', 'absolute barbecue',
  'mojo pizza', 'la pino', 'chicago pizza', 'daily bowl',
];

function nearestZoneName(lat, lng) {
  let minD = Infinity, name = 'Bangalore';
  for (const z of BANGALORE_ZONES) {
    const d = Math.abs(z.lat - lat) + Math.abs(z.lng - lng);
    if (d < minD) { minD = d; name = z.name; }
  }
  return name;
}

// Single bounding box query covering all of Bangalore — ONE API call
async function fetchAllBangaloreVendors() {
  console.log('[OSM] Fetching restaurants across Bangalore with single bbox query...');

  // Bangalore bounding box: South 12.84, West 77.45, North 13.10, East 77.78
  const bbox = '12.84,77.45,13.10,77.78';
  const query = `
    [out:json][timeout:60];
    (
      node["amenity"="restaurant"](${bbox});
      node["amenity"="fast_food"](${bbox});
      node["amenity"="cafe"]["cuisine"](${bbox});
      node["shop"="bakery"](${bbox});
    );
    out body 300;
  `;

  try {
    // Try lz4 mirror first (independent rate limits), then fall back to main
    const OVERPASS_URLS = [
      'https://lz4.overpass-api.de/api/interpreter',
      'https://z.overpass-api.de/api/interpreter',
      'https://overpass-api.de/api/interpreter',
    ];

    let res;
    for (const apiUrl of OVERPASS_URLS) {
      console.log(`[OSM] Trying ${apiUrl}...`);
      try {
        res = await fetch(apiUrl, {
          method: 'POST',
          body: `data=${encodeURIComponent(query)}`,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        if (res.ok) {
          console.log(`[OSM] Success from ${apiUrl}`);
          break;
        }
        console.warn(`[OSM] ${apiUrl} → ${res.status}`);
        res = null;
      } catch (e) {
        console.warn(`[OSM] ${apiUrl} → ${e.message}`);
      }
    }

    if (!res || !res.ok) {
      console.error('[OSM] All Overpass servers failed.');
      return [];
    }

    const data = await res.json();
    const elements = data.elements || [];
    console.log(`[OSM] Raw results: ${elements.length}`);

    // Filter: must have name, exclude chains
    const filtered = elements.filter(el => {
      if (!el.tags?.name) return false;
      const n = el.tags.name.toLowerCase();
      return !CHAIN_KEYWORDS.some(chain => n.includes(chain));
    });

    // Deduplicate by name
    const seen = new Set();
    const unique = filtered.filter(el => {
      const key = el.tags.name.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Limit to 100, sorted stably by OSM ID (no random shuffle — prevents location flickering)
    const shuffled = unique.sort((a, b) => a.id - b.id).slice(0, 100);

    console.log(`[OSM] ${elements.length} raw → ${filtered.length} filtered → ${unique.length} unique → ${shuffled.length} selected.`);

    return shuffled.map(el => {
      const name = el.tags.name;
      const cuisine = el.tags.cuisine || el.tags.amenity || 'Local';
      const formattedCuisine = cuisine.split(/[;,_]/).map(c => c.trim()).slice(0, 2).map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(', ');
      const street = el.tags['addr:street'] || '';
      const neighbourhood = nearestZoneName(el.lat, el.lon);
      const addr = street ? `${street}, ${neighbourhood}` : neighbourhood + ', Bangalore';
      
      return {
        id: `osm_${el.id}`,
        name,
        rating: parseFloat((3.5 + (el.id % 14) / 10).toFixed(1)),
        lat: el.lat,
        lng: el.lon,
        type: formattedCuisine,
        address: addr,
        distance: 0,
        isOpen: true,
        menu: generateMenu(name, cuisine)
      };
    });
  } catch (err) {
    console.error('[OSM] Fetch error:', err.message);
    return [];
  }
}

// ===== FOURSQUARE (optional, if key is valid) =====
async function fetchFoursquareVendors(lat, lng) {
  if (!FSQ_API_KEY) return [];
  try {
    const url = `https://api.foursquare.com/v3/places/search?ll=${lat},${lng}&radius=2000&categories=13065&exclude_all_chains=true&sort=DISTANCE&limit=30&fields=fsq_id,name,geocodes,location,categories,distance`;
    const res = await fetch(url, { headers: { 'Authorization': FSQ_API_KEY, 'Accept': 'application/json' } });
    if (!res.ok) { console.warn(`[FSQ] API ${res.status} — skipping.`); return []; }
    const data = await res.json();
    return (data.results || []).map(p => ({
      id: `fsq_${p.fsq_id}`, name: p.name,
      rating: parseFloat((3.5 + Math.random() * 1.5).toFixed(1)),
      lat: p.geocodes?.main?.latitude, lng: p.geocodes?.main?.longitude,
      type: p.categories?.[0]?.name || 'Local', address: p.location?.formatted_address || '',
      distance: p.distance || 0, isOpen: true,
      menu: generateMenu(p.name, p.categories?.[0]?.name || '')
    }));
  } catch (e) { return []; }
}

// ===== KAFKA =====
const produceEvent = async (topic, type, payload) => {
  if (!kafkaConnected) return;
  try {
    await producer.send({ topic, messages: [{ value: JSON.stringify({ type, payload, timestamp: Date.now() }) }] });
  } catch (error) { console.error("[Kafka] Produce error:", error.message); }
};

const GROUP_ID = 'street-connect-api-v6';

const startConsumer = async () => {
  const consumer = kafka.consumer({ groupId: GROUP_ID });
  const admin = kafka.admin();
  try {
    await admin.connect();
    const topics = await admin.listTopics();
    for (const t of [EVENTS_TOPIC, VENDORS_TOPIC]) {
      if (!topics.includes(t)) { await admin.createTopics({ topics: [{ topic: t, numPartitions: 1 }] }); console.log(`[Admin] Created: ${t}`); }
    }
  } catch (e) { console.warn("[Admin]:", e.message); }
  finally { await admin.disconnect(); }

  await consumer.connect();
  await consumer.subscribe({ topics: [EVENTS_TOPIC, VENDORS_TOPIC], fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      try {
        const evt = JSON.parse(message.value.toString());
        if (topic === VENDORS_TOPIC && evt.type === 'VENDORS_LOADED') {
          if (evt.payload?.length > 0) {
            // Regenerate menus with latest categories when hydrating from Kafka
            vendors = evt.payload.map(v => ({
              ...v,
              menu: generateMenu(v.name, v.type)
            }));
            // Re-apply any manual mutations on top of hydrated data
            applyVendorMutations();
            vendorsLoaded = true;
            console.log(`[Kafka] Hydrated ${vendors.length} vendors from topic (menus regenerated).`);
          }
        }
        if (topic === EVENTS_TOPIC && evt.type === 'ORDER_CREATED') {
          if (!orders.find(o => o.id === evt.payload.id)) orders.push(evt.payload);
        }
      } catch (err) {}
    }
  });
};

// ===== VENDOR MUTATION PERSISTENCE =====
// Re-apply manual mutations (isOpen toggles, menu changes) after data refresh
function applyVendorMutations() {
  for (const [vendorId, mutation] of Object.entries(vendorMutations)) {
    vendors = vendors.map(v => {
      if (v.id !== vendorId) return v;
      let updated = { ...v };
      if (mutation.isOpen !== undefined) updated.isOpen = mutation.isOpen;
      if (mutation.menu) updated.menu = mutation.menu;
      return updated;
    });
  }
}

// ===== DISTANCE =====
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ===== API ENDPOINTS =====
app.get('/api/health', (req, res) => res.json({ status: 'ok', kafka: kafkaConnected, vendors: vendors.length, orders: orders.length }));

// ===== PAYMENT ENDPOINTS =====

/**
 * POST /api/payment/create-order
 * Creates a Razorpay order on the server.
 * The frontend never touches the secret key — it only receives the Razorpay order ID.
 */
app.post('/api/payment/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt, notes = {} } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const options = {
      amount: Math.round(amount * 100), // Razorpay requires paise (integer)
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,
      notes,
    };

    const order = await razorpay.orders.create(options);
    console.log(`[Razorpay] Order created: ${order.id} for ₹${amount}`);

    res.json({
      success: true,
      orderId: order.id,       // rzp_order_id to pass to checkout
      amount: order.amount,    // amount in paise
      currency: order.currency,
      keyId: RZP_KEY_ID,       // Safe to expose — only secret must stay server-side
    });
  } catch (err) {
    console.error('[Razorpay] Create order error:', err);
    res.status(500).json({ error: 'Failed to create payment order', details: err.message });
  }
});

/**
 * POST /api/payment/verify
 * Verifies the Razorpay payment signature using HMAC-SHA256.
 * Must be called after the user completes payment in the Razorpay checkout.
 */
app.post('/api/payment/verify', (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Missing payment verification fields' });
    }

    // Compute expected signature
    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', RZP_KEY_SECRET)
      .update(payload)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(razorpay_signature)
    );

    if (!isValid) {
      console.warn(`[Razorpay] Signature mismatch for order ${razorpay_order_id}`);
      return res.status(400).json({ success: false, error: 'Payment verification failed — signature mismatch' });
    }

    console.log(`[Razorpay] Payment verified: ${razorpay_payment_id} for order ${razorpay_order_id}`);
    res.json({ success: true, paymentId: razorpay_payment_id, orderId: razorpay_order_id });
  } catch (err) {
    console.error('[Razorpay] Verify error:', err);
    res.status(500).json({ success: false, error: 'Verification server error' });
  }
});

app.get('/api/vendors', (req, res) => {
  const { lat, lng } = req.query;
  if (lat && lng) {
    const sorted = vendors.map(v => ({
      ...v, distance: Math.round(haversine(parseFloat(lat), parseFloat(lng), v.lat, v.lng))
    })).sort((a, b) => a.distance - b.distance);
    return res.json(sorted);
  }
  res.json(vendors);
});

app.get('/api/orders', (req, res) => res.json(orders));

app.post('/api/vendors/refresh', async (req, res) => {
  try {
    const allVendors = await fetchAllBangaloreVendors();
    if (allVendors.length > 0) {
      vendors = allVendors;
      // Re-apply mutations after refresh
      applyVendorMutations();
      vendorsLoaded = true;
      produceEvent(VENDORS_TOPIC, 'VENDORS_LOADED', vendors);
      console.log(`[Refresh] ${vendors.length} vendors saved to Kafka.`);
    }
  } catch (e) { console.error('[Refresh] Error:', e.message); }
  res.json({ success: true, count: vendors.length });
});

app.post('/api/orders', async (req, res) => {
  const o = req.body;
  if (!orders.find(x => x.id === o.id)) orders.push(o);
  produceEvent(EVENTS_TOPIC, 'ORDER_CREATED', o);
  res.status(201).json({ success: true });
});

app.put('/api/orders/:id/status', async (req, res) => {
  orders = orders.map(o => o.id === req.params.id ? { ...o, status: req.body.status } : o);
  produceEvent(EVENTS_TOPIC, 'ORDER_STATUS_UPDATED', { orderId: req.params.id, status: req.body.status });
  res.json({ success: true });
});

// Clear all orders
app.delete('/api/orders', (req, res) => {
  orders = [];
  res.json({ success: true, message: 'All orders cleared.' });
});

app.put('/api/vendors/:id/status', (req, res) => {
  const vendorId = req.params.id;
  const vendor = vendors.find(v => v.id === vendorId);
  if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
  
  const newStatus = !vendor.isOpen;
  vendors = vendors.map(v => v.id === vendorId ? { ...v, isOpen: newStatus } : v);
  
  // Persist the mutation so polling doesn't overwrite it
  if (!vendorMutations[vendorId]) vendorMutations[vendorId] = {};
  vendorMutations[vendorId].isOpen = newStatus;
  
  res.json({ success: true, isOpen: newStatus });
});

app.put('/api/vendors/:vendorId/items/:itemId', (req, res) => {
  const { vendorId, itemId } = req.params;
  vendors = vendors.map(v => v.id === vendorId ? { ...v, menu: v.menu.map(m => m.id === itemId ? { ...m, available: !m.available } : m) } : v);
  
  // Persist the full menu mutation
  const vendor = vendors.find(v => v.id === vendorId);
  if (vendor) {
    if (!vendorMutations[vendorId]) vendorMutations[vendorId] = {};
    vendorMutations[vendorId].menu = vendor.menu;
  }
  
  res.json({ success: true });
});

app.post('/api/vendors/:vendorId/items', (req, res) => {
  const { vendorId } = req.params;
  const newItem = {
    id: `m_${Math.random().toString(36).substr(2, 6)}`,
    name: req.body.name,
    price: req.body.price,
    category: req.body.category || 'Menu',
    available: true
  };
  vendors = vendors.map(v => v.id === vendorId ? { ...v, menu: [...v.menu, newItem] } : v);
  
  // Persist the full menu mutation
  const vendor = vendors.find(v => v.id === vendorId);
  if (vendor) {
    if (!vendorMutations[vendorId]) vendorMutations[vendorId] = {};
    vendorMutations[vendorId].menu = vendor.menu;
  }
  
  res.json({ success: true, item: newItem });
});

// ===== STARTUP =====
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`\n🚀 StreetConnect Backend on port ${PORT}`);

  try {
    await producer.connect();
    kafkaConnected = true;
    console.log('[Kafka] Producer ✓');
    startConsumer().then(() => console.log('[Kafka] Consumer ✓')).catch(e => console.warn('[Kafka]:', e.message));
  } catch (e) { console.warn('[Kafka] Offline:', e.message); }

  // Wait for Kafka to hydrate
  await new Promise(r => setTimeout(r, 6000));

  if (!vendorsLoaded || vendors.length === 0) {
    console.log('[Startup] Fetching real restaurants from 10 Bangalore zones...');
    try {
      const allVendors = await fetchAllBangaloreVendors();
      if (allVendors.length > 0) {
        vendors = allVendors;
        vendorsLoaded = true;
        if (kafkaConnected) produceEvent(VENDORS_TOPIC, 'VENDORS_LOADED', vendors);
        console.log(`[Startup] Loaded ${vendors.length} real local restaurants → saved to Kafka.`);
      } else {
        throw new Error('No vendors fetched');
      }
    } catch (e) {
      console.warn('[Startup] OSM fetch failed, using iconic fallback:', e.message);
      vendors = [
        { id: 'v1', name: 'Vidyarthi Bhavan', rating: 4.9, lat: 12.9555, lng: 77.5713, type: 'South Indian', isOpen: true, address: 'Gandhi Bazaar, Basavanagudi', distance: 0,
          menu: [{ id: 'm1', name: 'Benne Dosa', price: 55, available: true }, { id: 'm2', name: 'Kesari Bath', price: 35, available: true }] },
        { id: 'v2', name: 'Shivaji Military Hotel', rating: 4.7, lat: 12.9638, lng: 77.5710, type: 'Non-Veg', isOpen: true, address: 'Jayanagar, Bangalore', distance: 500,
          menu: [{ id: 'm3', name: 'Mutton Dry', price: 250, available: true }, { id: 'm4', name: 'Ragi Mudde', price: 30, available: true }] },
        { id: 'v3', name: 'CTR (Central Tiffin Room)', rating: 4.8, lat: 12.9834, lng: 77.5750, type: 'South Indian', isOpen: true, address: 'Malleshwaram, Bangalore', distance: 1300,
          menu: [{ id: 'm5', name: 'Benne Masala Dosa', price: 70, available: true }, { id: 'm6', name: 'Filter Coffee', price: 25, available: true }] },
      ];
    }
  }

  console.log(`✅ Serving ${vendors.length} vendors | http://localhost:${PORT}/api/vendors\n`);
});
