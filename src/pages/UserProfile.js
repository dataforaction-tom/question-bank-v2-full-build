// src/pages/UserProfile.js

import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
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
  Grid,
  Badge,
} from '@mui/material';
import { colorMapping, defaultColors } from '../utils/colorMapping';
import { Notifications as NotificationsIcon } from '@mui/icons-material';

const UserProfile = () => {
  const [user, setUser] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [profile, setProfile] = useState({ name: '', bio: '' });
  const [loading, setLoading] = useState(true);
  const [followedQuestions, setFollowedQuestions] = useState([]);
  const [endorsedQuestions, setEndorsedQuestions] = useState([]);
  const navigate = useNavigate();

  // State for password change dialog
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

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

        // Fetch followed questions
        const { data: followedData, error: followedError } = await supabase
          .from('question_followers')
          .select('question_id, questions(id, content, category, created_at)')
          .eq('user_id', user.id);

        if (followedError) {
          console.error('Error fetching followed questions:', followedError);
        } else {
          setFollowedQuestions(followedData.map(item => item.questions));
        }

        // Fetch endorsed questions
        const { data: endorsedData, error: endorsedError } = await supabase
          .from('endorsements')
          .select('question_id, questions(id, content, category, created_at)')
          .eq('user_id', user.id);

        if (endorsedError) {
          console.error('Error fetching endorsed questions:', endorsedError);
        } else {
          setEndorsedQuestions(endorsedData.map(item => item.questions));
        }
      }
      setLoading(false);
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('user_notifications')
        .select('*, questions(content)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notifications:', error);
      } else {
        setNotifications(data);
      }
    };

    if (user) {
      fetchNotifications();
    }
  }, [user]);

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

  const handleQuestionClick = (questionId) => {
    navigate(`/questions/${questionId}`);
  };

  const getColorForCategory = (category) => {
    return colorMapping[category] || defaultColors[Math.floor(Math.random() * defaultColors.length)];
  };

  const CompactQuestionCard = ({ question }) => {
    const colors = getColorForCategory(question.category);
    return (
      <Box 
        sx={{
          backgroundColor: 'white',
          boxShadow: 1,
          borderRadius: 2,
          overflow: 'hidden',
          cursor: 'pointer',
          '&:hover': {
            boxShadow: 3,
          },
          transition: 'box-shadow 0.2s',
        }}
        onClick={() => handleQuestionClick(question.id)}
      >
        <Box sx={{ height: 2, backgroundColor: colors.border }}></Box>
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight="medium" noWrap>{question.content}</Typography>
          <Typography variant="caption" color="text.secondary">
            Created: {new Date(question.created_at).toLocaleDateString()}
          </Typography>
        </Box>
      </Box>
    );
  };

  const handleNotificationClick = async (notificationId, questionId) => {
    // Mark notification as read
    await supabase
      .from('user_notifications')
      .update({ read: true })
      .eq('id', notificationId);

    // Navigate to the question
    navigate(`/questions/${questionId}`);
  };

  const NotificationsList = () => (
    <Dialog open={showNotifications} onClose={() => setShowNotifications(false)}>
      <DialogTitle>Notifications</DialogTitle>
      <DialogContent>
        <List>
          {notifications.map((notification) => (
            <ListItem 
              key={notification.id} 
              button 
              onClick={() => handleNotificationClick(notification.id, notification.question_id)}
            >
              <ListItemText 
                primary={notification.message} 
                secondary={new Date(notification.created_at).toLocaleString()}
                style={{ color: notification.read ? 'gray' : 'black' }}
              />
            </ListItem>
          ))}
        </List>
      </DialogContent>
    </Dialog>
  );

  if (!user || loading) {
    return (
      <Container>
        <Typography variant='h5'>Loading...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth='lg'>
      <Typography variant='h4' gutterBottom>
        User Profile
      </Typography>

      {/* Notifications moved to the top */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Badge badgeContent={notifications.filter(n => !n.read).length} color="secondary">
          <Button 
            startIcon={<NotificationsIcon />} 
            onClick={() => setShowNotifications(true)}
          >
            Notifications
          </Button>
        </Badge>
      </Box>

      <NotificationsList />

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

      <Grid container spacing={4} sx={{ mt: 4 }}>
        <Grid item xs={12} md={6}>
          <Typography variant='h5' gutterBottom>Followed Questions</Typography>
          {followedQuestions.length > 0 ? (
            <Grid container spacing={2}>
              {followedQuestions.map(question => (
                <Grid item xs={12} key={question.id}>
                  <CompactQuestionCard question={question} />
                </Grid>
              ))}
            </Grid>
          ) : (
            <Typography variant='body1'>You haven't followed any questions yet.</Typography>
          )}
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant='h5' gutterBottom>Endorsed Questions</Typography>
          {endorsedQuestions.length > 0 ? (
            <Grid container spacing={2}>
              {endorsedQuestions.map(question => (
                <Grid item xs={12} key={question.id}>
                  <CompactQuestionCard question={question} />
                </Grid>
              ))}
            </Grid>
          ) : (
            <Typography variant='body1'>You haven't endorsed any questions yet.</Typography>
          )}
        </Grid>
      </Grid>

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
          You are not part of any groups.
        </Typography>
      )}

    </Container>
  );
};

export default UserProfile;
