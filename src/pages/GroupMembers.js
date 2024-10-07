import React, { useState, useEffect, useContext } from 'react';
import { useParams } from 'react-router-dom';
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
} from '@mui/material';
import { v4 as uuidv4 } from 'uuid';

const GroupMembers = () => {
  const { session } = useContext(AuthContext);
  const { organizationId } = useParams();
  const [members, setMembers] = useState([]);
  const [emailToInvite, setEmailToInvite] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [organization, setOrganization] = useState(null);

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

  return (
    <Container maxWidth="md">
      <Typography variant="h4" gutterBottom>
        {organization ? `${organization.name} - Members` : 'Organization Members'}
      </Typography>
      <List>
        {members.map((member) => {
          const user = member.users;
          const name = user ? user.name || user.email : 'Unknown User';
          const bio = user ? user.bio : null;
          const isLastAdmin = members.filter(m => m.role === 'admin').length === 1 && member.role === 'admin';

          return (
            <ListItem key={member.id}>
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
              {isAdmin && member.user_id !== session.user.id && (
                <FormControl variant='outlined' size='small' style={{ minWidth: 120 }}>
                  <InputLabel>Role</InputLabel>
                  <Select
                    value={member.role}
                    onChange={(e) => handleRoleChange(member.id, e.target.value)}
                    label='Role'
                    disabled={isLastAdmin}
                  >
                    <MenuItem value='member'>Member</MenuItem>
                    <MenuItem value='admin'>Admin</MenuItem>
                  </Select>
                </FormControl>
              )}
            </ListItem>
          );
        })}
      </List>
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
