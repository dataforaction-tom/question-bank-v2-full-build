import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table';

const QuestionTable = ({ questions, onQuestionClick, onAddToOrganization, onRemoveFromOrganization, onDeleteQuestion, onMakeQuestionOpen, isAdmin }) => {
  const navigate = useNavigate();

  const handleQuestionClick = (questionId) => {
    if (onQuestionClick) {
      onQuestionClick(questionId);
    } else {
      navigate(`/questions/${questionId}`);
    }
  };

  const getCategoryColorClass = (category) => {
    const colorMapping = {
      'Poverty': 'bg-red-200 text-red-800',
      'Health': 'bg-green-200 text-green-800',
      'Education': 'bg-blue-200 text-blue-800',
      'Environment': 'bg-yellow-200 text-yellow-800',
      'Advice': 'bg-purple-200 text-purple-800',
    };
    return colorMapping[category] || 'bg-gray-200 text-gray-800';
  };

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
      cell: info => (
        <span className={`px-2 py-1 rounded-full text-sm ${getCategoryColorClass(info.getValue())}`}>
          {info.getValue()}
        </span>
      ),
    },
    {
      accessorKey: 'is_open',
      header: 'Status',
      cell: info => (
        <span className={`px-2 py-1 rounded-full text-sm ${info.getValue() ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
          {info.getValue() ? 'Open' : 'Closed'}
        </span>
      ),
    },
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
  );
};

export default QuestionTable;