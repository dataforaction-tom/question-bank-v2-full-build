import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table';
import ColorTag from './ColorTag';
import { createPortal } from 'react-dom';
import styled from '@emotion/styled';

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
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  z-index: 1000;
`;

const DropdownItem = styled.div`
  padding: 8px 12px;
  cursor: pointer;
  &:hover, &:focus {
    background-color: #f0f0f0;
    outline: none;
  }
`;

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
  setQuestions  // Add this line
}) => {
  const navigate = useNavigate();
  const [dropdownState, setDropdownState] = useState({ isOpen: false, position: null, rowId: null });
  const [focusedIndex, setFocusedIndex] = useState(0);
  const dropdownRef = useRef(null);
  const itemRefs = useRef([]);

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
        const updatedQuestions = { ...prevQuestions };
        Object.keys(updatedQuestions).forEach(prevStatus => {
          const questionIndex = updatedQuestions[prevStatus].findIndex(q => q.id === dropdownState.rowId);
          if (questionIndex !== -1) {
            const [question] = updatedQuestions[prevStatus].splice(questionIndex, 1);
            question.kanban_status = status;
            updatedQuestions[status] = [...(updatedQuestions[status] || []), question];
          }
        });
        return updatedQuestions;
      });
    }
    setDropdownState({ isOpen: false, position: null, rowId: null });
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
        setDropdownState({ isOpen: false, position: null, rowId: null });
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
      cell: info => <ColorTag category={info.getValue() ? 'Open' : 'Closed'} />,
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
        <>
          {onAddToOrganization && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onAddToOrganization(row.original.id);
              }}
              className="bg-blue-500 text-white px-2 py-1 rounded mr-2"
            >
              Add to Org
            </button>
          )}
          {onRemoveFromOrganization && row.original.is_direct === false && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onRemoveFromOrganization(row.original.id);
              }}
              className="bg-red-500 text-white px-2 py-1 rounded mr-2"
            >
              Remove from Org
            </button>
          )}
          {onDeleteQuestion && row.original.is_direct && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm('Are you sure you want to delete this question? This action cannot be undone.')) {
                  onDeleteQuestion(row.original.id);
                }
              }}
              className="bg-red-700 text-white px-2 py-1 rounded"
            >
              Delete Question
            </button>
          )}
          {isAdmin && onMakeQuestionOpen && !row.original.is_open && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onMakeQuestionOpen(row.original.id);
              }}
              className="bg-green-500 text-white px-2 py-1 rounded mr-2"
            >
              Make Open
            </button>
          )}
        </>
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
              <tr key={headerGroup.id} className="bg-blue-900 text-white text-xl">
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
                className="cursor-pointer hover:bg-gray-100"
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
              onClick={() => handleStatusChange(status)}
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
    </>
  );
};

export default QuestionTable;