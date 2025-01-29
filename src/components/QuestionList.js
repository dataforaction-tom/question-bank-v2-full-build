import React from 'react';
import QuestionTable from './QuestionTable';
import QuestionCard from './QuestionCard';

const QuestionList = ({ questions, viewMode, sortBy, isAdmin, organizationId, onUpdateKanbanStatus }) => {
  const renderQuestions = () => {
    switch (viewMode) {
      case 'table':
        return (
          <QuestionTable 
            questions={questions}
            sortBy={sortBy}
            isAdmin={isAdmin}
            organizationId={organizationId}
            onUpdateKanbanStatus={onUpdateKanbanStatus}
          />
        );
      case 'cards':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {questions.map(question => (
              <QuestionCard 
                key={question.id}
                question={question}
                isAdmin={isAdmin}
                organizationId={organizationId}
                onUpdateKanbanStatus={onUpdateKanbanStatus}
              />
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      {renderQuestions()}
    </>
  );
};

export default QuestionList;
