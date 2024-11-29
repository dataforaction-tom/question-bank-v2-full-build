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
    const { organizationId } = req.body;

    // Get organization's Stripe customer ID
    const { data: org, error: orgError } = await supabaseServer
      .from('organizations')
      .select('stripe_customer_id')
      .eq('id', organizationId)
      .single();

    if (orgError || !org) {
      throw new Error('Organization not found');
    }

    // Create Stripe portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: `${process.env.CLIENT_URL}/organization-dashboard`,
      configuration: process.env.STRIPE_PORTAL_CONFIGURATION_ID // Optional: Use if you have a custom portal configuration
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Portal session error:', error);
    res.status(500).json({ error: error.message });
  }
} 