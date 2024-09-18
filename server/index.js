// server/index.js
const express = require('express');
const app = express();
const Stripe = require('stripe');
const stripe = Stripe('your-stripe-secret-key');
const bodyParser = require('body-parser');
const cors = require('cors');

app.use(cors());
app.use(bodyParser.json());

// Endpoint to create a checkout session
app.post('/create-checkout-session', async (req, res) => {
  const { priceId, organizationId } = req.body;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: 'http://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: 'http://localhost:3000/cancel',
    metadata: {
      organizationId: organizationId,
    },
  });

  res.json({ sessionId: session.id });
});

// Webhook endpoint to handle Stripe events
app.post('/webhook', bodyParser.raw({ type: 'application/json' }), (req, res) => {
  const event = req.body;

  // Handle the event
  switch (event.type) {
    case 'customer.subscription.created':
      // Update your database
      break;
    // ... handle other event types
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

app.listen(4242, () => console.log('Server running on port 4242'));
