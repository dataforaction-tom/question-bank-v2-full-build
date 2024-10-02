import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import QuestionTable from '../components/QuestionTable';
import QuestionCard from '../components/QuestionCard';
import Filter from '../components/Filter';
import { useNavigate } from 'react-router-dom';

const Questions = () => {
  const [questions, setQuestions] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [viewMode, setViewMode] = useState('cards'); // 'table' or 'cards'
  const [filters, setFilters] = useState({ category: '', is_open: '' });
  const navigate = useNavigate();
  const [userOrganizationId, setUserOrganizationId] = useState(null);

  useEffect(() => {
    const fetchUserOrganization = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('organization_users')
          .select('organization_id')
          .eq('user_id', user.id)
          .single();
        if (data) {
          setUserOrganizationId(data.organization_id);
        }
      }
    };

    fetchUserOrganization();
  }, []);

  useEffect(() => {
    const fetchQuestions = async () => {
      let query = supabase
        .from('questions')
        .select(`
          *,
          endorsements:endorsements(count),
          followers:question_followers(count),
          responses:responses(count)
        `)
        .eq('is_open', true)  // This ensures we only fetch open questions
        .order('priority_score', { ascending: false });

      if (userOrganizationId) {
        // This allows fetching closed questions for the user's organization
        query = query.or(`is_open.eq.true,and(is_open.eq.false,organization_id.eq.${userOrganizationId})`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching questions:', error);
        alert('An error occurred while fetching questions.');
      } else {
        const questionsWithCounts = data.map(q => ({
          ...q,
          endorsements_count: q.endorsements[0]?.count || 0,
          followers_count: q.followers[0]?.count || 0,
          responses_count: q.responses[0]?.count || 0
        }));
        setQuestions(questionsWithCounts);
        setFilteredQuestions(questionsWithCounts);
      }
    };

    fetchQuestions();
  }, [userOrganizationId]);

  useEffect(() => {
    const filterQuestions = () => {
      const { category } = filters;
      const filtered = questions.filter(question => {
        return category ? question.category === category : true;
      });
      setFilteredQuestions(filtered);
    };

    filterQuestions();
  }, [filters, questions]);

  const handleQuestionClick = (questionId) => {
    navigate(`/questions/${questionId}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Questions</h1>
      <Filter filters={filters} setFilters={setFilters} />
      <div className="flex flex-col sm:flex-row justify-end mb-4">
        <div className="mb-4 sm:mb-0">
          <button 
            onClick={() => setViewMode('table')} 
            className={`px-4 py-2 ${viewMode === 'table' ? 'bg-blue-900 rounded-lg font-bold text-white p-2' : 'bg-gray-300 rounded-lg font-bold text-white p-2'} transition`} 
            aria-pressed={viewMode === 'table'}
          >
            Table View
          </button>
          <button 
            onClick={() => setViewMode('cards')} 
            className={`ml-0 sm:ml-2 mt-2 sm:mt-0 px-4 py-2 ${viewMode === 'cards' ? 'bg-blue-900 rounded-lg font-bold text-white p-2' : 'bg-gray-300 rounded-lg font-bold text-white p-2'} transition`} 
            aria-pressed={viewMode === 'cards'}
          >
            Card View
          </button>
        </div>
      </div>
      {viewMode === 'table' ? (
        <div className="overflow-x-auto">
          <QuestionTable 
            questions={filteredQuestions} 
            onQuestionClick={handleQuestionClick}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQuestions.map(question => (
            <QuestionCard 
              key={question.id} 
              question={question} 
              onClick={() => handleQuestionClick(question.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Questions;
