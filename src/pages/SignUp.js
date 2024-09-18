// src/pages/SignUp.js

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

const SignUp = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Extract the redirect URL from query parameters
  const query = new URLSearchParams(location.search);
  const redirect = query.get('redirect') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignUp = async () => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.error('Error signing up:', error);
      alert('Error signing up: ' + error.message);
    } else {
      alert('Sign-up successful! Please check your email to confirm your account.');
      // Redirect to the desired page after sign-up
      navigate(redirect);
    }
  };

  return (
    <Container maxWidth='sm' style={{ marginTop: '2rem' }}>
      <Typography variant='h4' gutterBottom>
        Sign Up
      </Typography>
      <TextField
        label='Email'
        type='email'
        fullWidth
        margin='normal'
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <TextField
        label='Password'
        type='password'
        fullWidth
        margin='normal'
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Button
        variant='contained'
        color='primary'
        fullWidth
        onClick={handleSignUp}
        style={{ marginTop: '1rem' }}
      >
        Sign Up
      </Button>
      <Typography variant='body2' style={{ marginTop: '1rem' }}>
        Already have an account?{' '}
        <MuiLink
          component='button'
          variant='body2'
          onClick={() => navigate(`/signin?redirect=${encodeURIComponent(redirect)}`)}
        >
          Sign In
        </MuiLink>
      </Typography>
    </Container>
  );
};

export default SignUp;
