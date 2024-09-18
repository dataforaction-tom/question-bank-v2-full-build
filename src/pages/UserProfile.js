// src/pages/UserProfile.js

import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Container, Typography, List, ListItem, ListItemText } from '@mui/material';

const UserProfile = () => {
  const [user, setUser] = useState(null);
  const [organizations, setOrganizations] = useState([]);

  useEffect(() => {
    const fetchUserData = async () => {
      // Get the current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUser(user);

        // Fetch organizations the user belongs to
        const { data, error } = await supabase
          .from('organization_users')
          .select('organization_id, organizations(name)')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error fetching organizations:', error);
        } else {
          setOrganizations(data);
        }
      }
    };

    fetchUserData();
  }, []);

  if (!user) {
    return (
      <Container>
        <Typography variant='h5'>Loading...</Typography>
      </Container>
    );
  }

  return (
    <Container>
      <Typography variant='h4' gutterBottom>
        User Profile
      </Typography>
      <Typography variant='h6'>Email:</Typography>
      <Typography variant='body1' gutterBottom>
        {user.email}
      </Typography>
      <Typography variant='h6'>Organizations:</Typography>
      {organizations.length > 0 ? (
        <List>
          {organizations.map((orgUser) => (
            <ListItem key={orgUser.organization_id}>
              <ListItemText primary={orgUser.organizations.name} />
            </ListItem>
          ))}
        </List>
      ) : (
        <Typography variant='body1'>You are not part of any organizations.</Typography>
      )}
    </Container>
  );
};

export default UserProfile;
