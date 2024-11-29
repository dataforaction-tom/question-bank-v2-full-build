import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Button from '../components/Button';
import { useNavigate } from 'react-router-dom';
import { colorMapping, defaultColors } from '../utils/colorMapping';
import { TextField, InputAdornment, Paper, Box, Typography, CircularProgress } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import QuestionCard from '../components/QuestionCard';

const QuestionOverview = () => {
  const [latestQuestions, setLatestQuestions] = useState([]);
  const [topQuestionsByCategory, setTopQuestionsByCategory] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchLatestQuestions();
    fetchTopQuestionsByCategory();
  }, []);

  // Add debounced search effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery) {
        handleSearch();
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setShowSearchResults(true);

    try {
      const { data, error } = await supabase
        .from('questions')
        .select(`
          *,
          endorsements:endorsements(count),
          followers:question_followers(count),
          responses:responses(count)
        `)
        .eq('is_open', true)
        .or(`content.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%`)
        .order('priority_score', { ascending: false });

      if (error) throw error;

      const questionsWithCounts = data.map(q => ({
        ...q,
        endorsements_count: q.endorsements[0]?.count || 0,
        followers_count: q.followers[0]?.count || 0,
        responses_count: q.responses[0]?.count || 0
      }));

      setSearchResults(questionsWithCounts);
    } catch (error) {
      console.error('Error searching questions:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const fetchLatestQuestions = async () => {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('is_open', true)
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
      .eq('is_open', true)
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

      {/* Search Section */}
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search questions by content or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
            endAdornment: isSearching && (
              <InputAdornment position="end">
                <CircularProgress size={20} />
              </InputAdornment>
            ),
            sx: {
              borderRadius: 2,
              '&:hover': {
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'primary.main',
                },
              },
            },
          }}
        />
      </Paper>

      {/* Search Results */}
      {showSearchResults ? (
        <Box sx={{ mb: 6 }}>
          <Typography variant="h5" sx={{ mb: 3 }}>
            Search Results {searchResults.length > 0 && `(${searchResults.length})`}
          </Typography>
          {searchResults.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {searchResults.map(question => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  onClick={() => handleQuestionClick(question.id)}
                />
              ))}
            </div>
          ) : (
            <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
              <Typography color="text.secondary">
                No questions found matching your search.
              </Typography>
            </Paper>
          )}
        </Box>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Latest Questions Section */}
          <div className="lg:w-1/3">
            <h2 className="text-2xl font-semibold mb-4">Latest Questions</h2>
            <div className="space-y-3 bg-slate-950 rounded-lg p-4">
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
                        whiteSpace: 'normal',  // Allows text to wrap
                        wordBreak: 'break-word' // Handles very long words
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
      )}

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