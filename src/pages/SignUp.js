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
import toast from 'react-hot-toast';
const SignUp = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Extract the redirect URL from query parameters
  const query = new URLSearchParams(location.search);
  const redirect = query.get('redirect') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleSignUp = async () => {
    try {
      // Sign up the user with additional metadata
      const { data: { user }, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name
          }
        }
      });

      if (signUpError) throw signUpError;

      toast.success('Sign-up successful! Please check your email to confirm your account.');
      navigate(redirect);
    } catch (error) {
      console.error('Error signing up:', error);
      toast.error('Error signing up: ' + error.message);
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
      <TextField
        label='Name'
        fullWidth
        margin='normal'
        value={name}
        onChange={(e) => setName(e.target.value)}
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
