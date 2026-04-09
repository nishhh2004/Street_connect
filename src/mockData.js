export const VENDORS = [
  {
    id: 'v1',
    name: 'Spicy Wrap Co.',
    rating: 4.8,
    lat: 40.7128,
    lng: -74.0060,
    type: 'Mexican',
    isOpen: true,
    menu: [
      { id: 'm1', name: 'Chicken Wrap', price: 8.99, available: true },
      { id: 'm2', name: 'Veggie Tacos', price: 7.99, available: true },
    ]
  },
  {
    id: 'v2',
    name: 'Burger Street',
    rating: 4.5,
    lat: 40.7140,
    lng: -74.0080,
    type: 'American',
    isOpen: true,
    menu: [
      { id: 'm3', name: 'Classic Burger', price: 9.99, available: true },
      { id: 'm4', name: 'Cheese Fries', price: 4.99, available: true },
    ]
  },
  {
    id: 'v3',
    name: 'Tokyo Cart',
    rating: 4.9,
    lat: 40.7110,
    lng: -74.0040,
    type: 'Japanese',
    isOpen: true,
    menu: [
      { id: 'm5', name: 'Salmon Roll', price: 12.99, available: true },
      { id: 'm6', name: 'Miso Soup', price: 4.99, available: true },
    ]
  },
   {
    id: 'v4',
    name: 'Halal Guys',
    rating: 4.7,
    lat: 40.7150,
    lng: -74.0090,
    type: 'Middle Eastern',
    isOpen: true,
    menu: [
      { id: 'm7', name: 'Chicken and Gyro Platter', price: 11.99, available: true },
    ]
  }
];

export const INITIAL_ORDERS = [
  {
    id: 'o1',
    vendorId: 'v1',
    customerId: 'c1',
    items: [{ name: 'Chicken Wrap', qty: 1 }],
    total: 8.99,
    status: 'pending', // pending, accepted, ready, picked_up, delivered
    deliveryAddress: '123 Main St, New York',
    customerLat: 40.7135,
    customerLng: -74.0075,
  }
];

export const MOCK_USERS = {
  customer: { id: 'c1', name: 'Alice Customer' },
  vendor: { id: 'v1', name: 'Spicy Wrap Co. Owner' },
  delivery: { id: 'd1', name: 'Bob Driver' }
};
