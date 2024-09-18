// src/pages/UserProfile.js

import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import {
  Container,
  Typography,
  List,
  ListItem,
  ListItemText,
  TextField,
  Button,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';

const UserProfile = () => {
  const [user, setUser] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [profile, setProfile] = useState({ name: '', bio: '' });
  const [loading, setLoading] = useState(true);

  // State for password change dialog
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      // Get the current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUser(user);

        // Fetch user data from public.users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('name, bio')
          .eq('id', user.id)
          .single();

        if (userError) {
          console.error('Error fetching user data:', userError);
        } else {
          setProfile(userData);
        }

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
      setLoading(false);
    };

    fetchUserData();
  }, []);

  const handleUpdateProfile = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('users')
      .update({
        name: profile.name,
        bio: profile.bio,
      })
      .eq('id', user.id);

    if (error) {
      console.error('Error updating profile:', error);
      alert('Error updating profile: ' + error.message);
    } else {
      alert('Profile updated successfully!');
    }
    setLoading(false);
  };

  const handleChangePassword = async () => {
    setLoading(true);

    // Re-authenticate user with current password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (signInError) {
      alert('Current password is incorrect.');
      setLoading(false);
      return;
    }

    // Update password
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      alert('Error updating password: ' + error.message);
    } else {
      alert('Password updated successfully!');
      setPasswordDialogOpen(false);
      setCurrentPassword('');
      setNewPassword('');
    }

    setLoading(false);
  };

  if (!user || loading) {
    return (
      <Container>
        <Typography variant='h5'>Loading...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth='sm'>
      <Typography variant='h4' gutterBottom>
        User Profile
      </Typography>
      <Typography variant='h6'>Email:</Typography>
      <Typography variant='body1' gutterBottom>
        {user.email}
      </Typography>

      <Box component='form' noValidate autoComplete='off'>
        <TextField
          label='Full Name'
          fullWidth
          margin='normal'
          value={profile.name}
          onChange={(e) => setProfile({ ...profile, name: e.target.value })}
        />
        <TextField
          label='Bio'
          fullWidth
          margin='normal'
          multiline
          rows={4}
          value={profile.bio}
          onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
        />
        <Button
          variant='contained'
          color='primary'
          onClick={handleUpdateProfile}
          style={{ marginTop: '1rem' }}
        >
          Update Profile
        </Button>
      </Box>

      <Button
        variant='outlined'
        color='secondary'
        onClick={() => setPasswordDialogOpen(true)}
        style={{ marginTop: '1rem' }}
      >
        Change Password
      </Button>

      {/* Password Change Dialog */}
      <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)}>
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <TextField
            label='Current Password'
            type='password'
            fullWidth
            margin='normal'
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <TextField
            label='New Password'
            type='password'
            fullWidth
            margin='normal'
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialogOpen(false)} color='primary'>
            Cancel
          </Button>
          <Button onClick={handleChangePassword} color='primary'>
            Update Password
          </Button>
        </DialogActions>
      </Dialog>

      <Typography variant='h6' style={{ marginTop: '2rem' }}>
        Organizations:
      </Typography>
      {organizations.length > 0 ? (
        <List>
          {organizations.map((orgUser) => (
            <ListItem key={orgUser.organization_id}>
              <ListItemText primary={orgUser.organizations.name} />
            </ListItem>
          ))}
        </List>
      ) : (
        <Typography variant='body1'>
          You are not part of any organizations.
        </Typography>
      )}
    </Container>
  );
};

export default UserProfile;
