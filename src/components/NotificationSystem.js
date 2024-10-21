import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { Badge, Button, Dialog, DialogTitle, DialogContent, List, ListItem, ListItemText } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useNavigate } from 'react-router-dom';

const NotificationSystem = ({ onCreateGroup, showFullSystem = true }) => {
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const { session } = useAuth();
  const navigate = useNavigate();

  const fetchNotifications = useCallback(async () => {
    if (session?.user) {
      const { data, error } = await supabase
        .from('user_notifications')
        .select('*, questions(content)')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notifications:', error);
      } else {
        setNotifications(data);
      }
    }
  }, [session]);

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel('custom-all-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${session?.user?.id}`
        },
        fetchNotifications
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, fetchNotifications]);

  const handleNotificationClick = async (notificationId, questionId) => {
    await supabase
      .from('user_notifications')
      .update({ read: true })
      .eq('id', notificationId);

    fetchNotifications();
    navigate(`/questions/${questionId}`);
    setShowNotifications(false);
  };

  const handleCreateGroup = async (questionId, notificationId) => {
    if (notificationId) {
      const { error } = await supabase
        .from('user_notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    fetchNotifications();
    onCreateGroup(questionId, notificationId);
    setShowNotifications(false);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!showFullSystem) {
    return (
      <Badge badgeContent={unreadCount} color="secondary">
        <NotificationsIcon />
      </Badge>
    );
  }

  return (
    <>
      <Badge badgeContent={unreadCount} color="secondary">
        <Button 
          startIcon={<NotificationsIcon />} 
          onClick={() => setShowNotifications(true)}
        >
          Notifications
        </Button>
      </Badge>

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
                {notification.message.includes('10 endorsements') && (
                  <Button 
                    variant="outlined" 
                    size="small" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCreateGroup(notification.question_id, notification.id);
                    }}
                  >
                    Create Group
                  </Button>
                )}
              </ListItem>
            ))}
          </List>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default NotificationSystem;
