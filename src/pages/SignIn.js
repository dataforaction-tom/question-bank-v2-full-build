// src/pages/SignIn.js

import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  TextField,
  Button,
  Typography,
  Link as MuiLink,
} from '@mui/material';

const SignIn = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Extract the redirect URL from query parameters
  const query = new URLSearchParams(location.search);
  const redirect = query.get('redirect') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignIn = async (e) => {
    e.preventDefault(); // Prevent default form submission

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Error signing in:', error);
      alert('Error signing in: ' + error.message);
    } else {
      // Redirect to the desired page after sign-in
      navigate(redirect);
    }
  };

  return (
    <Container maxWidth='sm' style={{ marginTop: '2rem' }}>
      <Typography variant='h4' gutterBottom>
        Sign In
      </Typography>
      <form onSubmit={handleSignIn}>
        <TextField
          label='Email'
          type='email'
          fullWidth
          margin='normal'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <TextField
          label='Password'
          type='password'
          fullWidth
          margin='normal'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button
          type='submit'
          variant='contained'
          color='primary'
          fullWidth
          style={{ marginTop: '1rem' }}
        >
          Sign In
        </Button>
      </form>
      <Typography variant='body2' style={{ marginTop: '1rem' }}>
        Don't have an account?{' '}
        <MuiLink
          component='button'
          variant='body2'
          onClick={() => navigate(`/signup?redirect=${encodeURIComponent(redirect)}`)}
        >
          Sign Up
        </MuiLink>
      </Typography>
    </Container>
  );
};

export default SignIn;
