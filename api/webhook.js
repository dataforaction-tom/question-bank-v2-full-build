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

    console.log('✅ Webhook verified, event type:', event.type);
    console.log('Event data:', JSON.stringify(event.data, null, 2));

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        console.log('Session data:', session);
        
        const { userId, organizationName } = session.metadata;
        
        // Create organization
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
          .select()
          .single();

        if (orgError) {
          console.error('Error creating organization:', orgError);
          throw orgError;
        }

        // Create organization user
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

        console.log('✅ Organization and user created successfully');
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('❌ Webhook error details:', {
      message: err.message,
      stack: err.stack,
      headers: req.headers,
      signature: sig,
      secretPrefix: process.env.STRIPE_WEBHOOK_SECRET?.slice(0, 10) + '...'
    });

    return res.status(400).json({
      error: `Webhook Error: ${err.message}`,
      debug: process.env.NODE_ENV === 'development' ? {
        headers: req.headers,
        signaturePresent: !!sig,
        secretPresent: !!process.env.STRIPE_WEBHOOK_SECRET
      } : undefined
    });
  }
} 