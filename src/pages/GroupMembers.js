import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { AuthContext } from '../context/AuthContext';
import {
  Typography,
  List,
  ListItem,
  ListItemText,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Paper,
  Box,
} from '@mui/material';
import { v4 as uuidv4 } from 'uuid';
import DeleteIcon from '@mui/icons-material/Delete';
import toast from 'react-hot-toast';

const GroupMembers = () => {
  const { session } = useContext(AuthContext);
  const { organizationId } = useParams();
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [emailToInvite, setEmailToInvite] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [organization, setOrganization] = useState(null);
  const [memberToRemove, setMemberToRemove] = useState(null);

  useEffect(() => {
    fetchOrganization();
    fetchMembers();
  }, [organizationId]);

  const fetchOrganization = async () => {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();

    if (error) {
      console.error('Error fetching organization:', error);
    } else {
      setOrganization(data);
    }
  };

  const fetchMembers = async () => {
    // First get organization users
    const { data: orgUsers, error: orgError } = await supabase
      .from('organization_users')
      .select('*')
      .eq('organization_id', organizationId);

    if (orgError) {
      console.error('Error fetching organization users:', orgError);
      return;
    }

    // Get user profiles using our secure function
    const { data: profiles, error: profileError } = await supabase
      .rpc('get_user_profiles', {
        user_ids: orgUsers.map(member => member.user_id)
      });

    if (profileError) {
      console.error('Error fetching user profiles:', profileError);
      return;
    }

    // Combine the data
    const transformedData = orgUsers.map(orgUser => {
      const profile = profiles.find(p => p.id === orgUser.user_id);
      return {
        ...orgUser,
        users: {
          id: profile.id,
          name: profile.name || 'Unknown User',
          bio: profile.bio
        }
      };
    });

    setMembers(transformedData);
    setIsAdmin(transformedData.find(member => member.user_id === session.user.id)?.role === 'admin');
  };

  const handleInvite = async () => {
    if (!emailToInvite) {
      toast.error('Please enter an email address.');
      return;
    }

    const invitationToken = uuidv4();

    const { error } = await supabase.from('invitations').insert([
      {
        email: emailToInvite,
        organization_id: organizationId,
        token: invitationToken,
      },
    ]);

    if (error) {
      console.error('Error creating invitation:', error);
      toast.error('Error creating invitation.');
    } else {
      await sendInvitationEmail(emailToInvite, invitationToken);
      toast.success('Invitation sent successfully!');
      setEmailToInvite('');
    }
  };

  const sendInvitationEmail = async (email, token) => {
    const invitationLink = `${window.location.origin}/accept-invitation?token=${token}`;
    
    // Get the current user's name from Supabase
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('name')
      .eq('id', session.user.id)
      .single();

    const inviterName = userData?.name || session.user.email || 'A team member';

    try {
      const response = await fetch('/api/send-invitation-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          organizationName: organization.name,
          inviterName: inviterName,
          invitationLink: invitationLink,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send invitation email.');
      }
    } catch (error) {
      console.error('Error sending invitation email:', error);
      toast.error('Error sending invitation email.');
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    if (!isAdmin) {
      toast.error('Only admins can change user roles.');
      return;
    }

    // Check if this is the subscription owner
    const { data: organization } = await supabase
      .from('organizations')
      .select('created_by')
      .eq('id', organizationId)
      .single();

    const member = members.find(m => m.id === memberId);
    if (member.user_id === organization.created_by) {
      toast.error('Cannot change the role of the group owner.');
      return;
    }

    // Check if this is the last admin trying to change their role
    if (newRole === 'member') {
      const adminCount = members.filter(m => m.role === 'admin').length;
      if (adminCount === 1 && members.find(m => m.id === memberId).role === 'admin') {
        toast.error('Cannot change role. There must be at least one admin in the organization.');
        return;
      }
    }

    const { error } = await supabase
      .from('organization_users')
      .update({ role: newRole })
      .eq('id', memberId);

    if (error) {
      console.error('Error updating role:', error);
      toast.error('Error updating user role.');
    } else {
      await fetchMembers();
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;

    // First check if this is the subscription owner
    const { data: organization } = await supabase
      .from('organizations')
      .select('created_by')
      .eq('id', organizationId)
      .single();

    if (memberToRemove.user_id === organization.created_by) {
      toast.error('Cannot remove the group owner as they hold the subscription.');
      setMemberToRemove(null);
      return;
    }

    // Check if trying to remove the last admin
    if (memberToRemove.role === 'admin') {
      const adminCount = members.filter(m => m.role === 'admin').length;
      if (adminCount === 1) {
        toast.error('Cannot remove the last admin from the organization.');
        setMemberToRemove(null);
        return;
      }
    }

    const { error } = await supabase
      .from('organization_users')
      .delete()
      .eq('id', memberToRemove.id);

    if (error) {
      console.error('Error removing member:', error);
      toast.error('Error removing member from organization.');
    } else {
      await fetchMembers();
    }
    setMemberToRemove(null);
  };

  const handleLeaveGroup = async () => {
    const { data: organization } = await supabase
      .from('organizations')
      .select('created_by')
      .eq('id', organizationId)
      .single();

    // Prevent the owner from leaving
    if (session.user.id === organization.created_by) {
      toast.error('As the group owner, you cannot leave the group.');
      return;
    }

    // Check if user is the last admin
    const userMember = members.find(m => m.user_id === session.user.id);
    if (userMember.role === 'admin') {
      const adminCount = members.filter(m => m.role === 'admin').length;
      if (adminCount === 1) {
        toast.error('As the last admin, you must assign another admin before leaving the group.');
        return;
      }
    }

    const { error } = await supabase
      .from('organization_users')
      .delete()
      .eq('user_id', session.user.id)
      .eq('organization_id', organizationId);

    if (error) {
      console.error('Error leaving group:', error);
      toast.error('Error leaving group.');
    } else {
      // Redirect to home or dashboard after leaving
      navigate('/dashboard');
    }
  };

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
          <Typography variant="h4" sx={{ fontWeight: 500 }}>
            {organization ? `${organization.name} - Members` : 'Organization Members'}
          </Typography>

          {session.user.id !== organization?.created_by && (
            <Button
              variant="outlined"
              color="error"
              onClick={() => setMemberToRemove({ user_id: session.user.id })}
            >
              Leave Group
            </Button>
          )}
        </Box>

        {/* Members List Section */}
        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, mb: 4 }}>
  <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
    Group Members
  </Typography>
  <List>
    {members.map((member) => (
      <ListItem
        key={member.id}
        sx={{
          backgroundColor: 'background.paper',
          mb: 1,
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' },
          p: { xs: 2, sm: 3 }
        }}
        secondaryAction={
          isAdmin && member.user_id !== session.user.id && (
            <Box sx={{ 
              display: 'flex',
              mt: { xs: 2, sm: 0 },
              width: { xs: '100%', sm: 'auto' },
              justifyContent: { xs: 'flex-start', sm: 'flex-end' },
              alignItems: 'center',
              gap: 1
            }}>
              <FormControl 
                variant='outlined' 
                size='small' 
                sx={{ 
                  minWidth: { xs: '50%', sm: 120 },
                  flexGrow: { xs: 1, sm: 0 }
                }}
              >
                <InputLabel>Role</InputLabel>
                <Select
                  value={member.role}
                  onChange={(e) => handleRoleChange(member.id, e.target.value)}
                  label='Role'
                  disabled={members.filter(m => m.role === 'admin').length === 1 && member.role === 'admin' || member.user_id === organization?.created_by}
                >
                  <MenuItem value='member'>Member</MenuItem>
                  <MenuItem value='admin'>Admin</MenuItem>
                </Select>
              </FormControl>
              <IconButton 
                edge="end" 
                aria-label="delete" 
                onClick={() => setMemberToRemove(member)}
                color="error"
                disabled={member.user_id === organization?.created_by}
                sx={{ ml: { xs: 0, sm: 1 } }}
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          )
        }
      >
        <ListItemText
          sx={{ 
            width: '100%',
            mb: { xs: isAdmin ? 1 : 0, sm: 0 }
          }}
          primary={
            <Typography variant="subtitle1" fontWeight="medium">
              {member.users?.name || 'Unknown User'}
            </Typography>
          }
          secondary={
            <Box sx={{ mt: 0.5 }}>
              <Typography component="span" variant="body2" color="text.primary">
                Role: {member.role}
              </Typography>
              {member.users?.bio && (
                <>
                  {' - '}
                  <Typography 
                    component="span" 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ 
                      display: { xs: 'block', sm: 'inline' },
                      mt: { xs: 0.5, sm: 0 }
                    }}
                  >
                    {member.users.bio}
                  </Typography>
                </>
              )}
            </Box>
          }
        />
      </ListItem>
    ))}
  </List>
</Paper>

        {/* Invite Section */}
        {isAdmin && (
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
              Invite New Members
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <TextField
                label="Invite User by Email"
                value={emailToInvite}
                onChange={(e) => setEmailToInvite(e.target.value)}
                fullWidth
                size="medium"
              />
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleInvite}
                sx={{ minWidth: '120px', height: '56px' }}
              >
                Invite User
              </Button>
            </Box>
          </Paper>
        )}
      </Paper>

      <Dialog
        open={Boolean(memberToRemove)}
        onClose={() => setMemberToRemove(null)}
      >
        <DialogTitle>
          {memberToRemove?.user_id === session.user.id 
            ? 'Confirm Leave Group' 
            : 'Confirm Member Removal'
          }
        </DialogTitle>
        <DialogContent>
          {memberToRemove?.user_id === session.user.id 
            ? 'Are you sure you want to leave this group?'
            : `Are you sure you want to remove ${memberToRemove?.users?.name || 'this user'} from the organization?`
          }
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMemberToRemove(null)}>Cancel</Button>
          <Button 
            onClick={memberToRemove?.user_id === session.user.id ? handleLeaveGroup : handleRemoveMember} 
            color="error" 
            variant="contained"
          >
            {memberToRemove?.user_id === session.user.id ? 'Leave' : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default GroupMembers;
