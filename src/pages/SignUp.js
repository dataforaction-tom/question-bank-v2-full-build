import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { TextField, Button, Container, Typography } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';

const SignUp = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSignUp = async (e) => {
    e.preventDefault();
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
    if (error) {
      alert(error.message);
    } else {
      alert('Check your email for a confirmation link.');
      navigate('/signin');
    }
  };

  return (
    <Container maxWidth='sm'>
      <Typography variant='h4' component='h1' gutterBottom>
        Sign Up
      </Typography>
      <form onSubmit={handleSignUp}>
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
          Sign Up
        </Button>
        <Typography variant='body2' align='center' style={{ marginTop: '1rem' }}>
          Already have an account? <Link to='/signin'>Sign In</Link>
        </Typography>
      </form>
    </Container>
  );
};

export default SignUp;
