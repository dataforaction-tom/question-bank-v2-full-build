import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseServer = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, priceId, organizationName } = req.body;

    // Create the checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        organizationName,
      },
      success_url: `${process.env.REACT_APP_CLIENT_URL}/organization-signup?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.REACT_APP_CLIENT_URL}/organization-signup?canceled=true`,
    });

    return res.json({ sessionId: session.id });
  } catch (error) {
    console.error('Checkout error:', error);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
} 