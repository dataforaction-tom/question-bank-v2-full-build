import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseServer = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const { organizationId, returnUrl } = req.body;

    // Get organization details from Supabase
    const { data: org, error: orgError } = await supabaseServer
      .from('organizations')
      .select('stripe_customer_id')
      .eq('id', organizationId)
      .single();

    if (orgError || !org) {
      console.error('Error fetching organization:', orgError);
      return res.status(404).json({ error: 'Organization not found' });
    }

    if (!org.stripe_customer_id) {
      return res.status(400).json({ error: 'No associated Stripe customer' });
    }

    // Create Stripe billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: returnUrl || process.env.CLIENT_URL,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Portal session error:', error);
    res.status(500).json({ 
      error: 'Failed to create portal session',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
} 