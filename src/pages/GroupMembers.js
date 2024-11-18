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
} from '@mui/material';
import { v4 as uuidv4 } from 'uuid';
import DeleteIcon from '@mui/icons-material/Delete';

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
    const { data, error } = await supabase
      .from('organization_users')
      .select(`
        *,
        users (
          id,
          name,
          bio
        )
      `)
      .eq('organization_id', organizationId);

    if (error) {
      console.error('Error fetching members:', error);
    } else {
      setMembers(data);
      setIsAdmin(data.find(member => member.user_id === session.user.id)?.role === 'admin');
    }
  };

  const handleInvite = async () => {
    if (!emailToInvite) {
      alert('Please enter an email address.');
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
      alert('Error creating invitation.');
    } else {
      await sendInvitationEmail(emailToInvite, invitationToken);
      alert('Invitation sent successfully!');
      setEmailToInvite('');
    }
  };

  const sendInvitationEmail = async (email, token) => {
    const invitationLink = `${window.location.origin}/accept-invitation?token=${token}`;

    try {
      const response = await fetch('/api/send-invitation-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject: 'You are invited to join our organization',
          text: `You have been invited to join ${organization.name}. Click the link to accept the invitation: ${invitationLink}`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send invitation email.');
      }
    } catch (error) {
      console.error('Error sending invitation email:', error);
      alert('Error sending invitation email.');
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    if (!isAdmin) {
      alert('Only admins can change user roles.');
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
      alert('Cannot change the role of the group owner.');
      return;
    }

    // Check if this is the last admin trying to change their role
    if (newRole === 'member') {
      const adminCount = members.filter(m => m.role === 'admin').length;
      if (adminCount === 1 && members.find(m => m.id === memberId).role === 'admin') {
        alert('Cannot change role. There must be at least one admin in the organization.');
        return;
      }
    }

    const { error } = await supabase
      .from('organization_users')
      .update({ role: newRole })
      .eq('id', memberId);

    if (error) {
      console.error('Error updating role:', error);
      alert('Error updating user role.');
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
      alert('Cannot remove the group owner as they hold the subscription.');
      setMemberToRemove(null);
      return;
    }

    // Check if trying to remove the last admin
    if (memberToRemove.role === 'admin') {
      const adminCount = members.filter(m => m.role === 'admin').length;
      if (adminCount === 1) {
        alert('Cannot remove the last admin from the organization.');
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
      alert('Error removing member from organization.');
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
      alert('As the group owner, you cannot leave the group.');
      return;
    }

    // Check if user is the last admin
    const userMember = members.find(m => m.user_id === session.user.id);
    if (userMember.role === 'admin') {
      const adminCount = members.filter(m => m.role === 'admin').length;
      if (adminCount === 1) {
        alert('As the last admin, you must assign another admin before leaving the group.');
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
      alert('Error leaving group.');
    } else {
      // Redirect to home or dashboard after leaving
      navigate('/dashboard');
    }
  };

  return (
    <Container maxWidth="md">
      <Typography variant="h4" gutterBottom>
        {organization ? `${organization.name} - Members` : 'Organization Members'}
      </Typography>

      {session.user.id !== organization?.created_by && (
        <Button
          variant="outlined"
          color="error"
          onClick={() => setMemberToRemove({ user_id: session.user.id })}
          sx={{ mb: 2 }}
        >
          Leave Group
        </Button>
      )}

      <List>
        {members.map((member) => {
          const user = member.users;
          const name = user ? user.name || user.email : 'Unknown User';
          const bio = user ? user.bio : null;
          const isLastAdmin = members.filter(m => m.role === 'admin').length === 1 && member.role === 'admin';

          return (
            <ListItem
              key={member.id}
              secondaryAction={
                isAdmin && member.user_id !== session.user.id && (
                  <>
                    <FormControl variant='outlined' size='small' style={{ minWidth: 120, marginRight: '1rem' }}>
                      <InputLabel>Role</InputLabel>
                      <Select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.id, e.target.value)}
                        label='Role'
                        disabled={isLastAdmin || member.user_id === organization?.created_by}
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
                    >
                      <DeleteIcon />
                    </IconButton>
                  </>
                )
              }
            >
              <ListItemText
                primary={name}
                secondary={
                  <>
                    <Typography component='span' variant='body2' color='textPrimary'>
                      Role: {member.role}
                    </Typography>
                    {bio && (
                      <>
                        {' - '}
                        <Typography component='span' variant='body2' color='textSecondary'>
                          {bio}
                        </Typography>
                      </>
                    )}
                  </>
                }
              />
            </ListItem>
          );
        })}
      </List>

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

      {isAdmin && (
        <>
          <Typography variant='h6' style={{ marginTop: '2rem' }}>
            Invite a User:
          </Typography>
          <TextField
            label='Invite User by Email'
            value={emailToInvite}
            onChange={(e) => setEmailToInvite(e.target.value)}
            fullWidth
            style={{ marginBottom: '1rem' }}
          />
          <Button variant='contained' color='primary' onClick={handleInvite}>
            Invite User
          </Button>
        </>
      )}
    </Container>
  );
};

export default GroupMembers;
