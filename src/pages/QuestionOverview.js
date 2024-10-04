import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Button from '../components/Button';
import { useNavigate } from 'react-router-dom';
import { colorMapping, defaultColors } from '../utils/colorMapping';

const QuestionOverview = () => {
  const [latestQuestions, setLatestQuestions] = useState([]);
  const [topQuestionsByCategory, setTopQuestionsByCategory] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchLatestQuestions();
    fetchTopQuestionsByCategory();
  }, []);

  const fetchLatestQuestions = async () => {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Error fetching latest questions:', error);
    } else {
      setLatestQuestions(data);
    }
  };

  const fetchTopQuestionsByCategory = async () => {
    // Fetch all questions and their categories
    const { data, error } = await supabase
      .from('questions')
      .select('id, content, category, priority_score')
      .order('priority_score', { ascending: false });

    if (error) {
      console.error('Error fetching questions:', error);
      return;
    }

    // Process the data to get top question for each category
    const topQuestions = {};
    data.forEach(question => {
      if (question.category && !topQuestions[question.category]) {
        topQuestions[question.category] = question;
      }
    });

    setTopQuestionsByCategory(topQuestions);
  };

  const handleQuestionClick = (questionId) => {
    navigate(`/questions/${questionId}`);
  };

  const getColorForCategory = (category) => {
    return colorMapping[category] || defaultColors[Math.floor(Math.random() * defaultColors.length)];
  };

  const CompactQuestionCard = ({ question }) => {
    const colors = getColorForCategory(question.category);
    return (
      <div 
        className="bg-white shadow-md rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow duration-200"
        onClick={() => handleQuestionClick(question.id)}
      >
        <div style={{ backgroundColor: colors.border }} className="h-2"></div>
        <div className="p-4">
          <h4 className="text-lg font-semibold mb-2 wrap">{question.content}</h4>
          
        </div>
      </div>
    );
  };

  const CategoryHeading = ({ category }) => {
    const colors = getColorForCategory(category);
    return (
      <h3 
        className="text-lg font-medium mb-2 px-3 py-1 rounded-md text-white"
        style={{ backgroundColor: colors.border }}
      >
        {category}
      </h3>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Question Overview</h1>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Latest Questions Section */}
        <div className="lg:w-1/3">
          <h2 className="text-2xl font-semibold mb-4">Latest Questions</h2>
          <ul className="space-y-2 bg-slate-950 rounded-lg p-4">
            {latestQuestions.map(question => (
              <li 
                key={question.id}
                className="bg-white shadow rounded-lg p-3 hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
                onClick={() => handleQuestionClick(question.id)}
              >
                <p className="font-medium truncate">{question.content}</p>
                <p className="text-sm text-gray-600 mt-1">
                  Created: {new Date(question.created_at).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
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

      {/* View All Questions Button */}
      <div className="mt-8 text-center">
        <Button
          type="Submit"
          onClick={() => navigate('/questions')}
          className="px-6 py-3"
        >
          View All Questions
        </Button>
      </div>
    </div>
  );
};

export default QuestionOverview;