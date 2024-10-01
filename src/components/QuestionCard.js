import React, { useState, useRef, useEffect } from 'react';
import ColorTag from './ColorTag';
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

const QuestionCard = ({ question, onClick, onAddToOrganization, onRemoveFromOrganization, onDeleteQuestion, onMakeQuestionOpen, isAdmin, onUpdateKanbanStatus }) => {
  const [dropdownState, setDropdownState] = useState({ isOpen: false, position: null });
  const [focusedIndex, setFocusedIndex] = useState(0);
  const statusChipRef = useRef(null);
  const dropdownRef = useRef(null);
  const itemRefs = useRef([]);

  const handleStatusClick = (e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setDropdownState({
      isOpen: true,
      position: { top: rect.bottom, left: rect.left },
    });
    setFocusedIndex(0);
  };

  const handleStatusChange = (newStatus) => {
    if (onUpdateKanbanStatus && typeof onUpdateKanbanStatus === 'function') {
      onUpdateKanbanStatus(question.id, newStatus);
    } else {
      console.warn('onUpdateKanbanStatus is not provided or is not a function');
    }
    setDropdownState({ isOpen: false, position: null });
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

  return (
    <div 
      onClick={onClick}
      className="flex flex-col h-full rounded overflow-hidden shadow-lg cursor-pointer hover:bg-zinc-50 transition duration-300"
    >
      <div className="bg-blue-900 font-bold text-xl mb-2 text-white p-4 flex-grow">
        {question.content}
      </div>
      <div className="px-4 py-2">
        <p className="text-gray-700 text-sm mb-2">
          <i className="fas fa-calendar-alt" aria-hidden="true"></i> {new Date(question.created_at).toLocaleDateString()}
        </p>
        <div className="flex flex-wrap gap-2 mt-auto">
          <ColorTag category={question.category} />
          <ColorTag category={question.is_open ? 'Open' : 'Closed'} />
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
        <div className="mt-4">
          {onAddToOrganization && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onAddToOrganization(question.id);
              }}
              className="bg-blue-500 text-white px-2 py-1 rounded mr-2"
            >
              Add to Org
            </button>
          )}
          {onRemoveFromOrganization && question.is_direct === false && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onRemoveFromOrganization(question.id);
              }}
              className="bg-red-500 text-white px-2 py-1 rounded mr-2"
            >
              Remove from Org
            </button>
          )}
          {onDeleteQuestion && question.is_direct && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm('Are you sure you want to delete this question? This action cannot be undone.')) {
                  onDeleteQuestion(question.id);
                }
              }}
              className="bg-red-700 text-white px-2 py-1 rounded"
            >
              Delete Question
            </button>
          )}
          {isAdmin && onMakeQuestionOpen && !question.is_open && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onMakeQuestionOpen(question.id);
              }}
              className="bg-green-500 text-white px-2 py-1 rounded mr-2"
            >
              Make Open
            </button>
          )}
        </div>
      </div>
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
                handleStatusChange(status);
              }}
              ref={el => itemRefs.current[index] = el}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
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
    </div>
  );
};

export default QuestionCard;