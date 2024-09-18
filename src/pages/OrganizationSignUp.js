import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { TextField, Button, Container, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const OrganizationSignUp = () => {
  const [organizationName, setOrganizationName] = useState('');
  const navigate = useNavigate();

  const handleOrganizationSignUp = async (e) => {
    e.preventDefault();

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      alert('You need to be signed in to create an organization.');
      navigate('/signin');
      return;
    }

    // Insert the new organization
    const { data, error } = await supabase.from('organizations').insert([
      {
        name: organizationName,
        created_by: user.id,
      },
    ]);

    if (error) {
      console.error('Error creating organization:', error);
      alert('An error occurred while creating the organization.');
    } else {
      console.log('Organization created:', data);
      alert('Organization created successfully!');
      navigate('/organization-dashboard');
    }
  };

  return (
    <Container maxWidth='sm'>
      <Typography variant='h4' component='h1' gutterBottom>
        Create an Organization
      </Typography>
      <form onSubmit={handleOrganizationSignUp}>
        <TextField
          label='Organization Name'
          fullWidth
          margin='normal'
          value={organizationName}
          onChange={(e) => setOrganizationName(e.target.value)}
          required
        />
        <Button
          variant='contained'
          color='primary'
          type='submit'
          fullWidth
          style={{ marginTop: '1rem' }}
        >
          Create Organization
        </Button>
      </form>
    </Container>
  );
};

export default OrganizationSignUp;
