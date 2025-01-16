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
  try {
    const rawBody = await getRawBody(req);
    const event = stripe.webhooks.constructEvent(
      rawBody,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    );

    console.log('✅ Event type:', event.type);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        
        // Add logging to debug metadata
        console.log('Session metadata:', session.metadata);
        
        // Validate required metadata
        if (!session.metadata?.organizationName || !session.metadata?.userId) {
          console.error('Missing required metadata:', session.metadata);
          return res.status(400).json({ error: 'Missing required metadata' });
        }

        // 1. Create the organization
        const { data: org, error: orgError } = await supabaseServer
          .from('organizations')
          .insert([{
            name: session.metadata.organizationName,
            created_by: session.metadata.userId,
            subscription_status: 'active',
            stripe_customer_id: session.customer
          }])
          .select()
          .single();

        if (orgError) {
          console.error('Organization creation error:', orgError);
          throw orgError;
        }

        // 2. Add the user as an admin
        const { error: userError } = await supabaseServer
          .from('organization_users')
          .insert([{
            organization_id: org.id,
            user_id: session.metadata.userId,
            role: 'admin'
          }]);

        if (userError) {
          console.error('User association error:', userError);
          throw userError;
        }

        return res.json({ received: true });
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        
        // Get organization by subscription ID
        const { data: org, error: orgError } = await supabaseServer
          .from('organizations')
          .select()
          .eq('stripe_subscription_id', subscription.id)
          .single();

        if (orgError) throw orgError;

        // Update subscription status
        const updates = {
          subscription_status: subscription.status,
          cancellation_date: subscription.cancel_at 
            ? new Date(subscription.cancel_at * 1000).toISOString()
            : null
        };

        const { error: updateError } = await supabaseServer
          .from('organizations')
          .update(updates)
          .eq('id', org.id);

        if (updateError) throw updateError;
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        
        // Get organization by subscription ID
        const { data: org, error: orgError } = await supabaseServer
          .from('organizations')
          .select()
          .eq('stripe_subscription_id', subscription.id)
          .single();

        if (orgError) throw orgError;

        // Update organization status to inactive
        const { error: updateError } = await supabaseServer
          .from('organizations')
          .update({ 
            subscription_status: 'inactive',
            cancellation_date: new Date().toISOString()
          })
          .eq('id', org.id);

        if (updateError) throw updateError;
        break;
      }

      case 'customer.subscription.trial_will_end': {
        // Handle trial ending notification if you implement trials
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        
        // Get organization by customer ID
        const { data: org, error: orgError } = await supabaseServer
          .from('organizations')
          .select()
          .eq('stripe_customer_id', invoice.customer)
          .single();

        if (orgError) throw orgError;

        // Update organization status to payment_failed
        const { error: updateError } = await supabaseServer
          .from('organizations')
          .update({ subscription_status: 'payment_failed' })
          .eq('id', org.id);

        if (updateError) throw updateError;
        break;
      }
    }

    return res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(400).json({ error: err.message });
  }
} 