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

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      
      // First, check if an organization with this stripe_customer_id already exists
      const { data: existingOrg } = await supabaseServer
        .from('organizations')
        .select()
        .eq('stripe_customer_id', session.customer)
        .single();

      if (existingOrg) {
        console.log('Organization already exists:', existingOrg);
        return res.json({ 
          received: true, 
          message: 'Organization already processed' 
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

      console.log('Creating organization with data:', organizationData);

      // Create organization
      const { data: org, error: orgError } = await supabaseServer
        .from('organizations')
        .insert([organizationData])
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
        console.error('User link error:', userError);
        return res.status(400).json({ error: userError.message });
      }

      return res.json({ success: true });
    }

    // Handle other event types
    return res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(400).json({ error: err.message });
  }
} 