import React from 'react';
import { Paper, Typography, Box } from '@mui/material';

const QuestionOverviewSection = ({ 
    latestQuestions = [], // Add default empty array
    topQuestionsByCategory = {}, // Add default empty object
    handleQuestionClick,
    isOrganizationView = false 
}) => {
  const CompactQuestionCard = ({ question }) => {
    return (
      <div 
        className="bg-white shadow-md rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow duration-200"
        onClick={() => handleQuestionClick(question.id)}
      >
        <div className="bg-gradient-to-r from-slate-950 to-sky-900 h-2"></div>
        <div className="p-4">
          <h4 className="text-lg font-semibold mb-2 wrap">{question.content}</h4>
        </div>
      </div>
    );
  };

  const CategoryHeading = ({ category }) => {
    return (
      <h3 className="bg-gradient-to-r from-slate-950 to-sky-900 font-bold text-lg text-white px-4 py-2 rounded-md mb-2">
        {category}
      </h3>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Latest Questions Section */}
      <div className="lg:w-1/3">
        <h2 className="text-2xl font-semibold mb-4">Latest Questions</h2>
        <div className="space-y-3 bg-gradient-to-r from-slate-950 to-sky-900 rounded-lg p-4">
          {latestQuestions.map(question => (
            <Paper
              key={question.id}
              elevation={1}
              sx={{
                '&:hover': {
                  backgroundColor: 'grey.50',
                  cursor: 'pointer',
                },
                transition: 'background-color 0.2s ease',
              }}
              onClick={() => handleQuestionClick(question.id)}
            >
              <Box sx={{ p: 2 }}>
                <Typography 
                  sx={{ 
                    fontWeight: 500,
                    whiteSpace: 'normal',
                    wordBreak: 'break-word'
                  }}
                >
                  {question.content}
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    display: 'block',
                    mt: 1,
                    color: 'text.secondary'
                  }}
                >
                  Created: {new Date(question.created_at).toLocaleDateString()}
                </Typography>
              </Box>
            </Paper>
          ))}
          {latestQuestions.length === 0 && (
            <Typography 
              sx={{ 
                textAlign: 'center', 
                color: 'text.secondary',
                py: 2 
              }}
            >
              No questions available
            </Typography>
          )}
        </div>
      </div>

      {/* Top Questions by Category Section */}
      <div className="lg:w-2/3">
        <h2 className="text-2xl font-semibold mb-4">Top Questions by Category</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Object.entries(topQuestionsByCategory).map(([category, question]) => (
            <div key={category}>
              <CategoryHeading category={category} />
              <CompactQuestionCard question={question} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QuestionOverviewSection;
