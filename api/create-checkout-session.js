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

    // Check if user exists and is email verified
    const { data: user, error: userError } = await supabaseServer
      .auth.admin.getUserById(userId);

    if (userError || !user) {
      console.error('User not found:', userError);
      return res.status(400).json({
        error: 'User not found'
      });
    }

    if (!user.user.email_confirmed_at) {
      return res.status(403).json({
        error: 'Email not verified',
        message: 'Please verify your email before starting a trial'
      });
    }

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
      subscription_data: {
        trial_period_days: 60,
        trial_settings: {
          end_behavior: {
            missing_payment_method: 'pause'
          }
        },
        metadata: {
          userId: userId.toString(),
          organizationName: organizationName.toString(),
        },
      },
      payment_method_collection: 'if_required', // Makes card input optional
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