import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import {
  Container,
  Typography,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate } from 'react-router-dom';

const OrganizationDashboard = () => {
  const { session } = useAuth();
  const [organization, setOrganization] = useState(null);
  const [members, setMembers] = useState([]);
  const [emailToInvite, setEmailToInvite] = useState('');
  const navigate = useNavigate();

  const fetchMembers = async (organizationId) => {
    const { data, error } = await supabase
      .from('organization_users')
      .select(`
        *,
        auth_users (
          email
        )
      `)
      .eq('organization_id', organizationId);

    if (error) {
      console.error('Error fetching members:', error);
    } else {
      setMembers(data);
    }
  };

  useEffect(() => {
    const fetchOrganization = async () => {
      // Fetch the organization where the user is an admin
      const { data, error } = await supabase
        .from('organizations')
        .select('*, organization_users!inner(*)')
        .eq('organization_users.user_id', session.user.id)
        .eq('organization_users.role', 'admin')
        .single();

      if (error || !data) {
        console.error('Error fetching organization:', error);
        alert('You are not an admin of any organization.');
        navigate('/');
      } else {
        setOrganization(data);
        // Fetch members after setting the organization
        await fetchMembers(data.id);
      }
    };

    fetchOrganization();
  }, [session.user.id, navigate]);

  const sendInvitationEmail = async (email, token) => {
    // Construct the invitation link
    const invitationLink = `${window.location.origin}/accept-invitation?token=${token}`;

    // Send the email via your serverless function
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

  const handleInvite = async () => {
    if (!emailToInvite) {
      alert('Please enter an email address.');
      return;
    }

    // Generate a unique token
    const invitationToken = uuidv4();

    // Insert the invitation into the database
    const { error } = await supabase.from('invitations').insert([
      {
        email: emailToInvite,
        organization_id: organization.id,
        token: invitationToken,
      },
    ]);

    if (error) {
      console.error('Error creating invitation:', error);
      alert('Error creating invitation.');
    } else {
      // Send the invitation email
      await sendInvitationEmail(emailToInvite, invitationToken);
      alert('Invitation sent successfully!');
      setEmailToInvite('');
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    // Update the role in the database
    const { error } = await supabase
      .from('organization_users')
      .update({ role: newRole })
      .eq('id', memberId);

    if (error) {
      console.error('Error updating role:', error);
      alert('Error updating user role.');
    } else {
      // Refresh members list
      await fetchMembers(organization.id);
    }
  };

  if (!organization) {
    return (
      <Container>
        <Typography variant='h5'>
          You are not an admin of any organization.
        </Typography>
      </Container>
    );
  }

  return (
    <Container>
      <Typography variant='h4'>{organization.name} Dashboard</Typography>
      <Typography variant='h6'>Members:</Typography>
      <List>
        {members.map((member) => (
          <ListItem key={member.id}>
            <ListItemText
              primary={member.auth_users.email}
              secondary={`Role: ${member.role}`}
            />
            {/* Show role management options only if the member is not the current user */}
            {member.user_id !== session.user.id && (
              <FormControl
                variant='outlined'
                size='small'
                style={{ minWidth: 120 }}
              >
                <InputLabel>Role</InputLabel>
                <Select
                  value={member.role}
                  onChange={(e) => handleRoleChange(member.id, e.target.value)}
                  label='Role'
                >
                  <MenuItem value='member'>Member</MenuItem>
                  <MenuItem value='admin'>Admin</MenuItem>
                </Select>
              </FormControl>
            )}
          </ListItem>
        ))}
      </List>
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
    </Container>
  );
};

export default OrganizationDashboard;
