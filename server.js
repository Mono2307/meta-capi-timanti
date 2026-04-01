const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
app.use(express.json());

// ====== CONFIG (REPLACE THESE) ======
const PIXEL_ID = process.env.META_PIXEL_ID;
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

// ====== HELPERS ======
function hash(value) {
  if (!value) return undefined;
  return crypto
    .createHash('sha256')
    .update(String(value).trim().toLowerCase())
    .digest('hex');
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

// Health check (useful for Fly/Render)
app.get('/', (req, res) => {
  res.status(200).send('OK');
});

// ====== SHOPIFY WEBHOOK: ORDER CREATE ======
app.post('/webhook/order', async (req, res) => {
  // Respond ASAP so Shopify doesn't retry
  res.sendStatus(200);

  try {
    const order = req.body || {};

    // ---- Basic mapping from Shopify payload ----
    const orderId = order.id || order.order_number || nowSeconds();
    const eventId = `order_${orderId}`;

    const email = order.email || (order.customer && order.customer.email);
    const phone = order.phone || (order.customer && order.customer.phone);

    const firstName =
      (order.customer && order.customer.first_name) || undefined;
    const lastName =
      (order.customer && order.customer.last_name) || undefined;

    const currency =
      order.currency ||
      (order.total_price_set &&
        order.total_price_set.shop_money &&
        order.total_price_set.shop_money.currency_code) ||
      'INR';

    const value = parseFloat(
      order.total_price ||
        (order.total_price_set &&
          order.total_price_set.shop_money &&
          order.total_price_set.shop_money.amount) ||
        0
    );

    // Line items → contents
    const contents = Array.isArray(order.line_items)
      ? order.line_items.map((item) => ({
          id: String(item.product_id || item.sku || item.id),
          quantity: item.quantity || 1,
          item_price: parseFloat(item.price || 0),
        }))
      : [];

    // ---- Build Meta payload ----
    const payload = {
      data: [
        {
          event_name: 'Purchase',
          event_time: nowSeconds(),
          event_id: eventId, // must match Pixel eventID for dedup
          action_source: 'website',

          user_data: {
            em: hash(email),
            ph: hash(phone),
            fn: hash(firstName),
            ln: hash(lastName),
            // Add more if available:
            // ct: hash(city),
            // st: hash(state),
            // zp: hash(zip),
            // country: hash(country),
          },

          custom_data: {
            value: value,
            currency: currency,
            contents: contents,
            content_type: 'product',
          },
        },
      ],

      // Optional for testing in Events Manager → Test Events
      // test_event_code: 'TEST123',
    };

    // ---- Send to Meta CAPI ----
    const url = `https://graph.facebook.com/v18.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`;

    const resp = await axios.post(url, payload);

    console.log('✅ Meta CAPI success:', {
      event_id: eventId,
      fb_trace_id: resp.data && resp.data.fbtrace_id,
      value,
      currency,
    });
  } catch (err) {
    const msg =
      (err.response && JSON.stringify(err.response.data)) || err.message;
    console.error('❌ Meta CAPI error:', msg);
  }
});

// ====== START SERVER ======
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on ${PORT}`);
});
