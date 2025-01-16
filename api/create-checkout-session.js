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

  console.log('Received checkout request:', req.body);

  try {
    const { userId, priceId, organizationName } = req.body;

    // Get user email from Supabase
    const { data: userData, error: userError } = await supabaseServer
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    console.log('Creating checkout session with:', {
      userId,
      priceId,
      organizationName,
      userEmail: userData.email
    });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_creation: 'always', // Always create a new customer
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
      subscription_data: {
        metadata: {
          userId,
          organizationName,
        },
      },
      customer_email: userData.email, // Pre-fill customer email
      success_url: `${process.env.CLIENT_URL}/organization-signup?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/organization-signup?canceled=true`,
    });

    console.log('Created session:', {
      sessionId: session.id,
      customerId: session.customer,
      subscriptionId: session.subscription
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