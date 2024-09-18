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

    // Associate the user with the organization
    const { error } = await supabase.from('organization_users').insert([
      {
        organization_id: invitation.organization_id,
        user_id: user.id,
        role: 'member',
      },
    ]);

    if (error) {
      console.error('Error accepting invitation:', error);
      alert('Error accepting invitation.');
    } else {
      // Update the invitation status
      await supabase
        .from('invitations')
        .update({ status: 'accepted', accepted_at: new Date() })
        .eq('id', invitation.id);

      alert('Invitation accepted!');
      navigate('/organization-dashboard');
    }
  };

  const handleDecline = async () => {
    // Update the invitation status
    await supabase
      .from('invitations')
      .update({ status: 'declined' })
      .eq('id', invitation.id);

    alert('Invitation declined.');
    navigate('/');
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
