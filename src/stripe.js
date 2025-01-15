import { loadStripe } from '@stripe/stripe-js';



export const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);


stripePromise.then(stripe => {
  console.log('Stripe loaded:', !!stripe);
}).catch(err => {
  console.error('Stripe loading error:', err);
});

export const retrieveSession = async (sessionId) => {
  console.log('Retrieving session:', sessionId); // Debug session retrieval
  const response = await fetch(`/api/check-session?session_id=${sessionId}`);
  if (!response.ok) {
    const error = await response.text();
    console.error('Session retrieval error:', error); // Debug error
    throw new Error('Failed to verify payment session');
  }
  const data = await response.json();
  console.log('Session data:', data); // Debug response
  return data;
};
