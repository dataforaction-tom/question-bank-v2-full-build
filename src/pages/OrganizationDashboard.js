// src/pages/OrganizationDashboard.js

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
  Divider,
  Card,
  CardContent,
  CardActionArea,
  CardActions,
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate } from 'react-router-dom';

const OrganizationDashboard = () => {
  const { session } = useAuth();
  const [organization, setOrganization] = useState(null);
  const [members, setMembers] = useState([]);
  const [emailToInvite, setEmailToInvite] = useState('');
  const [organizationQuestions, setOrganizationQuestions] = useState([]);
  const [openQuestions, setOpenQuestions] = useState([]);
  const navigate = useNavigate();

  const fetchMembers = async (organizationId) => {
    const { data, error } = await supabase
      .from('organization_users')
      .select(
        `
        *,
        users (
          id,
          name,
          bio
        )
      `
      )
      .eq('organization_id', organizationId);
  
    if (error) {
      console.error('Error fetching members:', error);
    } else {
      console.log('Fetched members:', data);
      setMembers(data);
    }
  };

  const fetchQuestions = async (organizationId) => {
    // Fetch questions directly associated with the organization
    const { data: directQuestions, error: directError } = await supabase
      .from('questions')
      .select('*')
      .eq('organization_id', organizationId);

    if (directError) {
      console.error('Error fetching directly associated questions:', directError);
    }

    // Fetch questions associated via organization_questions table
    const { data: indirectQuestions, error: indirectError } = await supabase
      .from('organization_questions')
      .select(`
        question_id,
        questions (*)
      `)
      .eq('organization_id', organizationId);

    if (indirectError) {
      console.error('Error fetching indirectly associated questions:', indirectError);
    }

    // Combine and deduplicate the questions
    const allOrgQuestions = [
      ...(directQuestions || []).map(q => ({ ...q, is_direct: true })),
      ...(indirectQuestions?.map(q => ({ ...q.questions, is_direct: false, id: q.question_id })) || [])
    ];
    const uniqueOrgQuestions = Array.from(new Set(allOrgQuestions.map(q => q.id)))
      .map(id => allOrgQuestions.find(q => q.id === id));

    setOrganizationQuestions(uniqueOrgQuestions);

    // Fetch open questions
    const { data: openQs, error: openError } = await supabase
      .from('questions')
      .select('*')
      .eq('is_open', true)
      .is('organization_id', null);

    if (openError) {
      console.error('Error fetching open questions:', openError);
    } else {
      setOpenQuestions(openQs);
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
        await fetchMembers(data.id);
        await fetchQuestions(data.id);
      }
    };

    fetchOrganization();
  }, [session.user.id, navigate]);

  // Function to send the invitation email
  const sendInvitationEmail = async (email, token) => {
    // Construct the invitation link
    const invitationLink = `${window.location.origin}/accept-invitation?token=${token}`;

    // Send the email via serverless vercel function
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

  // Function to handle inviting a user
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

  // Function to handle changing a member's role
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

  const handleQuestionClick = (id) => {
    navigate(`/questions/${id}`);
  };

  const handleAddToOrganization = async (questionId) => {
    // Check if the question is already added to the organization
    const { data: existingEntry, error: checkError } = await supabase
      .from('organization_questions')
      .select('*')
      .eq('organization_id', organization.id)
      .eq('question_id', questionId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing entry:', checkError);
      alert('Failed to add question to organization.');
      return;
    }

    if (existingEntry) {
      alert('This question is already added to your organization.');
      return;
    }

    // Add the question to the organization
    const { error } = await supabase
      .from('organization_questions')
      .insert({ organization_id: organization.id, question_id: questionId });

    if (error) {
      console.error('Error adding question to organization:', error);
      alert('Failed to add question to organization.');
    } else {
      await fetchQuestions(organization.id);
      alert('Question added to organization successfully!');
    }
  };

  const handleRemoveFromOrganization = async (questionId) => {
    // Remove the question from the organization_questions table
    const { error } = await supabase
      .from('organization_questions')
      .delete()
      .eq('organization_id', organization.id)
      .eq('question_id', questionId);

    if (error) {
      console.error('Error removing question from organization:', error);
      alert('Failed to remove question from organization.');
    } else {
      await fetchQuestions(organization.id);
      alert('Question removed from organization successfully!');
    }
  };

  const renderQuestionCard = (question, isOrganizationQuestion = false) => (
    <Card
      key={question.id}
      style={{ marginBottom: '1rem', cursor: 'pointer' }}
    >
      <CardActionArea onClick={() => handleQuestionClick(question.id)}>
        <CardContent>
          <Typography variant='h6'>{question.content}</Typography>
          <Typography variant='body2' color="textSecondary">
            Created: {new Date(question.created_at).toLocaleDateString()}
          </Typography>
        </CardContent>
      </CardActionArea>
      <CardActions>
        {!isOrganizationQuestion && (
          <Button 
            size="small" 
            color="primary" 
            onClick={(e) => {
              e.stopPropagation();
              handleAddToOrganization(question.id);
            }}
          >
            Add to Organization
          </Button>
        )}
        {isOrganizationQuestion && question.is_direct === false && (
          <Button 
            size="small" 
            color="secondary" 
            onClick={(e) => {
              e.stopPropagation();
              handleRemoveFromOrganization(question.id);
            }}
          >
            Remove from Organization
          </Button>
        )}
      </CardActions>
    </Card>
  );

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
        {members.map((member) => {
          const user = member.users;
          const name = user ? user.name || user.email : 'Unknown User';
          const bio = user ? user.bio : null;

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
          );
        })}
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
      <Divider style={{ margin: '2rem 0' }} />
      <Typography variant='h5' style={{ marginTop: '2rem', marginBottom: '1rem' }}>
        Organization Questions
      </Typography>
      {organizationQuestions.map(question => renderQuestionCard(question, true))}
      {organizationQuestions.length === 0 && (
        <Typography variant='body1'>No questions found for this organization.</Typography>
      )}

      <Divider style={{ margin: '2rem 0' }} />

      <Typography variant='h5' style={{ marginTop: '2rem', marginBottom: '1rem' }}>
        Open Questions
      </Typography>
      {openQuestions.map(question => renderQuestionCard(question))}
      {openQuestions.length === 0 && (
        <Typography variant='body1'>No open questions available.</Typography>
      )}
    </Container>
  );
};

export default OrganizationDashboard;
