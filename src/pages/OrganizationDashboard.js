// src/pages/OrganizationDashboard.js

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate, Link } from 'react-router-dom';
import QuestionTable from '../components/QuestionTable';
import QuestionCard from '../components/QuestionCard';
import OrganizationKanban from '../components/OrganizationKanban';

const OrganizationDashboard = () => {
  const { session } = useAuth();
  const [organization, setOrganization] = useState(null);
  const [members, setMembers] = useState([]);
  const [emailToInvite, setEmailToInvite] = useState('');
  const [organizationQuestions, setOrganizationQuestions] = useState([]);
  const [openQuestions, setOpenQuestions] = useState([]);
  const [viewMode, setViewMode] = useState('cards');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrganization = async () => {
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

  const fetchMembers = async (organizationId) => {
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
    }
  };

  const fetchQuestions = async (organizationId) => {
    const { data: directQuestions, error: directError } = await supabase
      .from('questions')
      .select('*')
      .eq('organization_id', organizationId);

    if (directError) {
      console.error('Error fetching directly associated questions:', directError);
    }

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

    const allOrgQuestions = [
      ...(directQuestions || []).map(q => ({ ...q, is_direct: true })),
      ...(indirectQuestions?.map(q => ({ ...q.questions, is_direct: false, id: q.question_id })) || [])
    ];
    const uniqueOrgQuestions = Array.from(new Set(allOrgQuestions.map(q => q.id)))
      .map(id => allOrgQuestions.find(q => q.id === id));

    setOrganizationQuestions(uniqueOrgQuestions);

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

  const handleInvite = async () => {
    if (!emailToInvite) {
      alert('Please enter an email address.');
      return;
    }

    const invitationToken = uuidv4();

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
      await sendInvitationEmail(emailToInvite, invitationToken);
      alert('Invitation sent successfully!');
      setEmailToInvite('');
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    const { error } = await supabase
      .from('organization_users')
      .update({ role: newRole })
      .eq('id', memberId);

    if (error) {
      console.error('Error updating role:', error);
      alert('Error updating user role.');
    } else {
      await fetchMembers(organization.id);
    }
  };

  const handleQuestionClick = (id) => {
    navigate(`/questions/${id}`);
  };

  const handleAddToOrganization = async (questionId) => {
    try {
      // Add to organization_questions table
      const { error: addError } = await supabase
        .from('organization_questions')
        .insert({ organization_id: organization.id, question_id: questionId });

      if (addError) throw addError;

      // Add to organization_question_rankings table
      const { error: rankError } = await supabase
        .from('organization_question_rankings')
        .insert({
          organization_id: organization.id,
          question_id: questionId,
          manual_rank: null,
          elo_score: 1500, // Default ELO score
          kanban_status: 'Now', // Default Kanban status
          kanban_order: 0 // Default Kanban order
        });

      if (rankError) throw rankError;

      // Refresh the questions
      await fetchQuestions(organization.id);
      alert('Question added to organization successfully!');
    } catch (error) {
      console.error('Error adding question to organization:', error);
      alert('Failed to add question to organization.');
    }
  };

  const handleRemoveFromOrganization = async (questionId) => {
    try {
      // Remove from organization_questions table
      const { error: removeError } = await supabase
        .from('organization_questions')
        .delete()
        .match({ organization_id: organization.id, question_id: questionId });

      if (removeError) throw removeError;

      // Remove from organization_question_rankings table
      const { error: rankingError } = await supabase
        .from('organization_question_rankings')
        .delete()
        .match({ organization_id: organization.id, question_id: questionId });

      if (rankingError) throw rankingError;

      // Refresh the questions
      await fetchQuestions(organization.id);
      alert('Question removed from organization successfully!');
    } catch (error) {
      console.error('Error removing question from organization:', error);
      alert('Failed to remove question from organization.');
    }
  };

  const handleDeleteDirectQuestion = async (questionId) => {
    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', questionId);

      if (error) throw error;

      // Refresh the questions
      await fetchQuestions(organization.id);
      alert('Question deleted successfully!');
    } catch (error) {
      console.error('Error deleting question:', error);
      alert('Failed to delete question. Error: ' + error.message);
    }
  };

  const renderQuestions = (questions, isOrganizationQuestion = false) => {
    switch (viewMode) {
      case 'table':
        return (
          <QuestionTable 
            questions={questions} 
            onQuestionClick={handleQuestionClick}
            onAddToOrganization={isOrganizationQuestion ? null : handleAddToOrganization}
            onRemoveFromOrganization={isOrganizationQuestion ? handleRemoveFromOrganization : null}
            onDeleteQuestion={isOrganizationQuestion ? handleDeleteDirectQuestion : null}
          />
        );
      case 'cards':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {questions.map(question => (
              <QuestionCard 
                key={question.id} 
                question={question} 
                onClick={() => handleQuestionClick(question.id)}
                onAddToOrganization={isOrganizationQuestion ? null : () => handleAddToOrganization(question.id)}
                onRemoveFromOrganization={isOrganizationQuestion && !question.is_direct ? () => handleRemoveFromOrganization(question.id) : null}
                onDeleteQuestion={isOrganizationQuestion && question.is_direct ? () => handleDeleteDirectQuestion(question.id) : null}
              />
            ))}
          </div>
        );
      case 'kanban':
        return <OrganizationKanban organizationId={organization.id} />;
      default:
        return null;
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
              {member.user_id !== session.user.id && (
                <FormControl variant='outlined' size='small' style={{ minWidth: 120 }}>
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
      <div className="flex justify-between items-center mb-4">
        <Typography variant='h5'>Organization Questions</Typography>
        <div>
          <button 
            onClick={() => setViewMode('table')} 
            className={`px-4 py-2 ${viewMode === 'table' ? 'bg-blue-900 rounded-lg font-bold text-white' : 'bg-gray-300 rounded-lg font-bold text-white'} transition`}
          >
            Table View
          </button>
          <button 
            onClick={() => setViewMode('cards')} 
            className={`ml-2 px-4 py-2 ${viewMode === 'cards' ? 'bg-blue-900 rounded-lg font-bold text-white' : 'bg-gray-300 rounded-lg font-bold text-white'} transition`}
          >
            Card View
          </button>
          <button 
            onClick={() => setViewMode('kanban')} 
            className={`ml-2 px-4 py-2 ${viewMode === 'kanban' ? 'bg-blue-900 rounded-lg font-bold text-white' : 'bg-gray-300 rounded-lg font-bold text-white'} transition`}
          >
            Kanban View
          </button>
          <Link to={`/organization/${organization.id}/elo-ranking`}>
            <button className="ml-2 px-4 py-2 bg-green-600 rounded-lg font-bold text-white transition">
              ELO Ranking
            </button>
          </Link>
          <Link to={`/organization/${organization.id}/manual-ranking`}>
            <button className="ml-2 px-4 py-2 bg-yellow-600 rounded-lg font-bold text-white transition">
              Manual Ranking
            </button>
          </Link>
        </div>
      </div>
      {viewMode === 'kanban' ? (
        <OrganizationKanban organizationId={organization.id} />
      ) : (
        renderQuestions(organizationQuestions, true)
      )}
      {organizationQuestions.length === 0 && (
        <Typography variant='body1'>No questions found for this organization.</Typography>
      )}
      <Divider style={{ margin: '2rem 0' }} />
      <Typography variant='h5' style={{ marginBottom: '1rem' }}>
        Open Questions
      </Typography>
      {renderQuestions(openQuestions)}
      {openQuestions.length === 0 && (
        <Typography variant='body1'>No open questions available.</Typography>
      )}
    </Container>
  );
};

export default OrganizationDashboard;