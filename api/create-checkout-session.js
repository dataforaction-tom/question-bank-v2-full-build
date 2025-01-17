import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseServer = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
    return;
  }

  console.log('Received checkout request:', req.body); // Debug request

  try {
    const { userId, priceId, organizationName } = req.body;

    console.log('Creating checkout session with:', { // Debug params
      userId,
      priceId,
      organizationName
    });

    if (!userId || !organizationName) {
      console.error('Missing required parameters');
      return res.status(400).json({
        error: 'Missing required parameters'
      });
    }

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
        userId: userId.toString(),
        organizationName: organizationName.toString(),
      },
      customer_creation: 'always',
      subscription_data: {
        metadata: {
          userId: userId.toString(),
          organizationName: organizationName.toString(),
        },
      },
      success_url: `${process.env.CLIENT_URL}/organization-signup?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/organization-signup?canceled=true`,
    });

    console.log('Created session with metadata:', { // Debug session metadata
      sessionId: session.id,
      metadata: session.metadata,
      customerId: session.customer,
    });

    res.json({ sessionId: session.id });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ 
      error: 'Failed to create checkout session',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
} 