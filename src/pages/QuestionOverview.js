import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import Button from '../components/Button';
import { useNavigate } from 'react-router-dom';
import { colorMapping, defaultColors } from '../utils/colorMapping';
import { TextField, InputAdornment, Paper, Box, Typography, CircularProgress } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import QuestionCard from '../components/QuestionCard';
import LandingSection from '../components/LandingSection';

const QuestionOverview = () => {
  const [latestQuestions, setLatestQuestions] = useState([]);
  const [topQuestionsByCategory, setTopQuestionsByCategory] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [focusedCardIndex, setFocusedCardIndex] = useState(-1);
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
  }

  // Update the useEffect
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
  }, [searchQuery, handleSearch]); // Add handleSearch as dependency

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

  const handleCardKeyDown = useCallback((e, index, questionId) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        handleQuestionClick(questionId);
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        setFocusedCardIndex(prev => Math.min(prev + 1, searchResults.length - 1));
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        setFocusedCardIndex(prev => Math.max(prev - 1, 0));
        break;
      default:
        break;
    }
  }, [handleQuestionClick, searchResults.length]);

  return (
    <div className="container mx-auto px-4 py-8">
    <div className="text-center mb-12">
      <h1 className="text-4xl font-bold mb-4">
        Welcome to the <span className="inline-block relative">
        <span className="relative z-10">Question Bank</span>
        <span className="absolute bottom-0 left-0 w-full h-2 bg-pink-200/50"></span>
      </span>
      </h1>
      <p className="text-xl text-gray-600 max-w-2xl mx-auto">
        <span className="inline-block relative">
          <span className="relative z-10 font-bold">Search</span>
          <span className="absolute bottom-0 left-0 w-full h-2 bg-pink-200/50"></span>
        </span>, <span className="inline-block relative">
          <span className="relative z-10 font-bold">browse</span>
          <span className="absolute bottom-0 left-0 w-full h-2 bg-sky-200/50"></span>
        </span>, or <span className="inline-block relative">
          <span className="relative z-10 font-bold">ask </span>
          <span className="absolute bottom-0 left-0 w-full h-2 bg-pink-200/50"></span>
        </span> your own open questions so we can all work together to answer them.
      </p>
    </div>
    

    {/* Search Section */}
<Paper elevation={3} sx={{ 
  p: 3, 
  mb: 4,
  borderRadius: 28,
}}>
  <div className="flex items-center gap-4">
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
          borderRadius: 28,
          '& .MuiOutlinedInput-notchedOutline': {
            borderRadius: 28,
          },
          '&:hover': {
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'primary.main',
            },
          },
        },
      }}
    />
    <span className="text-gray-500 text-lg whitespace-nowrap">or</span>
    <Button
      type="Submit"
      onClick={() => navigate('/questions')}
      className="whitespace-nowrap"
    >
      View All Questions
    </Button>
  </div>
</Paper>

      {/* Search Results */}
      {showSearchResults ? (
        <Box sx={{ mb: 6 }}>
          <Typography variant="h5" sx={{ mb: 3 }}>
            Search Results {searchResults.length > 0 && `(${searchResults.length})`}
          </Typography>
          {searchResults.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {searchResults.map((question, index) => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  onClick={() => handleQuestionClick(question.id)}
                  onKeyDown={(e) => handleCardKeyDown(e, index, question.id)}
                  tabIndex={0}
                  className={`${focusedCardIndex === index ? 'ring-2 ring-sky-500' : ''}`}
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
            <div className="space-y-3 bg-gradient-to-r from-slate-950 to-sky-900 rounded-lg p-4">
              {latestQuestions.map((question, index) => (
                <Paper
                  key={question.id}
                  elevation={1}
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => handleCardKeyDown(e, index, question.id)}
                  aria-label={`Question ${index + 1} of ${latestQuestions.length}: ${question.content}. Press Enter to view details.`}
                  sx={{
                    '&:hover': {
                      backgroundColor: 'grey.50',
                      cursor: 'pointer',
                    },
                    '&:focus': {
                      outline: 'none',
                      boxShadow: '0 0 0 2px rgb(236 72 153)', // pink-500
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
              {Object.entries(topQuestionsByCategory).map(([category, question], index) => (
                <Paper
                  key={category}
                  elevation={1}
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => handleCardKeyDown(e, index, question.id)}
                  aria-label={`${category} category question ${index + 1} of ${Object.keys(topQuestionsByCategory).length}: ${question.content}. Press Enter to view details.`}
                  sx={{
                    borderRadius: '1rem',
                    overflow: 'hidden',
                    '&:hover': {
                      backgroundColor: 'grey.50',
                      cursor: 'pointer',
                    },
                    '&:focus': {
                      outline: 'none',
                      boxShadow: '0 0 0 2px rgb(236 72 153)', // pink-500
                    },
                    transition: 'background-color 0.2s ease',
                  }}
                  onClick={() => handleQuestionClick(question.id)}
                >
                  <div className="bg-gradient-to-r from-slate-950 to-sky-900 font-bold text-lg text-white px-6 py-3 rounded-t-2xl">
                    {category}
                  </div>
                  <Box sx={{ p: 3 }}>
                    <Typography 
                      sx={{ 
                        fontWeight: 500,
                        whiteSpace: 'normal',
                        wordBreak: 'break-word'
                      }}
                    >
                      {question.content}
                    </Typography>
                  </Box>
                </Paper>
              ))}
            </div>
          </div>
        </div>
      )}

<LandingSection />
    </div>
  );
};

export default QuestionOverview;