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
  Modal,
  Paper
} from '@mui/material';
import { colorMapping, defaultColors } from '../utils/colorMapping';
import { Notifications as NotificationsIcon } from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import NotificationSystem from '../components/NotificationSystem';

const UserProfile = () => {
  const [user, setUser] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [profile, setProfile] = useState({ name: '', bio: '', ...user?.user_metadata });
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

  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [questionToCreateGroup, setQuestionToCreateGroup] = useState(null);
  const { session } = useAuth();

  useEffect(() => {
    const fetchUserData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUser(user);
        setProfile(user.user_metadata || { name: '', bio: '' });

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
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          name: profile.name,
          bio: profile.bio,
        }
      });

      if (error) throw error;

      setUser({ ...user, user_metadata: data.user.user_metadata });
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error updating profile: ' + error.message);
    } finally {
      setLoading(false);
    }
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

  const handleCreateGroup = async (questionId, notificationId) => {
    setQuestionToCreateGroup(questionId);
    setOpenConfirmDialog(true);

    // Mark the notification as read
    if (notificationId) {
      try {
        const { error } = await supabase
          .from('user_notifications')
          .update({ read: true })
          .eq('id', notificationId);

        if (error) {
          console.error('Error marking notification as read:', error);
        } else {
          // Update the local state to reflect the change
          setNotifications(prevNotifications =>
            prevNotifications.map(notification =>
              notification.id === notificationId
                ? { ...notification, read: true }
                : notification
            )
          );
        }
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }
  };

  const confirmCreateGroup = async () => {
    setOpenConfirmDialog(false);
    if (!questionToCreateGroup || !session?.user) return;

    try {
      // Call the Supabase function
      const { data, error } = await supabase.rpc('handle_action_group', {
        p_question_id: questionToCreateGroup,
        p_user_id: session.user.id
      });

      if (error) throw error;

      if (!data) {
        throw new Error('No data returned from handle_action_group');
      }

      const { action_group_id, is_new } = data;

      // Success! Navigate to the action group dashboard
      navigate('/action-group-dashboard', { 
        state: { 
          actionGroupId: action_group_id,
          isNewGroup: is_new
        } 
      });

      // Provide feedback to the user
      if (is_new) {
        alert('New action group created successfully!');
      } else {
        alert('You have joined an existing action group.');
      }

    } catch (error) {
      console.error('Error handling action group:', error);
      alert(`Failed to handle action group. Error: ${error.message || 'Unknown error'}`);
    } finally {
      setQuestionToCreateGroup(null); // Reset the questionToCreateGroup state
    }
  };

  if (!user || loading) {
    return (
      <Container>
        <Typography variant='h5'>Loading...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Paper elevation={3} sx={{ p: 4, mt: 4, mb: 4 }}>
        {/* Header Section */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 4 
        }}>
          <Typography variant='h4' sx={{ fontWeight: 500 }}>
            Profile Settings
          </Typography>
          <Box>
            <NotificationSystem onCreateGroup={handleCreateGroup} />
          </Box>
        </Box>

        {/* Profile Information Section */}
        <Paper variant="outlined" sx={{ p: 3, mb: 4 }}>
          <Typography variant='h6' sx={{ mb: 2, color: 'primary.main' }}>
            Account Information
          </Typography>
          <Typography variant='body1' sx={{ mb: 3, color: 'text.secondary' }}>
            Email: {user?.email}
          </Typography>

          <Box component='form' noValidate autoComplete='off' sx={{ mb: 3 }}>
            <TextField
              label='Full Name'
              fullWidth
              margin='normal'
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              label='Bio'
              fullWidth
              margin='normal'
              multiline
              rows={4}
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              sx={{ mb: 3 }}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant='contained'
                color='primary'
                onClick={handleUpdateProfile}
                disabled={loading}
                sx={{ minWidth: '150px' }}
              >
                {loading ? 'Updating...' : 'Update Profile'}
              </Button>
              <Button
                variant='outlined'
                color='secondary'
                onClick={() => setPasswordDialogOpen(true)}
                sx={{ minWidth: '150px' }}
              >
                Change Password
              </Button>
            </Box>
          </Box>
        </Paper>

        {/* Activity Section */}
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
              <Typography 
                variant='h6' 
                sx={{ mb: 3, color: 'primary.main' }}
              >
                Followed Questions
              </Typography>
              {followedQuestions.length > 0 ? (
                <Grid container spacing={2}>
                  {followedQuestions.map(question => (
                    <Grid item xs={12} key={question.id}>
                      <CompactQuestionCard question={question} />
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Box sx={{ 
                  p: 3, 
                  textAlign: 'center',
                  backgroundColor: 'grey.50',
                  borderRadius: 1
                }}>
                  <Typography variant='body1' color="text.secondary">
                    You haven't followed any questions yet.
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
              <Typography 
                variant='h6' 
                sx={{ mb: 3, color: 'primary.main' }}
              >
                Endorsed Questions
              </Typography>
              {endorsedQuestions.length > 0 ? (
                <Grid container spacing={2}>
                  {endorsedQuestions.map(question => (
                    <Grid item xs={12} key={question.id}>
                      <CompactQuestionCard question={question} />
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Box sx={{ 
                  p: 3, 
                  textAlign: 'center',
                  backgroundColor: 'grey.50',
                  borderRadius: 1
                }}>
                  <Typography variant='body1' color="text.secondary">
                    You haven't endorsed any questions yet.
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      {/* Password Change Dialog */}
      <Dialog 
        open={passwordDialogOpen} 
        onClose={() => setPasswordDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider' }}>
          Change Password
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
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
        <DialogActions sx={{ p: 2.5, borderTop: 1, borderColor: 'divider' }}>
          <Button 
            onClick={() => setPasswordDialogOpen(false)} 
            color='inherit'
          >
            Cancel
          </Button>
          <Button 
            onClick={handleChangePassword} 
            variant="contained"
            color='primary'
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Update Password'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog 
        open={openConfirmDialog} 
        onClose={() => {
          setOpenConfirmDialog(false);
          setQuestionToCreateGroup(null);
        }}
      >
        <DialogTitle>Create/Join Action Group</DialogTitle>
        <DialogContent>
          Do you want to create or join an action group for this question?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenConfirmDialog(false);
            setQuestionToCreateGroup(null);
          }}>
            Cancel
          </Button>
          <Button onClick={confirmCreateGroup} color="primary">Create/Join</Button>
        </DialogActions>
      </Dialog>

    </Container>
  );
};

export default UserProfile;
