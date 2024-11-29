import React, { useState, useEffect } from 'react';
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Typography,
  Box,
  Divider,
  Button,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Circle as CircleIcon,
  CheckCircle as CheckCircleIcon,
  Group as GroupIcon,
  QuestionAnswer as QuestionIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

const NotificationSystem = ({ onCreateGroup }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('user_notifications')
      .select('*, questions(content)')
      .eq('user_id', user.id)
      .eq('read', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notifications:', error);
    } else {
      setNotifications(data || []);
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    // Set up real-time subscription for new notifications
    const subscription = supabase
      .channel('user_notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'user_notifications'
      }, fetchNotifications)
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const markAsRead = async (notificationId) => {
    const { error } = await supabase
      .from('user_notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
    } else {
      // Remove the notification from the local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    }
  };

  const handleNotificationClick = async (notification) => {
    await markAsRead(notification.id);
    handleClose();

    if (notification.type === 'question_update') {
      navigate(`/questions/${notification.question_id}`);
    } else if (notification.type === 'group_invitation') {
      // Handle group invitation
      onCreateGroup && onCreateGroup(notification.question_id);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'question_update':
        return <QuestionIcon color="primary" sx={{ fontSize: 20 }} />;
      case 'group_invitation':
        return <GroupIcon color="primary" sx={{ fontSize: 20 }} />;
      default:
        return <CircleIcon color="primary" sx={{ fontSize: 20 }} />;
    }
  };

  return (
    <>
      <IconButton
        onClick={handleClick}
        size="large"
        sx={{ 
          color: 'primary.main',
          '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' }
        }}
      >
        <Badge badgeContent={notifications.length} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          elevation: 3,
          sx: {
            width: 360,
            maxHeight: 400,
            overflow: 'auto',
            mt: 1.5,
            '& .MuiMenuItem-root': {
              py: 1.5,
              px: 2,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ p: 2, pb: 1 }}>
          <Typography variant="h6" color="primary">
            Notifications
          </Typography>
        </Box>
        <Divider />
        {notifications.length === 0 ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No new notifications
            </Typography>
          </Box>
        ) : (
          <>
            {notifications.map((notification) => (
              <MenuItem
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                sx={{
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                <ListItemIcon>
                  {getNotificationIcon(notification.type)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="subtitle2" noWrap>
                      {notification.questions?.content || notification.message}
                    </Typography>
                  }
                  secondary={
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      component="div"
                      sx={{ mt: 0.5 }}
                    >
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </Typography>
                  }
                />
              </MenuItem>
            ))}
            <Box sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
              <Button
                fullWidth
                size="small"
                onClick={async () => {
                  // Mark all as read
                  const { error } = await supabase
                    .from('user_notifications')
                    .update({ read: true })
                    .in('id', notifications.map(n => n.id));
                  
                  if (!error) {
                    setNotifications([]);
                    handleClose();
                  }
                }}
              >
                Mark all as read
              </Button>
            </Box>
          </>
        )}
      </Menu>
    </>
  );
};

export default NotificationSystem;
