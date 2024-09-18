// src/components/Subscription.js
import React from 'react';
import { useStripe } from '@stripe/react-stripe-js';
import axios from 'axios';

const Subscription = () => {
  const stripe = useStripe();

  const handleSubscribe = async (priceId) => {
    const { data } = await axios.post('http://localhost:4242/create-checkout-session', {
      priceId: priceId,
      organizationId: 'your-organization-id', // Get this from context or props
    });

    const result = await stripe.redirectToCheckout({
      sessionId: data.sessionId,
    });

    if (result.error) {
      alert(result.error.message);
    }
  };

  return (
    <div>
      <button onClick={() => handleSubscribe('price_1Hh1YZ2eZvKYlo2Cd3t7ldjR')}>
        Subscribe
      </button>
    </div>
  );
};

export default Subscription;
