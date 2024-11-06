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
  Alert
} from '@mui/material';

const STEPS = ['Enter Organization Details', 'Subscribe', 'Create Organization'];

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
          console.log('Checking session:', sessionId); // Debug session check
          const { data: session } = await retrieveSession(sessionId);
          console.log('Session data:', session); // Debug session data

          if (session.payment_status === 'paid') {
            // Poll for organization creation
            let attempts = 0;
            const checkOrganization = async () => {
              console.log('Checking for organization...'); // Debug org check
              const { data: { user } } = await supabase.auth.getUser();
              const { data: org, error } = await supabase
                .from('organizations')
                .select('*')
                .eq('created_by', user.id)
                .eq('name', organizationName)
                .single();

              if (org) {
                console.log('Organization found:', org); // Debug org found
                setSuccess(true);
                setActiveStep(2);
                return;
              }

              if (attempts < 5) {
                attempts++;
                setTimeout(checkOrganization, 2000); // Check every 2 seconds
              } else {
                throw new Error('Organization creation timeout');
              }
            };

            await checkOrganization();
          }
        } catch (err) {
          console.error('Error handling redirect:', err);
          setError('Could not verify organization creation. Please contact support.');
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
      setError(error.message || 'An error occurred while creating the organization.');
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
            <ul>
              <li>Private group space</li>
              <li>20 group members</li>
              <li>Private questions, rankings, prioritisation features</li>
              <li>Priority support</li>
            </ul>
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
                {loading ? <CircularProgress size={24} /> : 'Create Organization'}
              </Button>
            </form>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Container maxWidth='sm'>
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
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

        <Typography variant='h4' component='h1' gutterBottom>
          Create a Group
        </Typography>
        
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
