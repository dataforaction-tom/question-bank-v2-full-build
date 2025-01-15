// src/pages/AcceptInvitation.js

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Button, Container, Typography, Paper, Box } from '@mui/material';

const AcceptInvitation = () => {
  const [invitation, setInvitation] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const query = new URLSearchParams(window.location.search);
  const token = query.get('token');

  useEffect(() => {
    const fetchInvitationAndOrganization = async () => {
      // First fetch the invitation
      const { data: invitationData, error: invitationError } = await supabase
        .from('invitations')
        .select('*')
        .eq('token', token)
        .eq('status', 'pending')
        .single();

      if (invitationError || !invitationData) {
        alert('Invalid or expired invitation.');
        navigate('/');
        return;
      }

      setInvitation(invitationData);

      // Then fetch the organization details
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', invitationData.organization_id)
        .single();

      if (orgError) {
        console.error('Error fetching organization:', orgError);
      } else {
        setOrganization(orgData);
      }

      setLoading(false);
    };

    fetchInvitationAndOrganization();
  }, [token, navigate]);

  const handleAccept = async () => {
    // Check if the user is signed in
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // Redirect to sign-up/sign-in page with a redirect back to this page
      navigate(`/signin?redirect=/accept-invitation?token=${token}`);
      return;
    }

    try {
      // Call the accept_invitation function
      const { error } = await supabase.rpc('accept_invitation', {
        invitation_token: token,
      });

      if (error) {
        console.error('Error accepting invitation:', error);
        alert('Error accepting invitation: ' + error.message);
      } else {
        alert('Invitation accepted!');
        navigate('/organization-dashboard');
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      alert('Unexpected error: ' + error.message);
    }
  };

  const handleDecline = async () => {
    // Update the invitation status to 'declined'
    const { error } = await supabase
      .from('invitations')
      .update({ status: 'declined' })
      .eq('id', invitation.id);

    if (error) {
      console.error('Error declining invitation:', error);
      alert('Error declining invitation.');
    } else {
      alert('Invitation declined.');
      navigate('/');
    }
  };

  if (loading) {
    return (
      <Container>
        <Typography variant='h5'>Loading...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          gap: 3
        }}>
          <Typography variant="h4" sx={{ 
            fontWeight: 500,
            color: 'primary.main',
            textAlign: 'center',
            mb: 2
          }}>
            You've been invited to join {organization?.name || 'a group'}!
          </Typography>
          
          <Box sx={{ 
            display: 'flex', 
            gap: 2,
            justifyContent: 'center'
          }}>
            <Button
              type="Submit"
              
              onClick={handleAccept}
            >
              Accept Invitation
            </Button>
            
            <Button
              type="Cancel"
              
              onClick={handleDecline}
            >
              Decline Invitation
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default AcceptInvitation;
