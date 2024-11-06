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

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    console.log('Webhook event received:', event.type); // Debug event type
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        console.log('Checkout session completed:', session); // Debug session data
        
        const { userId, organizationName } = session.metadata;
        console.log('Creating organization for:', { userId, organizationName }); // Debug metadata

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

        if (orgError) {
          console.error('Error creating organization:', orgError);
          throw orgError;
        }
        console.log('Organization created:', org); // Debug org creation

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

        if (userError) {
          console.error('Error creating organization user:', userError);
          throw userError;
        }
        console.log('Organization user created'); // Debug user creation
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
} 