// src/pages/AcceptInvitation.js

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Button, Container, Typography } from '@mui/material';

const AcceptInvitation = () => {
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const query = new URLSearchParams(window.location.search);
  const token = query.get('token');

  useEffect(() => {
    const fetchInvitation = async () => {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('token', token)
        .eq('status', 'pending')
        .single();

      if (error || !data) {
        alert('Invalid or expired invitation.');
        navigate('/');
      } else {
        setInvitation(data);
        setLoading(false);
      }
    };

    fetchInvitation();
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
        user_id: user.id,
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
    <Container>
      <Typography variant='h5'>
        You've been invited to join an organization!
      </Typography>
      <Button variant='contained' color='primary' onClick={handleAccept}>
        Accept Invitation
      </Button>
      <Button variant='outlined' color='secondary' onClick={handleDecline}>
        Decline Invitation
      </Button>
    </Container>
  );
};

export default AcceptInvitation;
