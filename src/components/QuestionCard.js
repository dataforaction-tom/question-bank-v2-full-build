import React, { useState, useRef, useEffect } from 'react';
import ColorTag from './ColorTag';
import { styled } from '@mui/material';
import { createPortal } from 'react-dom';
import { FaThumbsUp, FaBell, FaComment } from 'react-icons/fa';
import Button from './Button';


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

const DropdownItem = styled('div')(({ status, isFocused }) => ({
  padding: '8px 16px',
  cursor: 'pointer',
  backgroundColor: isFocused ? COLUMN_COLORS[status] : 'white',
  color: isFocused ? 'white' : 'black',
  '&:hover': {
    backgroundColor: COLUMN_COLORS[status],
    color: 'white',
  },
  outline: 'none',
}));

const QuestionCard = ({ 
  question, 
  onClick, 
  onAddToOrganization, 
  onRemoveFromOrganization, 
  onDeleteQuestion,
  onMakeQuestionOpen,
  isAdmin,
  isOrganizationQuestion,
  onUpdateKanbanStatus,
  organizationId  
}) => {
 
  
  const [dropdownState, setDropdownState] = useState({ isOpen: false, position: null });
  const [focusedIndex, setFocusedIndex] = useState(0);
  const statusChipRef = useRef(null);
  const dropdownRef = useRef(null);
  const itemRefs = useRef([]);
  const [anchorEl, setAnchorEl] = useState(null);

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
    if (dropdownState.isOpen) {
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
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
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
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

 

  return (
    <div 
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className="flex flex-col h-full rounded-xl overflow-hidden shadow-lg cursor-pointer hover:bg-[#e3f2fd] transition duration-300 w-full"
      tabIndex={0}
      role="button"
      aria-label={`Question: ${question.content}`}
    >
      <div className="bg-gradient-to-r from-slate-950 to-sky-900 font-bold text-sm md:text-sm text-white p-2 flex justify-between items-center rounded-t-xl">
        <div></div>
        <div className="flex space-x-4 ml-auto">
          <span className="flex items-center">
            <FaThumbsUp className="mr-1 text-white-600" />
            {question.endorsements_count || 0}
          </span>
          <span className="flex items-center">
            <FaBell className="mr-1 text-white-600" />
            {question.followers_count || 0}
          </span>
          <span className="flex items-center">
            <FaComment className="mr-1 text-white-600" />
            {question.responses_count || 0}
          </span>
        </div>
      </div>

      
      <div className=" text-base md:text-xl text-slate-900 p-3 md:p-4 flex-grow break-words">
        {question.content}
      </div>
     
      
      <div className="p-2 md:px-4 md:py-2">
        <div className="flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <div className="flex flex-wrap gap-2 w-full">
              <ColorTag category={question.category} />
              {question.user_category && <ColorTag category={question.user_category} />}
              {!question.is_open && <ColorTag category="Private" />}
              {question.kanban_status && (
                <div ref={statusChipRef}>
                  <StatusChip 
                    status={question.kanban_status} 
                    onClick={handleStatusClick}
                    tabIndex={0}
                    className="text-sm"
                  >
                    {question.kanban_status}
                  </StatusChip>
                </div>
              )}
            </div>
            
          </div>

          <div className="flex flex-wrap gap-2 mt-2 border-t pt-2">
            {onAddToOrganization && (
              <Button 
                type="Action"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToOrganization(question.id);
                }}
                className="text-sm w-full sm:w-auto"
                size="sm"
              >
                Add to Org
              </Button>
            )}
            {onRemoveFromOrganization && question.is_direct === false && (
              <Button 
                type="Cancel"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveFromOrganization(question.id);
                }}
                className="text-sm w-full sm:w-auto"
                size="sm"
              >
                Remove
              </Button>
            )}
            {onDeleteQuestion && question.is_direct && (
              <Button 
                type="Cancel"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm('Are you sure you want to delete this question? This action cannot be undone.')) {
                    onDeleteQuestion(question.id);
                  }
                }}
                size="sm"
                className="text-sm w-full sm:w-auto"
              >
                Delete
              </Button>
            )}
            {isAdmin && onMakeQuestionOpen && !question.is_open && (
              <Button 
                type="Submit"
                onClick={(e) => {
                  e.stopPropagation();
                  onMakeQuestionOpen(question.id);
                }}
                className="text-sm w-full sm:w-auto"
                size="sm"
              >
                Make Public
              </Button>
            )}
          </div>
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
    </div>
  );
};

export default QuestionCard;
