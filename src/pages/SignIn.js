import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { TextField, Button, Container, Typography } from '@mui/material';
import { useNavigate, Link } from 'react-router-dom';

const SignIn = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSignIn = async (e) => {
    e.preventDefault();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      alert(error.message);
    } else {
      navigate('/');
    }
  };

  return (
    <Container maxWidth='sm'>
      <Typography variant='h4' component='h1' gutterBottom>
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
          variant='contained'
          color='primary'
          type='submit'
          fullWidth
          style={{ marginTop: '1rem' }}
        >
          Sign In
        </Button>
        <Typography variant='body2' align='center' style={{ marginTop: '1rem' }}>
          Don't have an account? <Link to='/signup'>Sign Up</Link>
        </Typography>
      </form>
    </Container>
  );
};

export default SignIn;
