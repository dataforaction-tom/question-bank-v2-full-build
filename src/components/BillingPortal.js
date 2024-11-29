import React, { useState } from 'react';
import { CreditCard } from '@mui/icons-material';
import CustomButton from './Button';
import { CircularProgress } from '@mui/material';

const BillingPortal = ({ organizationId, disabled }) => {
  const [loading, setLoading] = useState(false);

  const handleBillingPortal = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId }),
      });

      const { url, error } = await response.json();
      
      if (error) throw new Error(error);
      
      // Redirect to Stripe Portal
      window.location.href = url;
    } catch (error) {
      console.error('Error accessing billing portal:', error);
      alert('Failed to access billing portal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <CustomButton
      type="Action"
      onClick={handleBillingPortal}
      disabled={disabled || loading}
      className="w-full"
    >
      {loading ? (
        <CircularProgress size={24} />
      ) : (
        <>
          <CreditCard className="mr-2" />
          Manage Billing
        </>
      )}
    </CustomButton>
  );
};

export default BillingPortal; 