import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table';
import ColorTag from './ColorTag';
import { createPortal } from 'react-dom';
import styled from '@emotion/styled';
import Button from './Button';  // Import the Button component

const KANBAN_STATUSES = ['Now', 'Next', 'Future', 'Parked', 'Done'];

const COLUMN_COLORS = {
  Now: '#f860b1',
  Next: '#f3581d',
  Future: '#9dc131',
  Parked: '#6a7efc',
  Done: '#53c4af'
};

const StatusChip = styled.div(({ status }) => ({
  backgroundColor: COLUMN_COLORS[status],
  color: 'white',
  padding: '4px 12px',
  borderRadius: '16px',
  fontWeight: 'bold',
  display: 'inline-block',
  cursor: 'pointer',
}));

const Dropdown = styled.div`
  position: fixed;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0px 5px 15px rgba(0,0,0,0.2);
  z-index: 1000;
  overflow: hidden;
`;

const DropdownItem = styled.div(({ status, isFocused }) => ({
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

const QuestionTable = ({ 
  questions, 
  onQuestionClick, 
  onAddToOrganization, 
  onRemoveFromOrganization, 
  onDeleteQuestion, 
  onMakeQuestionOpen, 
  isAdmin,
  isOrganizationQuestion,
  onUpdateKanbanStatus,
  setQuestions
}) => {
  const navigate = useNavigate();
  const [dropdownState, setDropdownState] = useState({ isOpen: false, position: null, rowId: null });
  const [focusedIndex, setFocusedIndex] = useState(0);
  const dropdownRef = useRef(null);
  const itemRefs = useRef([]);
  const [selectedRows, setSelectedRows] = useState({});

  const handleQuestionClick = (questionId) => {
    if (onQuestionClick) {
      onQuestionClick(questionId);
    } else {
      navigate(`/questions/${questionId}`);
    }
  };

  const handleStatusClick = (event, rowId) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setDropdownState({
      isOpen: true,
      position: { top: rect.bottom, left: rect.left },
      rowId
    });
    setFocusedIndex(0);
  };

  const handleStatusChange = (status) => {
    if (dropdownState.rowId !== null) {
      onUpdateKanbanStatus(dropdownState.rowId, status);
      
      // Update the local state
      setQuestions(prevQuestions => {
        if (!Array.isArray(prevQuestions)) {
          console.error('prevQuestions is not an array:', prevQuestions);
          return prevQuestions; // Return the original state if it's not an array
        }
        return prevQuestions.map(q => 
          q.id === dropdownState.rowId ? { ...q, kanban_status: status } : q
        );
      });
    }
    setDropdownState({ isOpen: false, position: null, rowId: null });
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
          setDropdownState({ isOpen: false, position: null, rowId: null });
          break;
        default:
          break;
      }
    }
  };

  const handleRowKeyDown = (event, questionId) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleQuestionClick(questionId);
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
        setDropdownState({ isOpen: false, position: null, rowId: null });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [dropdownState.isOpen]);

  const columns = [
    {
      accessorKey: 'content',
      header: 'Question',
    },
    {
      accessorKey: 'created_at',
      header: 'Date',
      cell: info => new Date(info.getValue()).toLocaleDateString(),
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: info => <ColorTag category={info.getValue()} />,
    },
    {
      accessorKey: 'is_open',
      header: 'Status',
      cell: info => <ColorTag category={info.getValue() ? 'Public' : 'Private'} />,
    },
    ...(isOrganizationQuestion ? [
      {
        accessorKey: 'kanban_status',
        header: 'Kanban Status',
        cell: ({ getValue, row }) => {
          const status = getValue() || 'Now';
          return (
            <StatusChip 
              status={status} 
              onClick={(e) => handleStatusClick(e, row.original.id)}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleStatusClick(e, row.original.id);
                }
              }}
            >
              {status}
            </StatusChip>
          );
        },
      },
    ] : []),
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-2">
          {onAddToOrganization && (
            <Button 
              type="Action"
              onClick={(e) => {
                e.stopPropagation();
                onAddToOrganization(row.original.id);
              }}
              size="sm"
            >
              Add
            </Button>
          )}
          {onRemoveFromOrganization && row.original.is_direct === false && (
            <Button 
              type="Cancel"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveFromOrganization(row.original.id);
              }}
              size="sm"
            >
              Remove
            </Button>
          )}
          {onDeleteQuestion && row.original.is_direct && (
            <Button 
              type="Cancel"
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm('Are you sure you want to delete this question? This action cannot be undone.')) {
                  onDeleteQuestion(row.original.id);
                }
              }}
              size="sm"
            >
              Delete
            </Button>
          )}
          {isAdmin && onMakeQuestionOpen && !row.original.is_open && (
            <Button 
              type="Submit"
              onClick={(e) => {
                e.stopPropagation();
                onMakeQuestionOpen(row.original.id);
              }}
              size="sm"
            >
              Make Public
            </Button>
          )}
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: questions,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white shadow-md rounded border border-gray-300">
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} className="bg-gradient-to-r from-slate-950 to-sky-950 text-white text-xl">
                {headerGroup.headers.map(header => (
                  <th key={header.id} className="px-4 py-2 border">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr 
                key={row.id} 
                onClick={() => handleQuestionClick(row.original.id)}
                onKeyDown={(e) => handleRowKeyDown(e, row.original.id)}
                className="cursor-pointer hover:bg-gray-100"
                tabIndex={0}
                role="button"
                aria-label={`Question: ${row.original.content}`}
              >
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-4 py-2 border">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
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
              onClick={() => handleStatusChange(status)}
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
    </>
  );
};

export default QuestionTable;