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
    // Log the incoming request details
    console.log('Webhook received');
    console.log('Stripe-Signature:', req.headers['stripe-signature']);

    const rawBody = await getRawBody(req);
    
    // Verify we're getting the raw body
    console.log('Raw body received:', rawBody.toString());

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        req.headers['stripe-signature'],
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('⚠️ Webhook signature verification failed:', err.message);
      console.log('🔑 Webhook Secret (first 4 chars):', process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 4));
      return res.status(400).json({
        error: `Webhook Error: ${err.message}`
      });
    }

    console.log('✅ Event type:', event.type);
    console.log('📦 Event data:', JSON.stringify(event.data.object, null, 2));

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log('🔍 Session metadata:', session.metadata);
        
        // First, check if a group with this stripe_customer_id already exists
        const { data: existingOrg } = await supabaseServer
          .from('organizations')
          .select()
          .eq('stripe_customer_id', session.customer)
          .single();

        if (existingOrg) {
          console.log('Group already exists:', existingOrg);
          return res.json({ 
            received: true, 
            message: 'Group already processed' 
          });
        }

        // Validate required metadata
        if (!session.metadata?.organizationName || !session.metadata?.userId) {
          console.error('Missing required metadata:', session.metadata);
          return res.status(400).json({ 
            error: 'Missing required metadata' 
          });
        }

        const organizationData = {
          name: session.metadata.organizationName,
          created_by: session.metadata.userId,
          subscription_status: 'active',
          stripe_subscription_id: session.subscription,
          stripe_customer_id: session.customer
        };

        console.log('📝 Creating organization with data:', organizationData);
        const { data: org, error: orgError } = await supabaseServer
          .from('organizations')
          .insert([organizationData])
          .select()
          .single();

        if (orgError) {
          console.error('❌ Error creating organization:', orgError);
          throw orgError;
        }
        console.log('✅ Organization created:', org);

        const { error: userError } = await supabaseServer
          .from('organization_users')
          .insert([{
            organization_id: org.id,
            user_id: session.metadata.userId,
            role: 'admin'
          }]);

        if (userError) throw userError;
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