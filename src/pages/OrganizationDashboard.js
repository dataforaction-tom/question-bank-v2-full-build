// src/pages/OrganizationDashboard.js

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import {
  Container,
  Typography,
  Divider,
  Modal,
  Card,
  CardContent,
  CardActionArea,
  Grid,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Button
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import toast, { Toaster } from 'react-hot-toast';
import QuestionTable from '../components/QuestionTable';
import QuestionCard from '../components/QuestionCard';
import OrganizationKanban from '../components/OrganizationKanban';
import Sidebar from '../components/Sidebar';
import OrganizationELORanking from '../components/OrganizationELORanking';
import OrganizationManualRanking from '../components/OrganizationManualRanking';
import ConfirmationDialog from '../components/ConfirmationDialog';
import { useOrganization } from '../context/OrganizationContext';
import CustomButton from '../components/Button';


const KANBAN_STATUSES = ['Now', 'Next', 'Future', 'Parked', 'Done'];

  const OrganizationDashboard = () => {
  const { currentOrganization, updateCurrentOrganization } = useOrganization();
  const { session } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrganization, setSelectedOrganization] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [organizationQuestions, setOrganizationQuestions] = useState([]);
  const [openQuestions, setOpenQuestions] = useState([]);
  const [viewMode, setViewMode] = useState('cards');
  const [sortBy, setSortBy] = useState('manual_rank');
  const [sortedQuestions, setSortedQuestions] = useState([]);
  const [showOrgSelector, setShowOrgSelector] = useState(false);
  const [questions, setQuestions] = useState({});
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [questionToMakeOpen, setQuestionToMakeOpen] = useState(null);

  

  const fetchQuestions = useCallback(async (organizationId) => {
    try {
      console.log('Fetching questions for organization:', organizationId);

      // Fetch all questions associated with the organization
      const { data: allQuestions, error: allQuestionsError } = await supabase
        .from('questions')
        .select(`
          *,
          endorsements:endorsements(count),
          followers:question_followers(count),
          responses:responses(count)
        `)
        .eq('organization_id', organizationId);

      if (allQuestionsError) throw allQuestionsError;

      // Fetch indirect questions (from organization_questions)
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

      if (indirectError) throw indirectError;

      // Fetch rankings separately
      const { data: rankings, error: rankingsError } = await supabase
        .from('organization_question_rankings')
        .select('*')
        .eq('organization_id', organizationId);

      if (rankingsError) throw rankingsError;

      // Create a map of rankings for quick lookup
      const rankingsMap = rankings.reduce((acc, rank) => {
        acc[rank.question_id] = rank;
        return acc;
      }, {});

      // Combine and format all questions
      const formattedQuestions = [
        ...allQuestions.map(q => ({
          ...q,
          is_direct: true,
          endorsements_count: q.endorsements?.[0]?.count || 0,
          followers_count: q.followers?.[0]?.count || 0,
          responses_count: q.responses?.[0]?.count || 0,
          manual_rank: rankingsMap[q.id]?.manual_rank ?? 0,
          elo_score: rankingsMap[q.id]?.elo_score ?? 1500,
          kanban_status: rankingsMap[q.id]?.kanban_status ?? 'Now'
        })),
        ...indirectQuestions.map(q => ({
          ...q.questions,
          is_direct: false,
          endorsements_count: q.questions?.endorsements?.[0]?.count || 0,
          followers_count: q.questions?.followers?.[0]?.count || 0,
          responses_count: q.questions?.responses?.[0]?.count || 0,
          manual_rank: rankingsMap[q.question_id]?.manual_rank ?? 0,
          elo_score: rankingsMap[q.question_id]?.elo_score ?? 1500,
          kanban_status: rankingsMap[q.question_id]?.kanban_status ?? 'Now'
        }))
      ];

      // Remove duplicates
      const uniqueQuestions = Array.from(new Set(formattedQuestions.map(q => q.id)))
        .map(id => formattedQuestions.find(q => q.id === id));

      // Group questions by Kanban status
      const groupedQuestions = KANBAN_STATUSES.reduce((acc, status) => {
        acc[status] = uniqueQuestions.filter(q => q.kanban_status === status);
        return acc;
      }, {});

      setQuestions(groupedQuestions);
      setOrganizationQuestions(uniqueQuestions);

      // Fetch open questions
      const { data: openQuestionsData, error: openError } = await supabase
        .from('questions')
        .select(`
          *,
          endorsements:endorsements(count),
          followers:question_followers(count),
          responses:responses(count)
        `)
        .eq('is_open', true);

      if (openError) throw openError;

      const openQuestions = openQuestionsData.map(q => ({
        ...q,
        endorsements_count: q.endorsements?.[0]?.count || 0,
        followers_count: q.followers?.[0]?.count || 0,
        responses_count: q.responses?.[0]?.count || 0
      }));

      setOpenQuestions(openQuestions);
      sortQuestions(uniqueQuestions, sortBy);

    } catch (error) {
      console.error('Error fetching questions:', error);
      alert('An error occurred while fetching questions. Please check the console for more details.');
    }
  }, [sortBy]);

  const handleOrganizationSelect = useCallback((org) => {
    updateCurrentOrganization(org);
    setIsAdmin(org.organization_users[0].role === 'admin');
    setShowOrgSelector(false);
    fetchQuestions(org.id);
  }, [updateCurrentOrganization, fetchQuestions]);

  useEffect(() => {
    if (location.state?.viewMode) {
      setViewMode(location.state.viewMode);
    }
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
  

  useEffect(() => {
    const fetchOrganizations = async () => {
      if (!session?.user?.id) return; // Add this check

      const { data, error } = await supabase
        .from('organizations')
        .select('*, organization_users!inner(*)')
        .eq('organization_users.user_id', session.user.id);

      if (error) {
        console.error('Error fetching organizations:', error);
        toast.error('Error fetching your organizations.');
        navigate('/');
      } else if (data.length === 0) {
        toast.error('You are not a member of any organization.');
        navigate('/');
      } else {
        setOrganizations(data);
        if (!currentOrganization) { // Only set if there's no current organization
          if (data.length === 1) {
            handleOrganizationSelect(data[0]);
          } else {
            setShowOrgSelector(true);
          }
        }
      }
    };

    fetchOrganizations();
  }, [session?.user?.id, navigate, handleOrganizationSelect, currentOrganization]);

  useEffect(() => {
    sortQuestions(organizationQuestions, sortBy);
  }, [sortBy, organizationQuestions]);

  useEffect(() => {
    if (currentOrganization) {
      fetchQuestions(currentOrganization.id);
    }
  }, [currentOrganization, fetchQuestions]);

  

  const handleQuestionClick = (id) => {
    navigate(`/questions/${id}`, {
      state: {
        previousPath: `/organization/${currentOrganization.id}`,
        viewMode: viewMode,
        organizationId: currentOrganization.id
      }
    });
  };

  const handleAddToOrganization = async (questionId) => {
    try {
      // Add to organization_questions table
      const { error: addError } = await supabase
        .from('organization_questions')
        .insert({ organization_id: currentOrganization.id, question_id: questionId });

      if (addError) throw addError;

      // Add to organization_question_rankings table
      const { error: rankError } = await supabase
        .from('organization_question_rankings')
        .insert({
          organization_id: currentOrganization.id,
          question_id: questionId,
          manual_rank: null,
          elo_score: 1500, // Default ELO score
          kanban_status: 'Now', // Default Kanban status
          kanban_order: 0 // Default Kanban order
        });

      if (rankError) throw rankError;

      // Refresh the questions
      await fetchQuestions(currentOrganization.id);
      toast.success('Question added to organization successfully!');
    } catch (error) {
      console.error('Error adding question to organization:', error);
      toast.error('Failed to add question to organization.');
    }
  };

  const handleRemoveFromOrganization = async (questionId) => {
    try {
      // Remove from organization_questions table
      const { error: removeError } = await supabase
        .from('organization_questions')
        .delete()
        .match({ organization_id: currentOrganization.id, question_id: questionId });

      if (removeError) throw removeError;

      // Remove from organization_question_rankings table
      const { error: rankingError } = await supabase
        .from('organization_question_rankings')
        .delete()
        .match({ organization_id: currentOrganization.id, question_id: questionId });

      if (rankingError) throw rankingError;

      // Refresh the questions
      await fetchQuestions(currentOrganization.id);
      toast.success('Question removed from organization successfully!');
    } catch (error) {
      console.error('Error removing question from organization:', error);
      toast.error('Failed to remove question from organization.');
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
      await fetchQuestions(currentOrganization.id);
      toast.success('Question deleted successfully!');
    } catch (error) {
      console.error('Error deleting question:', error);
      toast.error('Failed to delete question. Error: ' + error.message);
    }
  };

  const handleMakeQuestionOpen = useCallback((questionId) => {
    if (!isAdmin) {
      toast.error('Only admins can make questions open.');
      return;
    }
    setQuestionToMakeOpen(questionId);
    setOpenConfirmDialog(true);
  }, [isAdmin]);

  const handleConfirmMakeQuestionOpen = async () => {
    setOpenConfirmDialog(false);
    
    try {
      const { error } = await supabase.rpc('make_question_open', {
        input_question_id: questionToMakeOpen,
        input_org_id: currentOrganization.id
      });

      if (error) {
        console.error('Supabase RPC error:', error);
        throw error;
      }

      // Update local state
      setOrganizationQuestions(prevQuestions => 
        prevQuestions.filter(q => q.id !== questionToMakeOpen)
      );

      setOpenQuestions(prevOpenQuestions => [
        ...prevOpenQuestions,
        organizationQuestions.find(q => q.id === questionToMakeOpen)
      ]);

      // Refresh the questions to ensure consistency
      await fetchQuestions(currentOrganization.id);

      toast.success('Question made open successfully!');
    } catch (error) {
      console.error('Error making question open:', error);
      toast.error('Failed to make question open. Error: ' + (error.message || JSON.stringify(error)));
    }
  };

  const handleUpdateKanbanStatus = async (questionId, newStatus) => {
    try {
      const { error } = await supabase
        .from('organization_question_rankings')
        .update({ kanban_status: newStatus })
        .match({ organization_id: currentOrganization.id, question_id: questionId });

      if (error) throw error;

      // Update the local state
      setQuestions(prevQuestions => {
        const updatedQuestions = { ...prevQuestions };
        Object.keys(updatedQuestions).forEach(status => {
          const questionIndex = updatedQuestions[status].findIndex(q => q.id === questionId);
          if (questionIndex !== -1) {
            const [question] = updatedQuestions[status].splice(questionIndex, 1);
            question.kanban_status = newStatus;
            updatedQuestions[newStatus] = [...(updatedQuestions[newStatus] || []), question];
          }
        });
        return updatedQuestions;
      });

      // Update organizationQuestions as well
      setOrganizationQuestions(prevQuestions => 
        prevQuestions.map(q => 
          q.id === questionId ? { ...q, kanban_status: newStatus } : q
        )
      );

      // Re-sort the questions
      sortQuestions(organizationQuestions, sortBy);
    } catch (error) {
      console.error('Error updating Kanban status:', error);
      toast.error('Failed to update Kanban status. Error: ' + error.message);
    }
  };

  const renderQuestions = (questions, isOrganizationQuestion = false) => {
    const displayQuestions = isOrganizationQuestion ? sortedQuestions : questions;
    
  
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
            sortBy={isOrganizationQuestion ? sortBy : 'elo_score'}
            onSortChange={isOrganizationQuestion ? setSortBy : null}
            isOrganizationQuestion={isOrganizationQuestion}
            onUpdateKanbanStatus={handleUpdateKanbanStatus}
            setQuestions={setQuestions}  // Add this line
          />
        );
      case 'cards':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayQuestions.map(question => {
              
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
          return <OrganizationKanban 
            organizationId={currentOrganization.id}
            questions={questions}
            setQuestions={setQuestions}
          />;
        case 'elo-ranking':
          return <OrganizationELORanking organizationId={currentOrganization.id} />;
        case 'manual-ranking':
          return <OrganizationManualRanking organizationId={currentOrganization.id} />;
        default:
          return null;
      }
    };

  

  const sortQuestions = (questions, sortBy) => {
    console.log('Sorting questions:', questions);
    console.log('Sort by:', sortBy);
  
    const sorted = [...questions].sort((a, b) => {
      if (sortBy === 'manual_rank') {
        const rankA = a.manual_rank !== undefined ? a.manual_rank : 0;
        const rankB = b.manual_rank !== undefined ? b.manual_rank : 0;
        console.log(`Comparing manual_rank: ${rankA} vs ${rankB}`);
        return rankA - rankB; // Sort in descending order
      } else {
        const scoreA = a.elo_score !== undefined ? a.elo_score : 1500;
        const scoreB = b.elo_score !== undefined ? b.elo_score : 1500;
        console.log(`Comparing elo_score: ${scoreA} vs ${scoreB}`);
        return scoreB - scoreA; // Sort in descending order
      }
    });
  
    
    setSortedQuestions(sorted);
  };

  const toggleSortBy = () => {
    setSortBy(prevSortBy => prevSortBy === 'manual_rank' ? 'elo_score' : 'manual_rank');
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
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
            Select a Group
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
    <div className="flex">
      <Toaster position="top-right" />
      <Sidebar 
        sidebarOpen={sidebarOpen}
        toggleSidebar={toggleSidebar}
        sortBy={sortBy}
        toggleSortBy={toggleSortBy}
        viewMode={viewMode}
        setViewMode={setViewMode}
        selectedOrganizationId={currentOrganization?.id}
      />
      {/* Main Content */}
      <div className={`flex-grow transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'} p-8`}>
        <Container maxWidth="xl">
          <OrganizationSelectorModal
            open={showOrgSelector && !currentOrganization}
            organizations={organizations}
            onSelect={handleOrganizationSelect}
          />
          {currentOrganization && (
            <>
              <Typography variant='h4'>{currentOrganization.name} Dashboard</Typography>
              <CustomButton 
                type="ChangeView"
                onClick={() => {
            updateCurrentOrganization(null);
                  setShowOrgSelector(true);
                }}
                className="w-auto"
              >
                Change Organization
              </CustomButton>
              <Divider style={{ margin: '2rem 0' }} />
              <div className="mb-4">
                <Typography style={{ marginBottom: '1rem', textDecoration: 'underline #075985' }} variant='h5'>Group Questions</Typography>
              </div>
              {viewMode === 'kanban' ? (
                <OrganizationKanban 
                  organizationId={currentOrganization.id}
                  questions={questions}
                  setQuestions={setQuestions}
                />
              ) : viewMode === 'elo-ranking' ? (
                <OrganizationELORanking 
                  organizationId={currentOrganization.id}
                />
              ) : viewMode === 'manual-ranking' ? (
                <OrganizationManualRanking 
                  organizationId={currentOrganization.id}
                />
              ) : (
                <>
                  {renderQuestions(sortedQuestions, true)}
                  {organizationQuestions.length === 0 && (
                    <Typography variant='body1'>No questions found for this group.</Typography>
                  )}
                  
                  <Divider style={{ margin: '2rem 0', backgroundColor: '#075985' }} />
                  <Typography variant='h5' style={{ marginBottom: '1rem', textDecoration: 'underline #075985' }}>
                    Public Questions
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
      </div>
      <ConfirmationDialog
        open={openConfirmDialog}
        onClose={() => setOpenConfirmDialog(false)}
        onConfirm={handleConfirmMakeQuestionOpen}
        title="Confirm Making Question Public"
        message="Making a question public means your question and responses to this question will be in the public domain. This cannot be reversed. If you make the question public, this question will still be visible in your group dashboard, and you will follow and endorse this question also."
      />
    </div>
  );
};

export default OrganizationDashboard;
