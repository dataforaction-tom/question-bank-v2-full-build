import React from 'react';
import { Container, Typography, Paper, Box, Alert } from '@mui/material';
import BillingPortal from '../components/BillingPortal';
import { useOrganization } from '../context/OrganizationContext';
import { Navigate } from 'react-router-dom';

const BillingRequired = () => {
  const { currentOrganization, subscriptionStatus } = useOrganization();

  // If subscription is active, redirect to dashboard
  if (subscriptionStatus === 'active') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, mb: 4 }}>
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            textAlign: 'center',
            borderRadius: 4
          }}
        >
          {/* Header with gradient background */}
          <div className="bg-gradient-to-r from-slate-950 to-sky-900 font-bold text-lg text-white pl-4 p-1 flex justify-between items-center mb-4 rounded">
            <Typography variant="h5" component="h1">
              Subscription Required
            </Typography>
          </div>

          {/* Alert for inactive subscription */}
          <Alert 
            severity="warning" 
            sx={{ 
              mb: 4,
              '& .MuiAlert-message': { 
                width: '100%',
                textAlign: 'center' 
              }
            }}
          >
            Your group's subscription is currently inactive
          </Alert>

          <Typography variant="body1" sx={{ mb: 4 }}>
            To continue accessing the dashboard and all features, 
            please update your billing information.
          </Typography>

          {currentOrganization ? (
            <Box sx={{ mt: 2 }}>
              <BillingPortal 
                organizationId={currentOrganization.id} 
                disabled={false}
              />
            </Box>
          ) : (
            <Alert 
              severity="error"
              sx={{ 
                '& .MuiAlert-message': { 
                  width: '100%',
                  textAlign: 'center' 
                }
              }}
            >
              Group subscription information not found. Please try logging in again.
            </Alert>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default BillingRequired; 