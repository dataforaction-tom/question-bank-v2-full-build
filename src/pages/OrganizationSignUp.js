import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useStripe } from '@stripe/react-stripe-js';
import { useLocation, useNavigate } from 'react-router-dom';
import { retrieveSession } from '../stripe';
import { 
  TextField, 
  Button, 
  Container, 
  Typography, 
  Paper,
  Box,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import CircleIcon from '@mui/icons-material/Circle';

const STEPS = ['Enter group Details', 'Subscribe', 'Create group'];

const OrganizationSignUp = () => {
  const [organizationName, setOrganizationName] = useState('');
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  const navigate = useNavigate();
  const stripe = useStripe();
  const location = useLocation();

  // Handle redirect from Stripe
  useEffect(() => {
    const handleStripeRedirect = async () => {
      const queryParams = new URLSearchParams(location.search);
      const sessionId = queryParams.get('session_id');
      
      if (sessionId) {
        setLoading(true);
        try {
          console.log('Checking session:', sessionId);
          const { data: session } = await retrieveSession(sessionId);
          console.log('Session data:', session);

          if (session.payment_status === 'paid') {
            // Increase polling attempts and duration
            let attempts = 0;
            const maxAttempts = 10; // Increase from 5 to 10
            
            const checkOrganization = async () => {
              console.log(`Checking for group... Attempt ${attempts + 1}`);
              const { data: { user } } = await supabase.auth.getUser();
              
              // Check both organizations and organization_users tables
              const { data: orgs, error } = await supabase
                .from('organizations')
                .select(`
                  *,
                  organization_users!inner(*)
                `)
                .eq('created_by', user.id)
                .eq('organization_users.user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1);

              if (orgs && orgs.length > 0) {
                console.log('Group found:', orgs[0]);
                setSuccess(true);
                setActiveStep(2);
                // Navigate to dashboard with the new organization
                navigate('/organization-dashboard', { 
                  state: { organizationId: orgs[0].id }
                });
                return;
              }

              if (attempts < maxAttempts) {
                attempts++;
                setTimeout(checkOrganization, 3000); // Increase to 3 seconds
              } else {
                throw new Error('Group creation timeout');
              }
            };

            await checkOrganization();
          }
        } catch (err) {
          console.error('Error handling redirect:', err);
          setError('Could not verify group creation. Please contact support.');
        } finally {
          setLoading(false);
        }
      }
    };

    handleStripeRedirect();
  }, [location.search, organizationName]);

  // Check existing subscription
  useEffect(() => {
    const checkSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('organizations')
          .select('subscription_status')
          .eq('created_by', user.id)
          .single();

        if (data?.subscription_status === 'active') {
          setHasSubscription(true);
          setActiveStep(2); // Skip to final step
        }
      }
    };

    checkSubscription();
  }, []);

  const handleSubscribe = async () => {
    setLoading(true);
    setError(null);
    
    console.log('Stripe instance:', stripe); // Debug stripe instance
    
    try {
      if (!stripe) {
        throw new Error('Stripe has not been initialized yet');
      }

      const { data: { user } } = await supabase.auth.getUser();
      console.log('User:', user); // Debug user
      
      if (!user) {
        throw new Error('You need to be signed in to create a group.');
      }

      console.log('Making checkout session request with:', { // Debug request
        userId: user.id,
        priceId: process.env.REACT_APP_STRIPE_PRICE_ID,
        organizationName
      });

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          priceId: process.env.REACT_APP_STRIPE_PRICE_ID,
          organizationName
        }),
      });

      const data = await response.json();
      console.log('Checkout session response:', data); // Debug response

      if (data.error) {
        throw new Error(data.error);
      }

      console.log('Redirecting to checkout with sessionId:', data.sessionId); // Debug redirect
      const { error: stripeError } = await stripe.redirectToCheckout({ 
        sessionId: data.sessionId 
      });

      if (stripeError) {
        console.error('Stripe redirect error:', stripeError); // Debug stripe error
        throw stripeError;
      }
    } catch (error) {
      console.error('Subscription error:', error);
      setError(error.message || 'An error occurred during subscription. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOrganizationSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('You need to be signed in to create a group.');
      }

      // Check if organization was already created by webhook
      const { data: existingOrg } = await supabase
        .from('organizations')
        .select('id')
        .eq('created_by', user.id)
        .eq('name', organizationName)
        .single();

      if (existingOrg) {
        // Organization already created by webhook
        navigate('/organization-dashboard');
        return;
      }

      // If not created by webhook, create it now
      const { error } = await supabase.from('organizations').insert([
        {
          name: organizationName,
          created_by: user.id,
          subscription_status: 'active'
        },
      ]);

      if (error) throw error;

      navigate('/organization-dashboard');
    } catch (error) {
      console.error('Error creating organization:', error);
      setError(error.message || 'An error occurred while creating the group.');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box sx={{ mt: 2 }}>
            <TextField
              label='Group Name'
              fullWidth
              margin='normal'
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              required
            />
            <Button
              variant='contained'
              color='primary'
              fullWidth
              onClick={handleNext}
              disabled={!organizationName}
              sx={{ mt: 2 }}
            >
              Next
            </Button>
          </Box>
        );

      case 1:
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Subscription Details
            </Typography>
            <Typography variant="body1" paragraph>
              Create your group "{organizationName}" for £100 per year
            </Typography>
            
            <Button
              variant='contained'
              color='primary'
              fullWidth
              onClick={handleSubscribe}
              disabled={loading}
              sx={{ mt: 2 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Subscribe & Continue'}
            </Button>
          </Box>
        );

      case 2:
        return (
          <Box sx={{ mt: 2 }}>
            <form onSubmit={handleOrganizationSignUp}>
              <TextField
                label='Confirm group Name'
                fullWidth
                margin='normal'
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                required
              />
              <Button
                variant='contained'
                color='primary'
                type='submit'
                fullWidth
                disabled={loading}
                sx={{ mt: 2 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Create Group'}
              </Button>
            </form>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Container maxWidth='md'>
      {/* Explainer Cards */}
      <Grid container spacing={4} sx={{ mb: 4, mt: 4 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', borderRadius: 4 }}>
            <CardContent>
              <div className="bg-gradient-to-r from-slate-950 to-sky-900 font-bold text-lg text-white pl-4 p-1 flex justify-between items-center mb-4 rounded">
                <Typography variant="h5" component="div">
                  Group Features
                </Typography>
              </div>
              <List>
                {[
                  'Access to a private group space with up to 20 members',
                  'Private questions',
                  'Ranking for questions and responses',
                  'Kanban prioritisation',
                  'Export and graph features'
                ].map((text, index) => (
                  <ListItem key={index} sx={{ py: 0 }}>
                    <ListItemIcon sx={{ minWidth: 30 }}>
                      <CircleIcon sx={{ fontSize: 8 }} />
                    </ListItemIcon>
                    {text}
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', borderRadius: 4  }}>
            <CardContent>
              <div className="bg-gradient-to-r from-slate-950 to-sky-900 font-bold text-lg text-white pl-4 p-1 flex justify-between items-center mb-4 rounded">
                <Typography variant="h5" component="div">
                  Sign up Process
                </Typography>
              </div>
              <List>
                {[
                  '£100 per year, per group',
                  'Stripe payment',
                  'Online cancellation and account management'
                ].map((text, index) => (
                  <ListItem key={index} sx={{ py: 0 }}>
                    <ListItemIcon sx={{ minWidth: 30 }}>
                      <CircleIcon sx={{ fontSize: 8 }} />
                    </ListItemIcon>
                    {text}
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Sign Up Container */}
      <Paper elevation={3} sx={{ p: 4, mt: 4, borderRadius: 4  }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Payment successful! You can now create your Group.
          </Alert>
        )}

        <div className="bg-gradient-to-r from-slate-950 to-sky-900 font-bold text-lg text-white pl-4 p-1 flex justify-between items-center mb-4 rounded">
          <Typography variant="h5" component="h1">
            Create a Group
          </Typography>
        </div>

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {loading ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : (
          renderStepContent()
        )}
      </Paper>
    </Container>
  );
};

export default OrganizationSignUp;
