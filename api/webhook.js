import Stripe from 'stripe';
import { buffer } from 'micro';
import { createClient } from '@supabase/supabase-js';

// Disable body parsing, need raw body for webhook signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

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

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        const { userId, organizationName } = session.metadata;
        
        // Create organization with active subscription
        const { data: org, error: orgError } = await supabaseServer
          .from('organizations')
          .insert([
            {
              name: organizationName,
              created_by: userId,
              subscription_status: 'active',
              stripe_subscription_id: session.subscription,
              stripe_customer_id: session.customer
            }
          ])
          .single();

        if (orgError) throw orgError;

        // Create organization_users entry
        const { error: userError } = await supabaseServer
          .from('organization_users')
          .insert([
            {
              organization_id: org.id,
              user_id: userId,
              role: 'admin'
            }
          ]);

        if (userError) throw userError;
        break;

      case 'customer.subscription.deleted':
        const subscription = event.data.object;
        
        const { error: updateError } = await supabaseServer
          .from('organizations')
          .update({ subscription_status: 'inactive' })
          .eq('stripe_subscription_id', subscription.id);

        if (updateError) throw updateError;
        break;
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
} 