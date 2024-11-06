import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Initialize Supabase with service key for admin access
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseServer = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).end('Method Not Allowed');
    return;
  }

  const { session_id } = req.query;

  if (!session_id) {
    return res.status(400).json({ error: 'Missing session_id parameter' });
  }

  try {
    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);

    // Check if the session is associated with a subscription
    if (session.subscription) {
      // Get subscription details
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      
      // Check if the organization exists and update its status if needed
      const { data: org, error: orgError } = await supabaseServer
        .from('organizations')
        .select('*')
        .eq('stripe_subscription_id', session.subscription)
        .single();

      if (orgError && orgError.code !== 'PGRST116') {
        console.error('Error checking organization:', orgError);
      }

      // If organization exists but status doesn't match subscription status
      if (org && org.subscription_status !== subscription.status) {
        const { error: updateError } = await supabaseServer
          .from('organizations')
          .update({ subscription_status: subscription.status })
          .eq('id', org.id);

        if (updateError) {
          console.error('Error updating organization status:', updateError);
        }
      }
    }

    res.json({ 
      data: {
        ...session,
        payment_status: session.payment_status,
        subscription_status: session.subscription ? 'active' : null
      } 
    });
  } catch (error) {
    console.error('Error retrieving session:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve session',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
