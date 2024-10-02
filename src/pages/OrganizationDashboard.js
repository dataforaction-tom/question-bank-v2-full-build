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
  Modal,
  Card,
  CardContent,
  CardActionArea,
  Grid,
  Box,
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate, Link } from 'react-router-dom';
import QuestionTable from '../components/QuestionTable';
import QuestionCard from '../components/QuestionCard';
import OrganizationKanban from '../components/OrganizationKanban';

const OrganizationDashboard = () => {
  const { session } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrganization, setSelectedOrganization] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);  // New state to track admin status
  const [members, setMembers] = useState([]);
  const [emailToInvite, setEmailToInvite] = useState('');
  const [organizationQuestions, setOrganizationQuestions] = useState([]);
  const [openQuestions, setOpenQuestions] = useState([]);
  const [viewMode, setViewMode] = useState('cards');
  const [showMembers, setShowMembers] = useState(false);
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState('manual_rank'); // 'manual_rank' or 'elo_score'
  const [sortedQuestions, setSortedQuestions] = useState([]);
  const [showOrgSelector, setShowOrgSelector] = useState(false);

  useEffect(() => {
    const fetchOrganizations = async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('*, organization_users!inner(*)')
        .eq('organization_users.user_id', session.user.id);

      if (error) {
        console.error('Error fetching organizations:', error);
        alert('Error fetching your organizations.');
        navigate('/');
      } else if (data.length === 0) {
        alert('You are not a member of any organization.');
        navigate('/');
      } else {
        setOrganizations(data);
        if (data.length === 1) {
          handleOrganizationSelect(data[0]);
        } else {
          setShowOrgSelector(true);
        }
      }
    };

    fetchOrganizations();
  }, [session.user.id, navigate]);

  useEffect(() => {
    sortQuestions(organizationQuestions, sortBy);
  }, [sortBy, organizationQuestions]);

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
    // Fetch direct questions (unchanged)
    const { data: directQuestions, error: directError } = await supabase
      .from('questions')
      .select(`
        *,
        endorsements:endorsements(count),
        followers:question_followers(count),
        responses:responses(count)
      `)
      .eq('organization_id', organizationId);

    if (directError) {
      console.error('Error fetching directly associated questions:', directError);
    }

    // Fetch indirect questions (unchanged)
    const { data: indirectQuestions, error: indirectError } = await supabase
      .from('organization_questions')
      .select(`
        question_id,
        questions (
          *,
          endorsements:endorsements(count),
          followers:question_followers(count),
          responses:responses(count)
        )
      `)
      .eq('organization_id', organizationId);

    if (indirectError) {
      console.error('Error fetching indirectly associated questions:', indirectError);
    }

    // Fetch open questions (modified)
    const { data: openQuestionsData, error: openError } = await supabase
      .from('questions')
      .select(`
        *,
        endorsements:endorsements(count),
        followers:question_followers(count),
        responses:responses(count)
      `)
      .eq('is_open', true)
      .order('priority_score', { ascending: false });

    if (openError) {
      console.error('Error fetching open questions:', openError);
    }

    const allOrgQuestions = [
      ...(directQuestions || []).map(q => ({ 
        ...q, 
        is_direct: true,
        endorsements_count: q.endorsements[0]?.count || 0,
        followers_count: q.followers[0]?.count || 0,
        responses_count: q.responses[0]?.count || 0
      }))
    ];

    // Add indirect questions only if they're not already in allOrgQuestions
    indirectQuestions?.forEach(q => {
      if (!allOrgQuestions.some(orgQ => orgQ.id === q.question_id)) {
        allOrgQuestions.push({
          ...q.questions, 
          is_direct: false, 
          id: q.question_id,
          endorsements_count: q.questions.endorsements[0]?.count || 0,
          followers_count: q.questions.followers[0]?.count || 0,
          responses_count: q.questions.responses[0]?.count || 0
        });
      }
    });

    const openQuestions = (openQuestionsData || [])
      .filter(q => q.organization_id !== organizationId)
      .map(q => ({
        ...q,
        endorsements_count: q.endorsements[0]?.count || 0,
        followers_count: q.followers[0]?.count || 0,
        responses_count: q.responses[0]?.count || 0
      }));

    setOrganizationQuestions(allOrgQuestions);
    setOpenQuestions(openQuestions);

    // ... rest of the function remains the same
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
          text: `You have been invited to join ${selectedOrganization.name}. Click the link to accept the invitation: ${invitationLink}`,
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
        organization_id: selectedOrganization.id,
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
      await fetchMembers(selectedOrganization.id);
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
        .insert({ organization_id: selectedOrganization.id, question_id: questionId });

      if (addError) throw addError;

      // Add to organization_question_rankings table
      const { error: rankError } = await supabase
        .from('organization_question_rankings')
        .insert({
          organization_id: selectedOrganization.id,
          question_id: questionId,
          manual_rank: null,
          elo_score: 1500, // Default ELO score
          kanban_status: 'Now', // Default Kanban status
          kanban_order: 0 // Default Kanban order
        });

      if (rankError) throw rankError;

      // Refresh the questions
      await fetchQuestions(selectedOrganization.id);
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
        .match({ organization_id: selectedOrganization.id, question_id: questionId });

      if (removeError) throw removeError;

      // Remove from organization_question_rankings table
      const { error: rankingError } = await supabase
        .from('organization_question_rankings')
        .delete()
        .match({ organization_id: selectedOrganization.id, question_id: questionId });

      if (rankingError) throw rankingError;

      // Refresh the questions
      await fetchQuestions(selectedOrganization.id);
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
      await fetchQuestions(selectedOrganization.id);
      alert('Question deleted successfully!');
    } catch (error) {
      console.error('Error deleting question:', error);
      alert('Failed to delete question. Error: ' + error.message);
    }
  };

  const handleMakeQuestionOpen = async (questionId) => {
    if (!isAdmin) {
      alert('Only admins can make questions open.');
      return;
    }

    try {
      // Update the question to make it open
      const { error: updateError } = await supabase
        .from('questions')
        .update({ is_open: true })
        .eq('id', questionId);

      if (updateError) throw updateError;

      // Check if the question is already in the organization_questions table
      const { data: existingEntry, error: checkError } = await supabase
        .from('organization_questions')
        .select('*')
        .eq('organization_id', selectedOrganization.id)
        .eq('question_id', questionId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 means no rows returned, which is fine
        throw checkError;
      }

      // If the entry doesn't exist, insert it
      if (!existingEntry) {
        const { error: insertError } = await supabase
          .from('organization_questions')
          .insert({ organization_id: selectedOrganization.id, question_id: questionId });

        if (insertError) throw insertError;
      }

      // Refresh the questions
      await fetchQuestions(selectedOrganization.id);
      alert('Question made open successfully!');
    } catch (error) {
      console.error('Error making question open:', error);
      alert('Failed to make question open. Error: ' + error.message);
    }
  };

  const handleUpdateKanbanStatus = async (questionId, newStatus) => {
    try {
      const { error } = await supabase
        .from('organization_question_rankings')
        .update({ kanban_status: newStatus })
        .match({ organization_id: selectedOrganization.id, question_id: questionId });

      if (error) throw error;

      // Refresh the questions
      await fetchQuestions(selectedOrganization.id);
    } catch (error) {
      console.error('Error updating Kanban status:', error);
      alert('Failed to update Kanban status. Error: ' + error.message);
    }
  };

  const renderQuestions = (questions, isOrganizationQuestion = false) => {
    const displayQuestions = isOrganizationQuestion ? sortedQuestions : questions;
    console.log('Display questions:', displayQuestions);
  
    switch (viewMode) {
      case 'table':
        return (
          <QuestionTable 
            questions={displayQuestions} 
            onQuestionClick={handleQuestionClick}
            onAddToOrganization={isAdmin && !isOrganizationQuestion ? handleAddToOrganization : null}
            onRemoveFromOrganization={isAdmin && isOrganizationQuestion ? handleRemoveFromOrganization : null}
            onDeleteQuestion={isAdmin && isOrganizationQuestion ? handleDeleteDirectQuestion : null}
            onMakeQuestionOpen={isAdmin && isOrganizationQuestion ? handleMakeQuestionOpen : null}
            isAdmin={isAdmin}
            sortBy={isOrganizationQuestion ? sortBy : 'priority_score'}
            onSortChange={isOrganizationQuestion ? setSortBy : null}
            isOrganizationQuestion={isOrganizationQuestion}
            onUpdateKanbanStatus={handleUpdateKanbanStatus}
          />
        );
      case 'cards':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayQuestions.map(question => {
              console.log('Question being passed to QuestionCard:', question);
              return (
                <QuestionCard 
                  key={question.id} 
                  question={{
                    ...question,
                    endorsements_count: question.endorsements_count || 0,
                    followers_count: question.followers_count || 0,
                    responses_count: question.responses_count || 0
                  }}
                  onClick={() => handleQuestionClick(question.id)}
                  onAddToOrganization={isAdmin && !isOrganizationQuestion ? () => handleAddToOrganization(question.id) : null}
                  onRemoveFromOrganization={isAdmin && isOrganizationQuestion && !question.is_direct ? () => handleRemoveFromOrganization(question.id) : null}
                  onDeleteQuestion={isAdmin && isOrganizationQuestion && question.is_direct ? () => handleDeleteDirectQuestion(question.id) : null}
                  onMakeQuestionOpen={isAdmin && isOrganizationQuestion && question.is_direct && !question.is_open ? () => handleMakeQuestionOpen(question.id) : null}
                  isAdmin={isAdmin}
                  isOrganizationQuestion={isOrganizationQuestion}
                  onUpdateKanbanStatus={handleUpdateKanbanStatus}
                />
              );
            })}
          </div>
        );
      case 'kanban':
        return <OrganizationKanban organizationId={selectedOrganization.id} />;
      default:
        return null;
    }
  };

  const toggleMembersSection = () => {
    setShowMembers(!showMembers);
  };

  const sortQuestions = (questions, sortBy) => {
    const sorted = [...questions].sort((a, b) => {
      if (sortBy === 'manual_rank') {
        return (a.manual_rank || 0) - (b.manual_rank || 0);
      } else {
        return (b.elo_score || 1500) - (a.elo_score || 1500);
      }
    });
    setSortedQuestions(sorted);
  };

  const toggleSortBy = () => {
    setSortBy(prevSortBy => prevSortBy === 'manual_rank' ? 'elo_score' : 'manual_rank');
  };

  const handleOrganizationSelect = async (org) => {
    setSelectedOrganization(org);
    setIsAdmin(org.organization_users[0].role === 'admin');
    setShowOrgSelector(false);
    await fetchMembers(org.id);
    await fetchQuestions(org.id);
  };

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
            Select an Organization
          </Typography>
          <Grid container spacing={2}>
            {organizations.map((org, index) => (
              <Grid item xs={12} sm={6} md={4} key={org.id}>
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
                        {org.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Role: {org.organization_users[0].role}
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

  return (
    <Container>
      <OrganizationSelectorModal
        open={showOrgSelector}
        organizations={organizations}
        onSelect={handleOrganizationSelect}
      />
      {selectedOrganization && (
        <>
          <Typography variant='h4'>{selectedOrganization.name} Dashboard</Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={toggleMembersSection} 
            style={{ marginTop: '1rem', marginBottom: '1rem' }}
          >
            {showMembers ? 'Hide Members' : 'Show Members'}
          </Button>

          {showMembers && (
            <>
              <Typography variant='h6'>Members:</Typography>
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

          <Divider style={{ margin: '2rem 0' }} />
          <div className="flex justify-between items-center mb-4">
            <Typography variant='h5'>Organization Questions</Typography>
            <div>
              <button 
                onClick={toggleSortBy} 
                className={`px-4 py-2 rounded-lg font-bold text-white transition mr-2 ${
                  sortBy === 'manual_rank' 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {sortBy === 'manual_rank' ? 'Manual Rank' : 'ELO Score'}
              </button>
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
              <Link to={`/organization/${selectedOrganization.id}/elo-ranking`}>
                <button className="ml-2 px-4 py-2 bg-green-600 rounded-lg font-bold text-white transition">
                  ELO Ranking
                </button>
              </Link>
              <Link to={`/organization/${selectedOrganization.id}/manual-ranking`}>
                <button className="ml-2 px-4 py-2 bg-yellow-600 rounded-lg font-bold text-white transition">
                  Manual Ranking
                </button>
              </Link>
            </div>
          </div>
          {viewMode === 'kanban' ? (
            <OrganizationKanban organizationId={selectedOrganization.id} />
          ) : (
            <>
              {renderQuestions(organizationQuestions, true)}
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
            </>
          )}
        </>
      )}
    </Container>
  );
};

export default OrganizationDashboard;