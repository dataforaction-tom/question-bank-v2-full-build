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

  try {
    const { userId, priceId, organizationName } = req.body;

    // Validate inputs
    if (!userId || !priceId || !organizationName) {
      return res.status(400).json({ 
        error: 'Missing required fields' 
      });
    }

    // Check existing subscription
    const { data: existingOrg, error: checkError } = await supabaseServer
      .from('organizations')
      .select('subscription_status')
      .eq('created_by', userId)
      .eq('subscription_status', 'active')
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existingOrg) {
      return res.status(400).json({ 
        error: 'User already has an active subscription' 
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
        userId,
        organizationName,
      },
      success_url: `${process.env.CLIENT_URL}/organization-signup?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/organization-signup?canceled=true`,
    });

    res.json({ sessionId: session.id });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'Failed to create checkout session',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
} 