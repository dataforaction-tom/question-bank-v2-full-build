import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import ResponseForm from '../components/ResponseForm';
import ResponseList from '../components/ResponseList';
import Modal from '../components/Modal';
import { FaLinkedin, FaLink, FaEnvelope } from 'react-icons/fa';
import ColorTag from '../components/ColorTag';
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

  useEffect(() => {
    const fetchQuestion = async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('*, organization_question_rankings!inner(*)')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching question:', error);
        alert('An error occurred while fetching the question.');
      } else {
        setQuestion({
          ...data,
          kanban_status: data.organization_question_rankings?.kanban_status || 'Now'
        });
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

    fetchQuestion();
    fetchResponses();
  }, [id]);

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
    const rect = statusChipRef.current.getBoundingClientRect();
    setDropdownState({
      isOpen: true,
      position: { top: rect.bottom + window.scrollY, left: rect.left + window.scrollX },
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

  if (!question) return <div>Loading...</div>;

  const currentUrl = window.location.href;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    alert('Link copied to clipboard');
  };

  return (
    <div className="container mx-auto">
      <div className="shadow-md shadow-blue-100 rounded pt-6">
        <h1 className="bg-blue-900 rounded-lg font-bold text-4xl mb-2 text-white pl-2 pb-4 pt-4">{question.content}</h1>
        <div className="flex items-center text-gray-700 mb-4 pl-4">
          <i className="fas fa-calendar-alt mr-2" aria-hidden="true"></i> 
          <span>{new Date(question.created_at).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center mb-4 pl-4">
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
        
        <div className="text-slate-700 mb-8 pl-4">
          {question.answer && (
            <>
              <h2 className="text-2xl font-bold mb-2">Answer</h2>
              <p className="text-gray-700 text-base mb-4">{question.answer}</p>
            </>
          )}
          {question.details && (
            <>
              <h2 className="text-2xl font-bold mb-2">Details</h2>
              <p className="text-gray-700 text-base mb-4">{question.details}</p>
            </>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2 mb-8 py-4">
          {question.category && <ColorTag category={question.category} variant="outlined" />}
          <span className={`px-4 py-2 rounded-xl shadow-sm ${question.is_open ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`} aria-label={`Status: ${question.is_open ? 'Open' : 'Closed'}`}>
            {question.is_open ? 'Open' : 'Closed'}
          </span>
          {question.kanban_status && (
            <div ref={statusChipRef}>
              <StatusChip 
                status={question.kanban_status} 
                onClick={handleStatusClick}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleStatusClick(e);
                  }
                }}
              >
                {question.kanban_status}
              </StatusChip>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => setIsResponseModalOpen(true)}
        className="bg-gradient-to-r from-gray-900 to-blue-800 text-white text-2xl font-bold hover:bg-blue-700 py-2 px-4 rounded focus:outline-none focus:shadow-outline transition"
        aria-label="Respond to question"
      >
        Respond
      </button>

      <Modal isOpen={isResponseModalOpen} onClose={() => setIsResponseModalOpen(false)}>
        <ResponseForm questionId={question.id} />
      </Modal>

      {responses.length > 0 && (
        <>
          <h2 className="text-3xl font-bold mt-8 mb-4">Responses to this Question</h2>
          <ResponseList questionId={question.id} />
        </>
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
              onClick={(e) => {
                e.stopPropagation();
                handleUpdateKanbanStatus(status);
              }}
              ref={el => itemRefs.current[index] = el}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
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