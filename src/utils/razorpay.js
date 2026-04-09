/**
 * useRazorpay — React hook for professional Razorpay UPI payment integration
 * Loads the Razorpay checkout script once, creates server-side order, opens checkout,
 * verifies signature server-side, and resolves with payment details.
 */

const API_BASE = 'http://localhost:5000/api';

// Load Razorpay script once globally
let scriptLoadPromise = null;
function loadRazorpayScript() {
  if (scriptLoadPromise) return scriptLoadPromise;
  scriptLoadPromise = new Promise((resolve, reject) => {
    if (window.Razorpay) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () => { scriptLoadPromise = null; reject(new Error('Failed to load Razorpay SDK')); };
    document.body.appendChild(script);
  });
  return scriptLoadPromise;
}

/**
 * Initiate a Razorpay UPI payment.
 * 
 * @param {Object} options
 * @param {number}   options.amount       - Amount in ₹ (not paise)
 * @param {string}   options.name         - Customer name
 * @param {string}   options.email        - Customer email (optional)
 * @param {string}   options.phone        - Customer phone
 * @param {string}   options.description  - Payment description shown in checkout
 * @param {string}   options.orderId      - Your internal order ID (stored in notes)
 * @param {string}   options.prefillUpi   - Pre-fill UPI method
 * @returns {Promise<{paymentId, razorpayOrderId}>} - Resolves on successful verified payment
 */
export async function initiateRazorpayPayment({ amount, name, email, phone, description, orderId }) {
  // 1. Load SDK
  await loadRazorpayScript();

  // 2. Create server-side Razorpay order (keeps secret key off browser)
  const createRes = await fetch(`${API_BASE}/payment/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount,
      currency: 'INR',
      receipt: `rcpt_${orderId}`,
      notes: { internalOrderId: orderId, customerName: name },
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create payment order');
  }

  const { orderId: rzpOrderId, keyId } = await createRes.json();

  // 3. Open Razorpay checkout
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: keyId,
      amount: Math.round(amount * 100), // paise
      currency: 'INR',
      name: 'StreetConnect',
      description,
      order_id: rzpOrderId,
      image: '', // Can add logo URL
      prefill: {
        name,
        email: email || 'customer@streetconnect.in',
        contact: phone || '',
        method: 'upi',
      },
      modal: {
        ondismiss: () => reject(new Error('DISMISSED')),
      },
      handler: async (response) => {
        // 4. Verify signature server-side
        try {
          const verifyRes = await fetch(`${API_BASE}/payment/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          const verifyData = await verifyRes.json();
          if (!verifyData.success) {
            reject(new Error('Payment verification failed on server'));
            return;
          }
          resolve({
            paymentId: response.razorpay_payment_id,
            razorpayOrderId: response.razorpay_order_id,
          });
        } catch (e) {
          reject(e);
        }
      },
    });

    rzp.on('payment.failed', (response) => {
      reject(new Error(response.error?.description || 'Payment failed'));
    });

    rzp.open();
  });
}
