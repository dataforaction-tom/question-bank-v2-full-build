import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import ColorTag from '../components/ColorTag';
import Modal from '../components/Modal';
import ResponseForm from '../components/ResponseForm';
import ResponseList from '../components/ResponseList';
import Button from '../components/Button';
import { FaThumbsUp, FaBell, FaComment, FaLinkedin, FaLink, FaEnvelope } from 'react-icons/fa';
import { styled } from '@mui/material';
import { createPortal } from 'react-dom';

const KANBAN_STATUSES = ['Now', 'Next', 'Future', 'Parked', 'Done'];

const COLUMN_COLORS = {
  Now: '#f860b1',
  Next: '#f3581d',
  Future: '#9dc131',
  Parked: '#6a7efc',
  Done: '#53c4af'
};


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

const QuestionDetail = () => {
  const { id } = useParams();
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
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };

    fetchCurrentUser();
  }, []);

  useEffect(() => {
    const fetchQuestion = async () => {
      try {
        // First, fetch the question without the inner join
        const { data: questionData, error: questionError } = await supabase
          .from('questions')
          .select('*')
          .eq('id', id)
          .single();

        if (questionError) throw questionError;

        if (!questionData) {
          setError('Question not found');
          return;
        }

        // Then, fetch the organization ranking separately
        const { data: rankingData, error: rankingError } = await supabase
          .from('organization_question_rankings')
          .select('*')
          .eq('question_id', id)
          .maybeSingle();

        if (rankingError) {
          console.error('Error fetching ranking:', rankingError);
          // Don't throw here, we can still show the question without ranking info
        }

        // Combine the data
        const combinedData = {
          ...questionData,
          organization_question_rankings: rankingData || null
        };

        setQuestion(combinedData);

        // Fetch additional data (responses, etc.) here...

      } catch (error) {
        console.error('Error fetching question:', error);
        setError('Failed to load question. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    const fetchResponses = async () => {
      const { data, error } = await supabase
        .from('responses')
        .select('*')
        .eq('question_id', id);

      if (error) {
        console.error('Error fetching responses:', error);
      } else {
        setResponses(data);
      }
    };

    const fetchEndorsements = async () => {
      const { count, error } = await supabase
        .from('endorsements')
        .select('*', { count: 'exact' })
        .eq('question_id', id);

      if (error) {
        console.error('Error fetching endorsements:', error);
      } else {
        setEndorsements(count);
      }
    };

    const checkUserEndorsement = async () => {
      if (currentUser) {
        const { data, error } = await supabase
          .from('endorsements')
          .select('*')
          .eq('question_id', id)
          .eq('user_id', currentUser.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking user endorsement:', error);
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
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking user following:', error);
        } else {
          setIsFollowing(!!data);
        }
      }
    };

    fetchQuestion();
    fetchResponses();
    fetchEndorsements();
    checkUserEndorsement();
    checkUserFollowing();
  }, [id, currentUser]);

  const handleUpdateKanbanStatus = async (newStatus) => {
    try {
      const { error } = await supabase
        .from('organization_question_rankings')
        .update({ kanban_status: newStatus })
        .eq('question_id', id);

      if (error) throw error;

      setQuestion(prev => ({ ...prev, kanban_status: newStatus }));
      setDropdownState({ isOpen: false, position: null });
    } catch (error) {
      console.error('Error updating Kanban status:', error);
      alert('Failed to update Kanban status. Error: ' + error.message);
    }
  };

  const handleStatusClick = (e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setDropdownState({
      isOpen: true,
      position: { top: rect.bottom, left: rect.left },
    });
    setFocusedIndex(0);
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
        handleUpdateKanbanStatus(KANBAN_STATUSES[focusedIndex]);
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
        setEndorsements(prev => prev + 1);
      }
      setIsEndorsed(!isEndorsed);
    } catch (error) {
      console.error('Error updating endorsement:', error);
      alert('Failed to update endorsement.');
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

  const handleResponseSubmit = useCallback(async () => {
    const { data, error } = await supabase
      .from('responses')
      .select('*')
      .eq('question_id', id);

    if (error) {
      console.error('Error fetching responses:', error);
    } else {
      setResponses(data);
    }
    setIsResponseModalOpen(false); // Close the modal after submission
  }, [id]);

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!question) {
    return <div>Loading...</div>;
  }

  const currentUrl = window.location.href;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    alert('Link copied to clipboard');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      
      
      <div className="shadow-md shadow-blue-100 rounded overflow-hidden">
        <div className="bg-pink-700 font-bold text-lg text-white p-2"></div>
        <div className='font-bold text-xl text-slate-900 p-4'>
          Question:
        </div>
        <h1 className="font-semibold text-xl text-slate-900 p-4">{question.content}</h1>
        
        <div className='font-bold text-lg text-slate-900 p-4'>
          What we could do with an answer:
        </div>
        <div className="font-semibold text-l mb-2 text-slate-900 p-4">
          {question.answer}
        </div>
        
        {question.details && (
          <>
            <div className='font-bold text-lg text-slate-900 p-4'>
              Details:
            </div>
            <div className="font-semibold text-l mb-2 text-slate-900 p-4">
              {question.details}
            </div>
          </>
        )}
        
        <div className="px-4 py-2">
          <p className="text-gray-700 text-sm mb-2">
            <i className="fas fa-calendar-alt" aria-hidden="true"></i> {new Date(question.created_at).toLocaleDateString()}
          </p>
          
          <div className="flex flex-wrap gap-2 mt-4">
            {question.category && <ColorTag category={question.category} />}
            <ColorTag category={question.is_open ? 'Public' : 'Private'} />
            {question.kanban_status && (
              <div ref={statusChipRef}>
                <StatusChip 
                  status={question.kanban_status} 
                  onClick={handleStatusClick}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleStatusClick(e);
                    }
                  }}
                >
                  {question.kanban_status}
                </StatusChip>
              </div>
            )}
          </div>
          
          <div className="flex justify-between items-center mt-4">
            <div className="flex space-x-4">
              <Button
                type="Action"
                onClick={handleEndorse}
                className={`flex items-center ${isEndorsed ? 'bg-blue-700' : ''}`}
              >
                <FaThumbsUp className="mr-2" />
                Endorse ({endorsements})
              </Button>
              <Button
                type="Action"
                onClick={handleFollow}
                className={`flex items-center ${isFollowing ? 'bg-blue-700' : ''}`}
              >
                <FaBell className="mr-2" />
                {isFollowing ? 'Following' : 'Follow'}
              </Button>
              <Button
        type="Submit"
        onClick={() => setIsResponseModalOpen(true)}
        className={`flex items-center `}
      >
        Respond
      </Button>
            </div>
            
            
            <div className="flex items-center">
              <span className="mr-4">SHARE:</span>
              <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${currentUrl}`} target="_blank" rel="noopener noreferrer" className="text-blue-700 text-2xl mr-2" aria-label="Share on LinkedIn">
                <FaLinkedin />
              </a>
              <button onClick={handleCopyLink} className="text-gray-700 text-2xl mr-2" aria-label="Copy link">
                <FaLink />
              </button>
              <a href={`mailto:?subject=Check out this question&body=Check out this question I found: ${currentUrl}`} className="text-green-600 text-2xl" aria-label="Share via email">
                <FaEnvelope />
              </a>
            </div>
          </div>
        </div>
      </div>
      
      

      <Modal isOpen={isResponseModalOpen} onClose={() => setIsResponseModalOpen(false)}>
        <ResponseForm questionId={id} onSubmit={handleResponseSubmit} />
      </Modal>

      <ResponseList questionId={id} currentUserId={currentUser?.id} />

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
                handleUpdateKanbanStatus(status);
              }}
              ref={el => itemRefs.current[index] = el}
              tabIndex={index === focusedIndex ? 0 : -1}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleUpdateKanbanStatus(status);
                }
              }}
            >
              <StatusChip status={status}>{status}</StatusChip>
            </DropdownItem>
          ))}
        </Dropdown>,
        document.body
      )}
    </div>
  );
};

export default QuestionDetail;