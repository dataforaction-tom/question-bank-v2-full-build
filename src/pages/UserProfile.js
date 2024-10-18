// src/pages/UserProfile.js

import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, useLocation } from 'react-router-dom';
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
  Card,
  CardActionArea,
  CardContent,
  Modal
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
  const location = useLocation();

  // State for password change dialog
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const [showOrgSelector, setShowOrgSelector] = useState(false);

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

  const handleOrganizationSelect = useCallback((org) => {
    setShowOrgSelector(false);
    navigate(`/group-dashboard`, {
      state: {
        viewMode: 'cards',
        organizationId: org.id
      }
    });
  }, [navigate]);

  useEffect(() => {
    if (location.state?.organizationId) {
      setOrganizations(prevOrganizations => {
        const org = prevOrganizations.find(org => org.id === location.state.organizationId);
        if (org) {
          handleOrganizationSelect(org);
        }
        return prevOrganizations;
      });
    }
  }, [location.state, handleOrganizationSelect]);

  const OrganizationSelectorModal = ({ open, organizations, onSelect }) => {
    const COLUMN_COLORS = {
      0: '#f860b1',
      1: '#f3581d',
      2: '#9dc131',
      3: '#6a7efc',
      4: '#53c4af'
    };

    return (
      <Modal
        open={open}
        onClose={() => setShowOrgSelector(false)}
        aria-labelledby="organization-selector-title"
        aria-describedby="organization-selector-description"
      >
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '80%',
          maxWidth: 800,
          bgcolor: 'background.paper',
          boxShadow: 24,
          p: 4,
          borderRadius: 2,
          maxHeight: '90vh',
          overflow: 'auto',
        }}>
          <Typography id="organization-selector-title" variant="h6" component="h2" gutterBottom>
            Select a Group
          </Typography>
          <Grid container spacing={2}>
            {organizations.map((org, index) => (
              <Grid item xs={12} sm={6} md={4} key={org.organization_id}>
                <Card 
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { boxShadow: 6 },
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <Box sx={{ height: 8, backgroundColor: COLUMN_COLORS[index % 5] }} />
                  <CardActionArea 
                    onClick={() => onSelect(org)}
                    sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start' }}
                  >
                    <CardContent>
                      <Typography variant="h5" component="div" gutterBottom>
                        {org.organizations.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Role: {org.role}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Modal>
    );
  };

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

      {/* Commented out entire "Your Groups" section
      <Box sx={{ mt: 4 }}>
        <Typography variant='h5' gutterBottom>
          Your Groups
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => setShowOrgSelector(true)}
          sx={{ mb: 2 }}
        >
          Select Group
        </Button>
        <OrganizationSelectorModal
          open={showOrgSelector}
          organizations={organizations}
          onSelect={handleOrganizationSelect}
        />
        {organizations.length > 0 ? (
          <Grid container spacing={2}>
            {organizations.map((orgUser) => (
              <Grid item xs={12} sm={6} md={4} key={orgUser.organization_id}>
                <Card>
                  <CardActionArea onClick={() => handleOrganizationSelect(orgUser)}>
                    <CardContent>
                      <Typography variant="h6">{orgUser.organizations.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {orgUser.organizations.description || 'No description available'}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Typography variant='body1'>
            You are not part of any groups.
          </Typography>
        )}
      </Box>
      */}

    </Container>
  );
};

export default UserProfile;
