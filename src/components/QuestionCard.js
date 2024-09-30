import React from 'react';

const QuestionCard = ({ question, onClick, onAddToOrganization, onRemoveFromOrganization, onDeleteQuestion }) => {
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
          <span className={`px-2 py-1 text-sm rounded-xl shadow-sm ${getCategoryColorClass(question.category)}`}>
            {question.category}
          </span>
          <span className={`px-2 py-1 text-sm rounded-xl shadow-sm ${question.is_open ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
            {question.is_open ? 'Open' : 'Closed'}
          </span>
        </div>
        <div className="mt-4">
          {onAddToOrganization && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onAddToOrganization();
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
                onRemoveFromOrganization();
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
                  onDeleteQuestion();
                }
              }}
              className="bg-red-700 text-white px-2 py-1 rounded"
            >
              Delete Question
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuestionCard;
