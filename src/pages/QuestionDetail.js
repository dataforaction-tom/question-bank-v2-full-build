import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { useOrganization } from '../context/OrganizationContext';
import ColorTag from '../components/ColorTag';
import Modal from '../components/Modal';
import ResponseForm from '../components/ResponseForm';
import ResponseList from '../components/ResponseList';
import Button from '../components/Button';
import { FaThumbsUp, FaBell, FaComment, FaLinkedin, FaLink, FaEnvelope, FaTrash, FaCircularProgress } from 'react-icons/fa';
import { styled, Box, Dialog, DialogTitle, DialogContent, DialogActions, Typography, CircularProgress } from '@mui/material';
import { createPortal } from 'react-dom';
import TagManager from '../components/TagManager';  // Import the new TagManager component
import ResponseKanban from '../components/ResponseKanban';
import ResponseManualRanking from '../components/ResponseManualRanking';
import toast from 'react-hot-toast'; // Add this import
import QuestionCard from '../components/QuestionCard';
const KANBAN_STATUSES = ['Now', 'Next', 'Future', 'Parked', 'Done'];

const COLUMN_COLORS = {
  Now: '#f860b1',
  Next: '#f3581d',
  Future: '#9dc131',
  Parked: '#6a7efc',
  Done: '#53c4af'
};

const ColorBand = styled(Box)({
  height: 8,
  backgroundColor: '#dc2626', // red-600 for warning
});

const SubmitButton = styled(Button)(({ theme }) => ({
  backgroundColor: '#dc2626',
  color: 'white',
  '&:hover': {
    backgroundColor: '#b91c1c',
  },
  borderRadius: theme.shape.borderRadius,
}));

const CancelButton = styled(Button)(({ theme }) => ({
  backgroundColor: '#e0e0e0',
  color: '#333',
  '&:hover': {
    backgroundColor: '#c0c0c0',
  },
  borderRadius: theme.shape.borderRadius,
}));

const StatusChip = styled('div')(({ status }) => ({
  backgroundColor: COLUMN_COLORS[status],
  color: 'white',
  padding: '4px 12px',
  borderRadius: '16px',
  fontWeight: 'bold',
  display: 'inline-block',
  cursor: 'pointer',
}));

const Dropdown = styled('div')({
  position: 'fixed',
  backgroundColor: 'white',
  borderRadius: '8px',
  boxShadow: '0px 5px 15px rgba(0, 0, 0, 0.2)',
  zIndex: 1000,
  overflow: 'hidden',
});

const DropdownItem = styled('div')(({ status }) => ({
  padding: '8px 16px',
  cursor: 'pointer',
  '&:hover, &:focus': {
    backgroundColor: COLUMN_COLORS[status],
    color: 'white',
    outline: 'none',
  },
}));

const TwoColumnLayout = styled('div')({
  display: 'grid',
  gridTemplateColumns: '70% 30%',
  gap: '2rem',
  '@media (max-width: 768px)': {
    gridTemplateColumns: '100%',
  },
});




const QuestionDetail = () => {
  const { id } = useParams();
  const { session } = useAuth();
  const { currentOrganization } = useOrganization();
  const [question, setQuestion] = useState(null);
  const [responses, setResponses] = useState([]);
  const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);
  const [dropdownState, setDropdownState] = useState({ isOpen: false, position: null });
  const [focusedIndex, setFocusedIndex] = useState(0);
  const statusChipRef = useRef(null);
  const dropdownRef = useRef(null);
  const itemRefs = useRef([]);
  const [endorsements, setEndorsements] = useState(0);
  const [isEndorsed, setIsEndorsed] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPartOfOrganization, setIsPartOfOrganization] = useState(false);
  const [isQuestionInOrganization, setIsQuestionInOrganization] = useState(false);
  const [responseViewMode, setResponseViewMode] = useState('list'); // 'list', 'kanban', or 'manual-ranking'
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [similarQuestions, setSimilarQuestions] = useState([]);

  const navigate = useNavigate();
const location = useLocation();
const { previousPath, viewMode, organizationId } = location.state || {};

const handleGoBack = () => {
  if (previousPath && previousPath.startsWith('/organization/')) {
    navigate(previousPath, { state: { viewMode, organizationId } });
  } else {
    navigate('/questions');
  }
};

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Error fetching current user:', error);
        return;
      }
      console.log('Current user set:', user); // Debug log
      setCurrentUser(user);
    };

    fetchCurrentUser();
  }, []);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!session?.user?.id || !currentOrganization?.id) return;

      const { data, error } = await supabase
        .from('organization_users')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('organization_id', currentOrganization.id)
        .single();

      if (error) {
        console.error('Error checking admin status:', error);
      } else {
        setIsAdmin(data?.role === 'admin');
      }
    };

    checkAdminStatus();
  }, [session?.user?.id, currentOrganization?.id]);

  const fetchResponses = useCallback(async () => {
    const { data, error } = await supabase
      .from('responses')
      .select('*')
      .eq('question_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching responses:', error);
    } else {
      setResponses(data);
    }
  }, [id]);

  const handleResponseSubmit = useCallback(async () => {
    try {
      // Fetch all followers of the question
      const { data: followers, error: followersError } = await supabase
        .from('question_followers')
        .select('user_id')
        .eq('question_id', id);

      if (followersError) throw followersError;

      // Create notifications for all followers
      const notifications = followers.map(follower => ({
        user_id: follower.user_id,
        question_id: id,
        message: `New response to question: "${question.content.substring(0, 50)}..."`,
      }));

      const { error: notificationError } = await supabase
        .from('user_notifications')
        .insert(notifications);

      if (notificationError) throw notificationError;

      // Refresh the responses
      await fetchResponses();
      setIsResponseModalOpen(false);
    } catch (error) {
      console.error('Error handling response submission:', error);
      alert('An error occurred while processing your response. Please try again.');
    }
  }, [id, question, fetchResponses]);

  const fetchQuestion = useCallback(async () => {
    try {
      setLoading(true);
      const { data: questionData, error: questionError } = await supabase
        .from('questions')
        .select(`
          *,
          endorsements:endorsements(count),
          followers:question_followers(count),
          responses:responses(count)
        `)
        .eq('id', id)
        .single();

      if (questionError) throw questionError;

      console.log('Fetched question:', questionData);
      setQuestion(questionData);
      
      // Format tags and ensure we have the kanban status
      const formattedQuestion = {
        ...questionData,
        tags: questionData.tags.map(t => t.tags),
        organization_question_rankings: questionData.organization_question_rankings?.[0] || null
      };

      setQuestion(formattedQuestion);
    } catch (error) {
      console.error('Error fetching question:', error);
      setError('Failed to load question. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchQuestion();
  }, [fetchQuestion]);

  useEffect(() => {
    const fetchEndorsements = async () => {
      const { count, error } = await supabase
        .from('endorsements')
        .select('*', { count: 'exact' })
        .eq('question_id', id);

      if (error) {
        console.warn('Error fetching endorsements:', error);
      } else {
        setEndorsements(count || 0);
      }
    };

    const checkUserEndorsement = async () => {
      if (currentUser) {
        const { data, error } = await supabase
          .from('endorsements')
          .select('*')
          .eq('question_id', id)
          .eq('user_id', currentUser.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.warn('Error checking user endorsement:', error);
        } else {
          setIsEndorsed(!!data);
        }
      }
    };

    const checkUserFollowing = async () => {
      if (currentUser) {
        const { data, error } = await supabase
          .from('question_followers')
          .select('*')
          .eq('question_id', id)
          .eq('user_id', currentUser.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.warn('Error checking user following:', error);
        } else {
          setIsFollowing(!!data);
        }
      }
    };

    fetchEndorsements();
    checkUserEndorsement();
    checkUserFollowing();
  }, [id, currentUser, fetchResponses]);

  useEffect(() => {
    const fetchSimilarQuestions = async () => {
      if (!question?.embedding) return;
  
      try {
        const { data: similarData, error: searchError } = await supabase
          .rpc('finds_similar_questions', {
            query_embedding: question.embedding,
            match_threshold: 0.6,
            match_count: 3
          });
  
        if (searchError) throw searchError;
  
        // Fetch additional counts for each similar question
        const questionsWithCounts = await Promise.all(
          similarData
            .filter(q => q.id !== question.id)
            .slice(0, 2)
            .map(async (q) => {
              const { data, error } = await supabase
                .from('questions')
                .select(`
                  *,
                  endorsements:endorsements(count),
                  followers:question_followers(count),
                  responses:responses(count)
                `)
                .eq('id', q.id)
                .single();
  
              if (error) throw error;
  
              return {
                ...q,
                endorsements_count: data.endorsements[0]?.count || 0,
                followers_count: data.followers[0]?.count || 0,
                responses_count: data.responses[0]?.count || 0
              };
            })
        );
  
        setSimilarQuestions(questionsWithCounts);
      } catch (error) {
        console.error('Error fetching similar questions:', error);
      }
    };
  
    if (question) {
      fetchSimilarQuestions();
    }
  }, [question]);

  console.log('Similar questions:', similarQuestions);

  const handleStatusClick = (e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setDropdownState({
      isOpen: true,
      position: { top: rect.bottom, left: rect.left },
    });
    setFocusedIndex(0);
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const { data, error } = await supabase
        .from('organization_question_rankings')
        .upsert({ 
          organization_id: currentOrganization?.id,
          question_id: id, 
          kanban_status: newStatus 
        }, { 
          onConflict: 'organization_id,question_id'
        })
        .select()
        .single();

      if (error) throw error;

      setQuestion(prev => ({
        ...prev,
        organization_question_rankings: {
          ...prev.organization_question_rankings,
          kanban_status: newStatus
        }
      }));
      
      setDropdownState({ isOpen: false, position: null });
    } catch (error) {
      console.error('Error updating Kanban status:', error);
      alert('Failed to update Kanban status. Please try again.');
    }
  };

  const handleKeyDown = (event) => {
    if (!dropdownState.isOpen) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex((prevIndex) => (prevIndex + 1) % KANBAN_STATUSES.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex((prevIndex) => (prevIndex - 1 + KANBAN_STATUSES.length) % KANBAN_STATUSES.length);
        break;
      case 'Enter':
        event.preventDefault();
        handleStatusChange(KANBAN_STATUSES[focusedIndex]);
        break;
      case 'Escape':
        event.preventDefault();
        setDropdownState({ isOpen: false, position: null });
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    if (dropdownState.isOpen && itemRefs.current[focusedIndex]) {
      itemRefs.current[focusedIndex].focus();
    }
  }, [focusedIndex, dropdownState.isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownState({ isOpen: false, position: null });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [dropdownState.isOpen]);

  const handleEndorse = async () => {
    if (!currentUser) {
      alert('Please log in to endorse questions.');
      return;
    }
  
    try {
      if (isEndorsed) {
        await supabase
          .from('endorsements')
          .delete()
          .eq('question_id', id)
          .eq('user_id', currentUser.id);
        setEndorsements(prev => prev - 1);
      } else {
        await supabase
          .from('endorsements')
          .insert({ question_id: id, user_id: currentUser.id });
        const newEndorsementCount = endorsements + 1;
        setEndorsements(newEndorsementCount);
        
        // Check if the endorsement count has reached 10
        if (newEndorsementCount >= 1) {
          await notifyEndorsers();
        }
      }
      setIsEndorsed(!isEndorsed);
    } catch (error) {
      console.error('Error updating endorsement:', error);
      alert('Failed to update endorsement.');
    }
  };
  
  const notifyEndorsers = async () => {
    try {
      // Fetch all users who endorsed this question
      const { data: endorsers, error: endorsersError } = await supabase
        .from('endorsements')
        .select('user_id')
        .eq('question_id', id);
  
      if (endorsersError) throw endorsersError;
  
      // Create notifications for all endorsers
      const notifications = endorsers.map(endorser => ({
        user_id: endorser.user_id,
        question_id: id,
        message: `The question "${question.content.substring(0, 50)}..." has reached 10 endorsements!`,
      }));
  
      const { error: notificationError } = await supabase
        .from('user_notifications')
        .insert(notifications);
  
      if (notificationError) throw notificationError;
  
      console.log('Notifications sent to all endorsers');
    } catch (error) {
      console.error('Error sending notifications to endorsers:', error);
    }
  };

  const handleFollow = async () => {
    if (!currentUser) {
      alert('Please log in to follow questions.');
      return;
    }

    try {
      if (isFollowing) {
        await supabase
          .from('question_followers')
          .delete()
          .eq('question_id', id)
          .eq('user_id', currentUser.id);
      } else {
        await supabase
          .from('question_followers')
          .insert({ question_id: id, user_id: currentUser.id });
      }
      setIsFollowing(!isFollowing);
    } catch (error) {
      console.error('Error updating follow status:', error);
      alert('Failed to update follow status.');
    }
  };

  useEffect(() => {
    const checkOrganizationMembership = async () => {
      if (!session?.user?.id || !question?.organization_id) {
        setIsPartOfOrganization(false);
        return;
      }

      const { data, error } = await supabase
        .from('organization_users')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('organization_id', question.organization_id)
        .single();

      if (error) {
        console.error('Error checking organization membership:', error);
        setIsPartOfOrganization(false);
      } else {
        setIsPartOfOrganization(!!data);
      }
    };

    checkOrganizationMembership();
  }, [session?.user?.id, question?.organization_id]);

  useEffect(() => {
    const checkQuestionInOrganization = async () => {
      if (!currentOrganization?.id || !id) return;

      // Check if the question is directly in the organization
      const { data: directQuestion, error: directError } = await supabase
        .from('questions')
        .select('*')
        .eq('id', id)
        .eq('organization_id', currentOrganization.id)
        .single();

      if (directError && directError.code !== 'PGRST116') {
        console.error('Error checking direct question:', directError);
      }

      // Check if the question is indirectly in the organization
      const { data: indirectQuestion, error: indirectError } = await supabase
        .from('organization_questions')
        .select('*')
        .eq('question_id', id)
        .eq('organization_id', currentOrganization.id)
        .single();

      if (indirectError && indirectError.code !== 'PGRST116') {
        console.error('Error checking indirect question:', indirectError);
      }

      setIsQuestionInOrganization(!!directQuestion || !!indirectQuestion);
    };

    checkQuestionInOrganization();
  }, [currentOrganization?.id, id]);

  const handleDeleteQuestion = async () => {
    if (!currentUser || currentUser.id !== question.created_by) {
      toast.error('You can only delete your own questions');
      return;
    }

    setIsDeleting(true);
    const deletePromise = new Promise(async (resolve, reject) => {
      try {
        // Delete all responses first
        const { error: responsesError } = await supabase
          .from('responses')
          .delete()
          .eq('question_id', id);

        if (responsesError) throw responsesError;

        // Delete the question
        const { error: questionError } = await supabase
          .from('questions')
          .delete()
          .eq('id', id)
          .eq('created_by', currentUser.id);

        if (questionError) throw questionError;

        resolve();
      } catch (error) {
        console.error('Error deleting question:', error);
        reject(error);
      }
    });

    toast.promise(deletePromise, {
      loading: 'Deleting question...',
      success: () => {
        setIsDeleting(false);
        setDeleteDialogOpen(false);
        navigate('/questions');
        return 'Question deleted successfully';
      },
      error: (err) => {
        setIsDeleting(false);
        return 'Failed to delete question';
      },
    });
  };

  const renderDeleteButton = () => {
    if (!currentUser || !question) return null;

    console.log('Checking delete button visibility:', {
      currentUserId: currentUser.id,
      questionCreatedBy: question.created_by,
      isOwner: currentUser.id === question.created_by
    });

    if (currentUser.id === question.created_by) {
      return (
        <Button
          type="Delete"
          onClick={() => setDeleteDialogOpen(true)}
          className="flex items-center w-full bg-red-600 hover:bg-red-700 text-white"
        >
          <FaTrash className="mr-2" />
          Delete Question
        </Button>
      );
    }
    return null;
  };

  const renderDeleteDialog = () => (
    <Dialog 
      open={deleteDialogOpen} 
      onClose={() => setDeleteDialogOpen(false)}
      maxWidth="md"
      fullWidth
    >
      <ColorBand />
      <DialogTitle>
        <Typography variant="h6" component="div" sx={{ 
          display: 'flex', 
          alignItems: 'center',
          gap: 1,
          color: '#dc2626'
        }}>
          <FaTrash />
          Delete Question
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body1" gutterBottom>
            Are you sure you want to delete this question?
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              mt: 2,
              p: 2,
              bgcolor: '#fee2e2', // red-100
              borderRadius: 1,
              color: '#dc2626' // red-600
            }}
          >
            Warning: This action cannot be undone. All responses and related data will be permanently deleted.
          </Typography>
          <Box sx={{ mt: 3, bgcolor: '#f3f4f6', p: 2, borderRadius: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, color: '#4b5563' }}>
              Question to be deleted:
            </Typography>
            <Typography variant="body2">
              {question?.content}
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2.5, gap: 1 }}>
        <CancelButton 
          onClick={() => setDeleteDialogOpen(false)}
          variant="contained"
        >
          Cancel
        </CancelButton>
        <SubmitButton
          onClick={handleDeleteQuestion}
          variant="contained"
          disabled={isDeleting}
          startIcon={isDeleting ? <CircularProgress size={20} color="inherit" /> : <FaTrash />}
        >
          {isDeleting ? 'Deleting...' : 'Delete Question'}
        </SubmitButton>
      </DialogActions>
    </Dialog>
  );

  if (!question) {
    return <div>Loading...</div>;
  }

  const currentUrl = window.location.href;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    alert('Link copied to clipboard');
  };

  const handleOpenResponseModal = () => {
    if (!session) {
      alert('Please log in to respond to questions.');
      navigate('/signin');
      return;
    }
    setIsResponseModalOpen(true);
  };

  const renderResponseSection = () => {
    if (!isAdmin) {
      return <ResponseList questionId={id} currentUserId={currentUser?.id} />;
    }

    switch (responseViewMode) {
      case 'kanban':
        return (
          <ResponseKanban 
            questionId={id} 
            organizationId={currentOrganization?.id} 
            fetchMode="question"
          />
        );
      case 'manual-ranking':
        return (
          <ResponseManualRanking 
            questionId={id} 
            organizationId={currentOrganization?.id}
          />
        );
      default:
        return <ResponseList questionId={id} currentUserId={currentUser?.id} />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 pb-16">
      <div className="mb-12">
        <TwoColumnLayout>
          {/* Main Column */}
          <div className="shadow-lg rounded-xl overflow-hidden bg-white">
            <div className="bg-gradient-to-r from-slate-950 to-sky-900 font-bold text-lg text-white p-6">
              <div className="font-bold text-xl text-white mb-4">Question:</div>
              <h1 className="font-semibold text-2xl leading-relaxed">{question.content}</h1>
            </div>

            <div className="p-6">
              <div className="font-bold text-lg text-slate-900 mb-3">
                What we could do with an answer:
              </div>
              <div className="font-semibold text-lg mb-6 text-slate-900">
                {question.answer}
              </div>

              {question.details && (
                <>
                  <div className="font-bold text-lg text-slate-900 mb-3">
                    Details:
                  </div>
                  <div className="font-semibold text-lg mb-6 text-slate-900">
                    {question.details}
                  </div>
                </>
              )}
              <div className="flex flex-wrap gap-3 mb-6">
              {question.who && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-slate-950 to-sky-900 font-bold text-white rounded-full shadow-sm">
                  <span className="text-white-500">Submitted by:</span>
                  {question.who}
                </div>
              )}
              
              {question.who_details && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-slate-950 to-sky-900 font-bold text-white rounded-full shadow-smm">
                  <span className="text-white-500">Organisation/Group:</span>
                  {question.who_details}
                </div>
              )}
              {question.role_type && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-slate-950 to-sky-900 font-bold text-white rounded-full shadow-sm">
                  <span className="text-white-500">Role:</span>
                  {question.role_type}
                </div>
              )}
            </div>
            </div>
              
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Date and Tags Section */}
            <div className="bg-white shadow-lg rounded-xl p-6">
              <p className="text-sm mb-4">
                <i className="fas fa-calendar-alt" aria-hidden="true"></i>{' '}
                Date Submitted: {new Date(question.created_at).toLocaleDateString()}
              </p>

              {/* Category and Status Tags */}
              <div className="flex flex-wrap gap-2 mb-4">
                {question.category && <ColorTag category={question.category} />}
                <ColorTag category={question.is_open ? 'Public' : 'Private'} />
                {isAdmin && currentOrganization && (
                  <div ref={statusChipRef}>
                    <StatusChip 
                      status={question.organization_question_rankings?.kanban_status} 
                      onClick={handleStatusClick}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleStatusClick(e);
                        }
                      }}
                    >
                      {question.organization_question_rankings?.kanban_status || 'Set Status'}
                    </StatusChip>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 mb-4">
                <Button
                  type="Action"
                  onClick={handleEndorse}
                  className={`flex items-center ${isEndorsed ? 'bg-blue-700' : ''} w-full`}
                >
                  <FaThumbsUp className="mr-2" />
                  Endorse ({endorsements})
                </Button>
                <Button
                  type="ChangeView"
                  onClick={handleFollow}
                  className={`flex items-center ${isFollowing ? 'bg-blue-700' : ''} w-full`}
                >
                  <FaBell className="mr-2" />
                  {isFollowing ? 'Following' : 'Follow'}
                </Button>
                <Button
                  type="Respond"
                  onClick={handleOpenResponseModal}
                  className="flex items-center w-full"
                >
                  <FaComment className="mr-2" />
                  Respond
                </Button>
                {renderDeleteButton()}
              </div>

              {/* Share Section */}
              <div className="flex items-center justify-between">
                <span>SHARE:</span>
                <div className="flex gap-2">
                  <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${currentUrl}`} target="_blank" rel="noopener noreferrer" className="text-blue-700 text-2xl">
                    <FaLinkedin />
                  </a>
                  <button onClick={handleCopyLink} className="text-gray-700 text-2xl">
                    <FaLink />
                  </button>
                  <a href={`mailto:?subject=Check out this question&body=Check out this question I found: ${currentUrl}`} className="text-green-600 text-2xl">
                    <FaEnvelope />
                  </a>
                </div>
              </div>
            </div>

            {/* Tags Section */}
            {isQuestionInOrganization && currentOrganization && (
              <div className="bg-white shadow-lg rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-2">Tags</h3>
                <TagManager 
                  questionId={id}
                  organizationId={currentOrganization.id}
                  isAdmin={isAdmin}
                  mode="question"
                />
              </div>
            )}
          </div>
        </TwoColumnLayout>
      </div>

      <Modal isOpen={isResponseModalOpen} onClose={() => setIsResponseModalOpen(false)}>
        <ResponseForm 
          questionId={id} 
          onSubmit={handleResponseSubmit} 
          onCancel={() => setIsResponseModalOpen(false)}
        />
      </Modal>

      {isPartOfOrganization && isAdmin && (
        <div className="flex gap-2 mb-4">
          <Button
            type="ChangeView"
            onClick={() => setResponseViewMode('list')}
            className={responseViewMode === 'list' ? 'bg-blue-700' : ''}
          >
            List View
          </Button>
          <Button
            type="ChangeView"
            onClick={() => setResponseViewMode('kanban')}
            className={responseViewMode === 'kanban' ? 'bg-blue-700' : ''}
          >
            Kanban View
          </Button>
          <Button
            type="ChangeView"
            onClick={() => setResponseViewMode('manual-ranking')}
            className={responseViewMode === 'manual-ranking' ? 'bg-blue-700' : ''}
          >
            Manual Ranking
          </Button>
        </div>
      )}

      {isPartOfOrganization ? (
        isAdmin ? (
          renderResponseSection()
        ) : (
          <ResponseList questionId={id} currentUserId={currentUser?.id} />
        )
      ) : (
        <ResponseList questionId={id} currentUserId={currentUser?.id} />
      )}

      {similarQuestions.length > 0 && (
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6">Similar Questions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {similarQuestions.map((similarQuestion) => (
              <QuestionCard
                key={similarQuestion.id}
                question={{
                  ...similarQuestion,
                  // Ensure all required props are passed
                  category: similarQuestion.category,
                  kanban_status: similarQuestion.organization_question_rankings?.kanban_status,
                 
                  endorsements_count: similarQuestion.endorsements_count,
                  followers_count: similarQuestion.followers_count,
                  responses_count: similarQuestion.responses_count
                }}
                
                onClick={() => navigate(`/questions/${similarQuestion.id}`)}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        </div>
      )}

      {dropdownState.isOpen && createPortal(
        <Dropdown 
          ref={dropdownRef} 
          style={{ top: dropdownState.position.top, left: dropdownState.position.left }}
        >
          {KANBAN_STATUSES.map((status, index) => (
            <DropdownItem 
              key={status} 
              status={status}
              isFocused={index === focusedIndex}
              onClick={(e) => {
                e.stopPropagation();
                handleStatusChange(status);
              }}
              ref={el => itemRefs.current[index] = el}
              tabIndex={index === focusedIndex ? 0 : -1}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleStatusChange(status);
                }
              }}
            >
              <StatusChip status={status}>{status}</StatusChip>
            </DropdownItem>
          ))}
        </Dropdown>,
        document.body
      )}
      {renderDeleteDialog()}
    </div>
  );
};

export default QuestionDetail;
