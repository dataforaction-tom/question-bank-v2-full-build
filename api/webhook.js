import Stripe from 'stripe';
import getRawBody from 'raw-body';
import { createClient } from '@supabase/supabase-js';

// Disable body parsing
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
  console.log('💡 Webhook received');
  console.log('Method:', req.method);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  
  if (req.method !== 'POST') {
    console.log('❌ Not a POST request');
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const sig = req.headers['stripe-signature'];
  console.log('Stripe signature:', sig);
  console.log('Webhook secret:', process.env.STRIPE_WEBHOOK_SECRET?.slice(0, 10) + '...');
  
  try {
    // Log the raw request
    const rawBody = await getRawBody(req);
    console.log('Raw body length:', rawBody.length);
    console.log('Raw body preview:', rawBody.toString().slice(0, 100) + '...');

    // Verify webhook signature
    console.log('Attempting to verify webhook...');
    const event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    console.log('✅ Event type:', event.type);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      console.log('Creating organization with data:', {
        name: session.metadata.organizationName,
        created_by: session.metadata.userId,
        subscription_status: 'active',
        stripe_subscription_id: session.subscription,
        stripe_customer_id: session.customer
      });

      const { data: org, error: orgError } = await supabaseServer
        .from('organizations')
        .insert([
          {
            name: session.metadata.organizationName,
            created_by: session.metadata.userId,
            subscription_status: 'active',
            stripe_subscription_id: session.subscription,
            stripe_customer_id: session.customer
          }
        ])
        .select()
        .single();

      if (orgError) {
        console.error('Database error:', orgError);
        return res.status(400).json({ error: orgError.message });
      }

      console.log('Organization created:', org);

      // Create organization user
      const { error: userError } = await supabaseServer
        .from('organization_users')
        .insert([
          {
            organization_id: org.id,
            user_id: session.metadata.userId,
            role: 'admin'
          }
        ]);

      if (userError) {
        console.error('Supabase user link error:', userError);
        throw userError;
      }

      console.log('✅ Organization and user created successfully');
      return res.json({ received: true });
    }

    // Handle other event types
    return res.json({ received: true });
  } catch (err) {
    console.error('Webhook processing error:', err);
    return res.status(400).json({ error: err.message });
  }
} 