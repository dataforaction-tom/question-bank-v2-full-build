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

    // Validate environment variables
    if (!process.env.CLIENT_URL) {  // Changed from REACT_APP_CLIENT_URL
      console.error('Missing CLIENT_URL environment variable');
      throw new Error('Server configuration error');
    }

    // Log the URL we're using (for debugging)
    console.log('Client URL:', process.env.CLIENT_URL);

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
      // Use CLIENT_URL instead of REACT_APP_CLIENT_URL
      success_url: new URL('/organization-signup?session_id={CHECKOUT_SESSION_ID}', 
        process.env.CLIENT_URL).toString(),
      cancel_url: new URL('/organization-signup?canceled=true', 
        process.env.CLIENT_URL).toString(),
    });

    console.log('Session created successfully:', {
      sessionId: session.id,
      metadata: session.metadata,
      successUrl: session.success_url,
      cancelUrl: session.cancel_url
    });

    return res.json({ sessionId: session.id });
  } catch (error) {
    console.error('Checkout session error details:', {
      message: error.message,
      type: error.type,
      stack: error.stack,
      stripeCode: error.code
    });

    return res.status(500).json({ 
      error: 'Failed to create checkout session',
      details: error.message
    });
  }
} 