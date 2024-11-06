import { loadStripe } from '@stripe/stripe-js';

export const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

export const retrieveSession = async (sessionId) => {
  const response = await fetch(`/api/check-session?session_id=${sessionId}`);
  if (!response.ok) {
    throw new Error('Failed to verify payment session');
  }
  return response.json();
};
