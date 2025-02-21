// src/pages/OrganizationDashboard.js

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  
  Chip,
  CircularProgress
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
import TextField from '@mui/material/TextField';
import PublicIcon from '@mui/icons-material/Public';
import QuestionOverviewSection from '../components/QuestionOverviewSection';
import SearchIcon from '@mui/icons-material/Search';
import InputAdornment from '@mui/material/InputAdornment';
import Paper from '@mui/material/Paper';
import Button from '../components/Button';
import MenuItem from '@mui/material/MenuItem';
import Papa from 'papaparse';
import MobileNav from '../components/MobileNav';
import { Link } from 'react-router-dom';


const KANBAN_STATUSES = ['Now', 'Next', 'Future', 'Parked', 'Done'];

  const OrganizationDashboard = () => {
  const { currentOrganization, isAdmin, subscriptionStatus, updateCurrentOrganization, updateIsAdmin } = useOrganization();
  const { session } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrganization, setSelectedOrganization] = useState(null);
  const [organizationQuestions, setOrganizationQuestions] = useState([]);
  const [openQuestions, setOpenQuestions] = useState([]);
  const [viewMode, setViewMode] = useState('overview');
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
  const [tags, setTags] = useState([]);
  const [newTagName, setNewTagName] = useState('');
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const [selectedQuestionId, setSelectedQuestionId] = useState(null);
  const [isManageTagsDialogOpen, setIsManageTagsDialogOpen] = useState(false);
  const [tagToDelete, setTagToDelete] = useState(null);
  const [showEloRankingModal, setShowEloRankingModal] = useState(false);
  const [showPublicQuestions, setShowPublicQuestions] = useState(false);
  const [publicQuestionsLoading, setPublicQuestionsLoading] = useState(false);
  const [latestQuestions, setLatestQuestions] = useState([]);
  const [topQuestionsByCategory, setTopQuestionsByCategory] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [kanbanFilter, setKanbanFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  

  useEffect(() => {
    if (currentOrganization && subscriptionStatus === 'inactive') {
      // Store the current organization ID for potential return
      const inactiveOrgId = currentOrganization.id;
      // Clear current organization
      updateCurrentOrganization(null);
      // Show organization selector if user has other organizations
      if (organizations.length > 1) {
        setShowOrgSelector(true);
        toast.error(`${currentOrganization.name}'s subscription is inactive. Please select another group or update billing.`);
      } else {
        // If this is their only organization, redirect to billing
        navigate('/billing-required', { 
          state: { organizationId: inactiveOrgId } 
        });
      }
    }
  }, [subscriptionStatus, currentOrganization, organizations.length, navigate, updateCurrentOrganization]);

  // Add this useEffect to check when to show the modal
  useEffect(() => {
    if (currentOrganization) {
      const lastShown = localStorage.getItem(`eloRankingModalLastShown_${currentOrganization.id}`);
      const currentTime = new Date().getTime();
      
      if (!lastShown || currentTime - parseInt(lastShown) > 24 * 60 * 60 * 1000 * 7) {
        setShowEloRankingModal(true);
        localStorage.setItem(`eloRankingModalLastShown_${currentOrganization.id}`, currentTime.toString());
      }
    }
  }, [currentOrganization]);

  // Add handler to close the modal
  const handleCloseEloRanking = () => {
    setShowEloRankingModal(false);
  };

  

  const fetchTags = useCallback(async () => {
    if (!currentOrganization) return;
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('organization_id', currentOrganization.id);
    if (error) {
      console.error('Error fetching tags:', error);
    } else {
      // Filter out any null values
      setTags(data.filter(tag => tag != null));
    }
  }, [currentOrganization]);

  const fetchPublicQuestions = async () => {
    setPublicQuestionsLoading(true);
    try {
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
    } catch (error) {
      console.error('Error fetching public questions:', error);
      toast.error('Failed to load public questions');
    } finally {
      setPublicQuestionsLoading(false);
    }
  };

  // Define these functions first
  const processLatestQuestions = useCallback((questions) => {
    // Sort by created_at and take the 5 most recent
    const sortedQuestions = [...questions].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    ).slice(0, 5);
    
    setLatestQuestions(sortedQuestions);
  }, []);

  const processTopQuestionsByCategory = useCallback((questions) => {
    // Group questions by category
    const questionsByCategory = questions.reduce((acc, question) => {
      if (!question.category) return acc;
      
      if (!acc[question.category]) {
        acc[question.category] = [];
      }
      
      acc[question.category].push(question);
      return acc;
    }, {});

    // Find top question for each category
    const topByCategory = Object.entries(questionsByCategory).reduce((acc, [category, categoryQuestions]) => {
      // Sort by endorsements and take the top one
      const topQuestion = categoryQuestions.sort((a, b) => 
        b.endorsements_count - a.endorsements_count
      )[0];
      
      acc[category] = topQuestion;
      return acc;
    }, {});

    setTopQuestionsByCategory(topByCategory);
  }, []);

  // Then define fetchQuestions which depends on them
  const fetchQuestions = useCallback(async (organizationId) => {
    try {
      // Remove: console.log('Fetching questions for organization:', organizationId);

      const { data: allQuestions, error: allQuestionsError } = await supabase
        .from('questions')
        .select(`
          *,
          endorsements:endorsements(count),
          followers:question_followers(count),
          responses:responses(count),
          tags:question_tags(tags(*))
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
            responses:responses(count),
            tags:question_tags(tags(*))
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
          kanban_status: rankingsMap[q.id]?.kanban_status ?? 'Now',
          tags: q.tags.map(t => t.tags)
        })),
        ...indirectQuestions.map(q => ({
          ...q.questions,
          is_direct: false,
          endorsements_count: q.questions?.endorsements?.[0]?.count || 0,
          followers_count: q.questions?.followers?.[0]?.count || 0,
          responses_count: q.questions?.responses?.[0]?.count || 0,
          manual_rank: rankingsMap[q.question_id]?.manual_rank ?? 0,
          elo_score: rankingsMap[q.question_id]?.elo_score ?? 1500,
          kanban_status: rankingsMap[q.question_id]?.kanban_status ?? 'Now',
          tags: q.questions?.tags?.map(t => t.tags) || []
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
      sortQuestions(uniqueQuestions, sortBy);

      // Process overview data
      processLatestQuestions(uniqueQuestions);
      processTopQuestionsByCategory(uniqueQuestions);

    } catch (error) {
      // Remove: console.error('Error fetching questions:', error);
      toast.error('Failed to load organization questions');
    }
  }, [sortBy, processLatestQuestions, processTopQuestionsByCategory]);

  const handleOrganizationSelect = useCallback((org) => {
    setShowOrgSelector(false);
    const adminStatus = org.organization_users[0].role === 'admin';
    updateIsAdmin(adminStatus);
    // Call updateCurrentOrganization last as it triggers navigation
    updateCurrentOrganization(org);
  }, [updateCurrentOrganization, updateIsAdmin]);

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
      fetchTags();
    }
  }, [currentOrganization, fetchQuestions, fetchTags]);

  const displayQuestions = organizationQuestions.filter(question => {
    const matchesCategory = !categoryFilter || question.category === categoryFilter;
    const matchesKanban = !kanbanFilter || question.kanban_status === kanbanFilter;
    const matchesTag = !tagFilter || (question.tags && question.tags.some(tag => tag.name === tagFilter));
    return matchesCategory && matchesKanban && matchesTag;
  });

  const exportToCSV = () => {
    const csvData = [];
    
    // Get the currently filtered questions
    const questionsToExport = displayQuestions
      .filter(question => {
        const matchesCategory = !categoryFilter || question.category === categoryFilter;
        const matchesKanban = !kanbanFilter || question.kanban_status === kanbanFilter;
        const matchesTag = !tagFilter || (question.tags && question.tags.some(tag => tag.name === tagFilter));
        return matchesCategory && matchesKanban && matchesTag;
      });
  
    questionsToExport.forEach(question => {
      if (question.responses && question.responses.length > 0) {
        question.responses.forEach(response => {
          csvData.push({
            question_content: question.content,
            question_category: question.category,
            submission_date: new Date(question.created_at).toISOString().split('T')[0],
            kanban_status: question.kanban_status || '',
            tags: question.tags?.map(tag => tag.name).join(', ') || '',
            response_content: response.content,
            response_url: response.url,
            response_type: response.response_type
          });
        });
      } else {
        csvData.push({
          question_content: question.content,
          question_category: question.category,
          submission_date: new Date(question.created_at).toISOString().split('T')[0],
          kanban_status: question.kanban_status || '',
          tags: question.tags?.map(tag => tag.name).join(', ') || '',
          response_content: '',
          response_url: '',
          response_type: ''
        });
      }
    });
  
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    // Include filter information in the filename
    const filterInfo = [];
    if (categoryFilter) filterInfo.push(`category-${categoryFilter}`);
    if (kanbanFilter) filterInfo.push(`status-${kanbanFilter}`);
    if (tagFilter) filterInfo.push(`tag-${tagFilter}`);
    
    const filename = `${currentOrganization.name}_questions${filterInfo.length ? '_filtered_by_' + filterInfo.join('_') : ''}.csv`;
    link.setAttribute('download', filename);
    
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  

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
      // Remove tags first (since it's a foreign key relationship)
      const { error: tagsError } = await supabase
        .from('question_tags')
        .delete()
        .match({ question_id: questionId });
  
      if (tagsError) throw tagsError;
  
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

  const handleAddTag = (questionId) => {
    setSelectedQuestionId(questionId);
    setIsTagDialogOpen(true);
  };

  const handleTagSelection = async (tagId) => {
    if (!isAdmin) return;
    
    if (selectedQuestionId) {
      await addTagToQuestion(selectedQuestionId, tagId);
    }
    setIsTagDialogOpen(false);
  };

  const renderQuestions = (questions, isOrganizationQuestion = false) => {
    const displayQuestions = isOrganizationQuestion ? sortedQuestions : questions;

    switch (viewMode) {
      case 'table':
      case 'kanban':
        if (isMobile) {
          return (
            <div className="text-center p-4">
              <h2 className="text-xl font-semibold mb-2">Desktop View Only</h2>
              <p className="text-gray-600">
                This view is optimized for desktop devices. 
                Please switch to cards view for the best mobile experience.
              </p>
            </div>
          );
        }
        return (
          <>
            <div className="flex justify-end mb-4">
              <Button 
                type="button"
                onClick={exportToCSV}
                className="p-2 mr-4"
              >
                Export CSV
              </Button>
            </div>
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
              setQuestions={setQuestions}
              organizationId={currentOrganization?.id}
            />
          </>
        );

      case 'cards':
        return (
          <>
            {isOrganizationQuestion && (
              <div className="mb-4 space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <TextField
                    select
                    label="Filter by Category"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    variant="outlined"
                    size="small"
                    fullWidth
                    sx={{ minWidth: { sm: 200 } }}
                  >
                    <MenuItem value="">All Categories</MenuItem>
                    {[...new Set(displayQuestions.map(q => q.category))].filter(Boolean).map((category) => (
                      <MenuItem key={category} value={category}>
                        {category}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    select
                    label="Filter by Status"
                    value={kanbanFilter}
                    onChange={(e) => setKanbanFilter(e.target.value)}
                    variant="outlined"
                    size="small"
                    fullWidth
                    sx={{ minWidth: { sm: 200 } }}
                  >
                    <MenuItem value="">All Statuses</MenuItem>
                    {KANBAN_STATUSES.map((status) => (
                      <MenuItem key={status} value={status}>
                        {status}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    select
                    label="Filter by Tag"
                    value={tagFilter}
                    onChange={(e) => setTagFilter(e.target.value)}
                    variant="outlined"
                    size="small"
                    fullWidth
                    sx={{ minWidth: { sm: 200 } }}
                  >
                    <MenuItem value="">All Tags</MenuItem>
                    {[...new Set(displayQuestions
                      .flatMap(q => {
                        // Ensure question has tags and they are an array
                        if (!q.tags || !Array.isArray(q.tags)) return [];
                        // Filter out null tags and map to names
                        return q.tags
                          .filter(tag => tag && typeof tag === 'object' && tag.name)
                          .map(tag => tag.name);
                      })
                      .filter(Boolean) // Remove any null/undefined values
                    )].map((tagName) => (
                      <MenuItem key={tagName} value={tagName}>
                        {tagName}
                      </MenuItem>
                    ))}
                  </TextField>
                </div>

                <div className="flex justify-end">
                  <Button 
                    type="button"
                    onClick={exportToCSV}
                    className="w-full sm:w-auto"
                  >
                    Export CSV
                  </Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-2 sm:px-0">
              {displayQuestions
                .filter(question => {
                  const matchesCategory = !categoryFilter || question.category === categoryFilter;
                  const matchesKanban = !kanbanFilter || question.kanban_status === kanbanFilter;
                  const matchesTag = !tagFilter || (question.tags && question.tags.some(tag => tag.name === tagFilter));
                  return matchesCategory && matchesKanban && matchesTag;
                })
                .map(question => (
                  <QuestionCard 
                    key={question.id}
                    question={question}
                    onClick={() => handleQuestionClick(question.id)}
                    onAddToOrganization={isAdmin && !isOrganizationQuestion ? () => handleAddToOrganization(question.id) : null}
                    onRemoveFromOrganization={isAdmin && isOrganizationQuestion && !question.is_direct ? () => handleRemoveFromOrganization(question.id) : null}
                    onDeleteQuestion={isAdmin && isOrganizationQuestion && question.is_direct ? () => handleDeleteDirectQuestion(question.id) : null}
                    onMakeQuestionOpen={isAdmin && isOrganizationQuestion && question.is_direct && !question.is_open ? () => handleMakeQuestionOpen(question.id) : null}
                    isAdmin={isAdmin}
                    isOrganizationQuestion={isOrganizationQuestion}
                    onUpdateKanbanStatus={handleUpdateKanbanStatus}
                    tags={tags}
                    onAddTag={handleAddTag}
                    organizationId={currentOrganization.id}
                  />
                ))}
            </div>
          </>
        );

      case 'elo-ranking':
        return <OrganizationELORanking organizationId={currentOrganization?.id} />;

      case 'manual-ranking':
        return <OrganizationManualRanking organizationId={currentOrganization?.id} />;

      case 'overview':
        return <QuestionOverviewSection
          latestQuestions={latestQuestions}
          topQuestionsByCategory={topQuestionsByCategory}
          handleQuestionClick={handleQuestionClick}
          isOrganizationView={true}
        />;

      default:
        return null;
    }
  };

  const sortQuestions = (questions, sortBy) => {
    // Remove: console.log('Sorting questions:', questions);
    // Remove: console.log('Sort by:', sortBy);
  
    const sorted = [...questions].sort((a, b) => {
      if (sortBy === 'manual_rank') {
        const rankA = a.manual_rank !== undefined ? a.manual_rank : 0;
        const rankB = b.manual_rank !== undefined ? b.manual_rank : 0;
        // Remove: console.log(`Comparing manual_rank: ${rankA} vs ${rankB}`);
        return rankA - rankB;
      } else {
        const scoreA = a.elo_score !== undefined ? a.elo_score : 1500;
        const scoreB = b.elo_score !== undefined ? b.elo_score : 1500;
        // Remove: console.log(`Comparing elo_score: ${scoreA} vs ${scoreB}`);
        return scoreB - scoreA;
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
    const navigate = useNavigate();

    const handleOrgSelection = (org) => {
      if (org.subscription_status === 'inactive') {
        navigate('/billing-required', { 
          state: { organizationId: org.id } 
        });
      } else {
        onSelect(org);
      }
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
          width: '90%',
          maxWidth: 600,
          bgcolor: 'background.paper',
          boxShadow: 24,
          p: 4,
          borderRadius: 2,
          maxHeight: '90vh',
          overflow: 'auto'
        }}>
          <Typography id="organization-selector-title" variant="h6" component="h2" gutterBottom>
            Select a Group
          </Typography>
          
          {organizations.length > 0 ? (
            <Grid container spacing={2}>
              {organizations.map((org) => (
                <Grid item xs={12} key={org.id}>
                  <Card 
                    sx={{ 
                      cursor: 'pointer',
                      opacity: org.subscription_status === 'inactive' ? 0.8 : 1,
                      position: 'relative'
                    }}
                    onClick={() => handleOrgSelection(org)}
                  >
                    <CardActionArea>
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="h6">
                            {org.name}
                          </Typography>
                          {org.subscription_status === 'inactive' && (
                            <Chip 
                              label="Inactive Subscription" 
                              color="warning"
                              size="small"
                            />
                          )}
                        </Box>
                        {org.subscription_status === 'inactive' && (
                          <Typography variant="body2" color="text.secondary">
                            Click to update billing
                          </Typography>
                        )}
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="body1" gutterBottom>
                No groups found.
              </Typography>
              <Link 
                to="/organization-signup" 
                style={{ textDecoration: 'none' }}
              >
                <CustomButton type="Submit">
                  Create New Group
                </CustomButton>
              </Link>
            </Box>
          )}
        </Box>
      </Modal>
    );
  };

  const handleDeleteTag = async (tagId) => {
    if (!isAdmin) return;

    try {
      const { error: tagsError } = await supabase
        .from('question_tags')
        .delete()
        .match({ tag_id: tagId });

      if (tagsError) throw tagsError;

      const { error: deleteError } = await supabase
        .from('tags')
        .delete()
        .match({ id: tagId });

      if (deleteError) throw deleteError;

      setTags(prevTags => prevTags.filter(tag => tag && tag.id !== tagId));
      toast.success('Tag deleted successfully');
    } catch (error) {
      toast.error('Failed to delete tag');
    }
  };

  const handleManageTags = () => {
    setSelectedQuestionId(null); // Reset the selected question ID
    setIsManageTagsDialogOpen(true);
  };

  const handleTogglePublicQuestions = async () => {
    if (!showPublicQuestions && openQuestions.length === 0) {
      await fetchPublicQuestions();
    }
    setShowPublicQuestions(!showPublicQuestions);
  };

// Remove the useEffect for debounced search

const handleSearch = useCallback(() => {
  if (!searchQuery.trim() || !organizationQuestions) return;

  setIsSearching(true);
  setShowSearchResults(true);

  try {
    // Filter the existing organizationQuestions
    const filteredQuestions = organizationQuestions.filter(question => {
      const searchLower = searchQuery.toLowerCase();
      return (
        question.content?.toLowerCase().includes(searchLower) ||
        question.category?.toLowerCase().includes(searchLower)
      );
    });

    // Sort by priority_score if available, otherwise by created_at
    const sortedResults = filteredQuestions.sort((a, b) => {
      if (a.priority_score !== undefined && b.priority_score !== undefined) {
        return b.priority_score - a.priority_score;
      }
      return new Date(b.created_at) - new Date(a.created_at);
    });

    setSearchResults(sortedResults);
  } catch (error) {
    toast.error('Failed to search questions');
  } finally {
    setIsSearching(false);
  }
}, [searchQuery, organizationQuestions]);

const handleKeyDown = (event) => {
  if (event.key === 'Enter') {
    handleSearch();
  }
};
  

  const createTag = async () => {
    if (!isAdmin) return;
    
    if (newTagName.trim() === '' || !currentOrganization) {
      toast.error('Tag name cannot be empty');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('tags')
        .insert({ name: newTagName, organization_id: currentOrganization.id })
        .select();

      if (error) throw error;

      setTags(prevTags => [...prevTags.filter(tag => tag != null), data[0]]);
      setNewTagName('');
      toast.success('Tag created successfully');

      if (selectedQuestionId && data[0]) {
        await addTagToQuestion(selectedQuestionId, data[0].id);
      }

      // Close dialogs
      setIsTagDialogOpen(false);
      setIsManageTagsDialogOpen(false);
    } catch (error) {
      toast.error('Failed to create tag');
    }
  };

  const addTagToQuestion = async (questionId, tagId) => {
    const { error } = await supabase
      .from('question_tags')
      .insert({ question_id: questionId, tag_id: tagId });
    if (error) {
      toast.error('Failed to add tag to question.');
    } else {
      await fetchQuestions(currentOrganization.id);
    }
  };

  const fetchOrganizationTags = useCallback(async () => {
    if (!currentOrganization) return;
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('organization_id', currentOrganization.id);
    if (error) {
      console.error('Error fetching tags:', error);
    } else {
      setTags(data);
    }
  }, [currentOrganization]);

  useEffect(() => {
    if (currentOrganization) {
      fetchOrganizationTags();
    }
  }, [currentOrganization, fetchOrganizationTags]);

  // Add useEffect for handling window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Set initial value
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

 

  return (
    <div className="flex">
      <Toaster position="top-right" />
      
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar 
          sidebarOpen={sidebarOpen}
          toggleSidebar={toggleSidebar}
          sortBy={sortBy}
          toggleSortBy={toggleSortBy}
          viewMode={viewMode}
          setViewMode={setViewMode}
          selectedOrganizationId={currentOrganization?.id}
          onManageTags={handleManageTags} // Add this prop
          isAdmin={isAdmin}
          currentOrganization={currentOrganization}
          onTogglePublicQuestions={handleTogglePublicQuestions}
          showPublicQuestions={showPublicQuestions}
        />
      </div>

      {/* Main Content */}
      <div className={`flex-grow transition-all duration-300 
        ${sidebarOpen ? 'md:ml-64' : 'md:ml-16'} 
        p-4 md:p-8 pb-24 md:pb-8`}
      >
        <Container maxWidth="xl">
          <OrganizationSelectorModal
            open={showOrgSelector}
            organizations={organizations}
            onSelect={handleOrganizationSelect}
          />
          {currentOrganization && (
            <>
              <Typography variant='h4'>{currentOrganization.name} Dashboard</Typography>
              {organizations.length > 1 && (
      <CustomButton 
        type="Action"
        onClick={() => {
          updateCurrentOrganization(null);
          setShowOrgSelector(true);
        }}
        className="w-auto"
      >
        Change Group
      </CustomButton>
    )}
              {viewMode !== 'table' && viewMode !== 'kanban' && (

              <Paper elevation={3} sx={{ 
                p: 3, 
                my: 4,
                borderRadius: 4,
              }}>
                <div className="flex items-center gap-4">
                  <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Search questions by content or category..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown} 
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon color="action" />
                        </InputAdornment>
                      ),
                      endAdornment: isSearching && (
                        <InputAdornment position="end">
                          <CircularProgress size={20} />
                        </InputAdornment>
                      ),
                      sx: {
                        borderRadius: 28,
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderRadius: 28,
                        },
                        '&:hover': {
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'primary.main',
                          },
                        },
                      },
                    }}
                  />
                </div>
              </Paper>
              )}

              {showSearchResults && (
  <Box sx={{ mb: 6 }}>
    <div className="flex justify-between items-center mb-3">
      <Typography variant="h5">
        Search Results {searchResults.length > 0 && `(${searchResults.length})`}
      </Typography>
      <Button 
        type="Submit" 
        onClick={() => {
          setShowSearchResults(false);
          setSearchResults([]);
          setSearchQuery('');
        }}
      >
        Clear Search
      </Button>
    </div>
    {searchResults.length > 0 ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {searchResults.map(question => (
          <QuestionCard
            key={question.id}
            question={question}
            onClick={() => handleQuestionClick(question.id)}
          />
        ))}
      </div>
    ) : (
      <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
        <Typography color="text.secondary">
          No questions found matching your search.
        </Typography>
      </Paper>
    )}
  </Box>
)}

              <Divider style={{ margin: '2rem 0' }} />
              <div className="mb-4">
                <Typography style={{ marginBottom: '1rem', textDecoration: 'underline #075985' }} variant='h5'>Group Questions</Typography>
              </div>
              {viewMode === 'overview' ? (
                <QuestionOverviewSection
                  latestQuestions={latestQuestions}
                  topQuestionsByCategory={topQuestionsByCategory}
                  handleQuestionClick={handleQuestionClick}
                  isOrganizationView={true}
                />
              ) : viewMode === 'kanban' ? (
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
                  
                  {showPublicQuestions && (
                    
                    <>
                    <Typography variant='h5' style={{ marginBottom: '1rem', textDecoration: 'underline #075985' }}>
                    Public Questions
                  </Typography>
                      {publicQuestionsLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                          <CircularProgress />
                        </Box>
                      ) : (
                        <>
                          {renderQuestions(openQuestions, false)}
                          {openQuestions.length === 0 && (
                            <Typography variant='body1'>
                              No public questions available.
                            </Typography>
                          )}
                        </>
                      )}
                    </>
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
      <Dialog 
        open={isTagDialogOpen && isAdmin} // Only open if admin
        onClose={() => setIsTagDialogOpen(false)}
      >
        <DialogTitle>Add Tag</DialogTitle>
        <DialogContent>
          {isAdmin ? ( // Only show content if admin
            <>
              <Typography variant="subtitle1">Existing Tags:</Typography>
              <div className="flex flex-wrap gap-2 mb-4">
                {tags.map(tag => (
                  <Chip
                    key={tag.id}
                    label={tag.name}
                    onClick={() => handleTagSelection(tag.id)}
                    clickable
                  />
                ))}
              </div>
              <Typography variant="subtitle1">Or create a new tag:</Typography>
              <TextField
                autoFocus
                margin="dense"
                label="New Tag Name"
                type="text"
                fullWidth
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
              />
            </>
          ) : (
            <Typography>You don't have permission to manage tags.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsTagDialogOpen(false)}>Cancel</Button>
          {isAdmin && <Button onClick={createTag}>Create New Tag</Button>}
        </DialogActions>
      </Dialog>

      {/* Manage Tags Dialog */}
      <Dialog 
        open={isManageTagsDialogOpen && isAdmin} // Only open if admin
        onClose={() => setIsManageTagsDialogOpen(false)}
      >
        <DialogTitle>Manage Tags</DialogTitle>
        <DialogContent>
          {isAdmin ? ( // Only show content if admin
            <>
              <Typography variant="subtitle1">Existing Tags:</Typography>
              <div className="flex flex-wrap gap-2 mb-4">
                {tags.filter(tag => tag != null).map(tag => (
                  <Chip
                    key={tag.id}
                    label={tag.name}
                    onDelete={() => setTagToDelete(tag)}
                  />
                ))}
              </div>
              <Typography variant="subtitle1">Create a new tag:</Typography>
              <TextField
                autoFocus
                margin="dense"
                label="New Tag Name"
                type="text"
                fullWidth
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
              />
            </>
          ) : (
            <Typography>You don't have permission to manage tags.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsManageTagsDialogOpen(false)}>Close</Button>
          {isAdmin && <Button onClick={createTag}>Create New Tag</Button>}
        </DialogActions>
      </Dialog>

      {/* Delete Tag Confirmation Dialog */}
      <Dialog 
        open={!!tagToDelete && isAdmin} // Only open if admin
        onClose={() => setTagToDelete(null)}
      >
        <DialogTitle>Confirm Tag Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the tag "{tagToDelete?.name}"? This action cannot be undone and will remove the tag from all associated questions.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTagToDelete(null)}>Cancel</Button>
          {isAdmin && (
            <Button 
              onClick={() => {
                if (isAdmin) {
                  handleDeleteTag(tagToDelete.id);
                  setTagToDelete(null);
                }
              }} 
              color="error"
            >
              Delete
            </Button>
          )}
        </DialogActions>
      </Dialog>
      <Dialog 
        open={showEloRankingModal} 
        onClose={handleCloseEloRanking}
        maxWidth="md"
        fullWidth
      >
        <DialogContent>
          <OrganizationELORanking 
            organizationId={currentOrganization?.id} 
            onSubmitSuccess={handleCloseEloRanking}
          />
        </DialogContent>
      </Dialog>

      {/* Mobile Navigation */}
      <MobileNav 
        viewMode={viewMode}
        setViewMode={setViewMode}
        sortBy={sortBy}
        toggleSortBy={toggleSortBy}
        onTogglePublicQuestions={handleTogglePublicQuestions}
        showPublicQuestions={showPublicQuestions}
        selectedOrganizationId={currentOrganization?.id}
        isAdmin={isAdmin}
        currentOrganization={currentOrganization}
      />
    </div>
  );
};

export default OrganizationDashboard;
