// src/components/Navbar.js

import React from 'react';
import { AppBar, Toolbar, Typography, Button } from '@mui/material';
import { supabase } from '../supabaseClient';
import { Link, useNavigate } from 'react-router-dom';

const Navbar = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/signin');
  };

  return (
    <AppBar position='static'>
      <Toolbar>
        <Typography variant='h6' style={{ flexGrow: 1 }}>
          Question Bank V2
        </Typography>
        <Button color='inherit' component={Link} to='/'>
          Dashboard
        </Button>
        <Button color='inherit' component={Link} to='/questions'>
          Questions
        </Button>
        <Button color='inherit' component={Link} to='/submit-question'>
          Submit Question
        </Button>
        <Button color='inherit' component={Link} to='/rank-questions'>
          Rank Questions
        </Button>
        <Button color='inherit' component={Link} to='/create-organization'>
      Create Organization
    </Button>
    <Button color='inherit' component={Link} to='/organization-dashboard'>
      Organization Dashboard
    </Button>
    <Button color='inherit' component={Link} to='/profile'>
          Profile
        </Button>
        <Button color='inherit' onClick={handleLogout}>
          Logout
        </Button>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
