import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import QuestionTable from '../components/QuestionTable';
import QuestionCard from '../components/QuestionCard';
import Filter from '../components/Filter';
import { useNavigate } from 'react-router-dom';
import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import Button from '../components/Button';
import { useAuth } from '../hooks/useAuth'; // Import useAuth hook
import Papa from 'papaparse'; // Import PapaParse

const Questions = () => {
  const [questions, setQuestions] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [viewMode, setViewMode] = useState('cards'); // 'table' or 'cards'
  const [filters, setFilters] = useState({ category: '', is_open: '' });
  const navigate = useNavigate();
  const { session } = useAuth(); // Get the session
  const [userOrganizationId, setUserOrganizationId] = useState(null);
  const [groupBy, setGroupBy] = useState(null);

  useEffect(() => {
    const fetchUserOrganization = async () => {
      if (session?.user) {
        const { data, error } = await supabase
          .from('organization_users')
          .select('organization_id')
          .eq('user_id', session.user.id)
          .single();
        if (data) {
          setUserOrganizationId(data.organization_id);
        }
      }
    };

    fetchUserOrganization();
  }, [session]);

  useEffect(() => {
    const fetchQuestions = async () => {
      let query = supabase
        .from('questions')
        .select(`
          *,
          endorsements(count),
          question_followers(count),
          responses(
            id,
            content,
            url,
            response_type
          )
        `)
        .eq('is_open', true)
        .order('priority_score', { ascending: false });
  
      if (userOrganizationId) {
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
          followers_count: q.question_followers[0]?.count || 0,
          responses_count: q.responses.length,
          responses: q.responses || []
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
      const filtered = questions
        .filter(question => category ? question.category === category : true)
        .sort((a, b) => b.priority_score - a.priority_score);  // Ensure filtered questions are also sorted
      setFilteredQuestions(filtered);
    };

    filterQuestions();
  }, [filters, questions]);

  const handleQuestionClick = (questionId) => {
    navigate(`/questions/${questionId}`);
  };

  const GroupingMenu = () => (
    <Menu as="div" className="relative inline-block text-left">
      
      <Transition
        as={React.Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={() => setGroupBy(null)}
                  className={`${
                    active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                  } block px-4 py-2 text-sm w-full text-left`}
                >
                  None
                </button>
              )}
            </Menu.Item>
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={() => setGroupBy('category')}
                  className={`${
                    active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                  } block px-4 py-2 text-sm w-full text-left`}
                >
                  Category
                </button>
              )}
            </Menu.Item>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );

  const exportToCSV = () => {
    const csvData = [];

    filteredQuestions.forEach(question => {
      if (question.responses && question.responses.length > 0) {
        question.responses.forEach(response => {
          csvData.push({
            question_content: question.content,
            question_category: question.category,
            submission_date: new Date(question.created_at).toISOString().split('T')[0],
            response_content: response.content,
            response_url: response.url,
            response_type: response.response_type
          });
        });
      } else {
        // If no responses, still include the question with empty response fields
        csvData.push({
          question_content: question.content,
          question_category: question.category,
          submission_date: new Date(question.created_at).toISOString().split('T')[0],
          response_content: '',
          response_url: '',
          response_type: ''
        });
      }
    });

    const csv = Papa.unparse(csvData);

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'questions_with_responses.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Questions</h1>
      <Filter filters={filters} setFilters={setFilters} />
      <div className="flex flex-col sm:flex-row justify-end mb-4">
        <div className="mb-4 sm:mb-0 flex space-x-4">
          <GroupingMenu />
          <Button 
            type="button"
            onClick={exportToCSV} // Add export button
            className="p-2"
          >
            Export CSV
          </Button>
          <Button 
            type="ChangeView"
            onClick={() => setViewMode('table')} 
            active={viewMode === 'table'}
            className="p-2"
          >
            Table View
          </Button>
          <Button 
            type="ChangeView"
            onClick={() => setViewMode('cards')} 
            active={viewMode === 'cards'}
            className="p-2"
          >
            Card View
          </Button>
        </div>
      </div>
      {viewMode === 'table' ? (
        <div className="overflow-x-auto">
          <QuestionTable 
            questions={filteredQuestions} 
            onQuestionClick={handleQuestionClick}
            groupBy={groupBy}
            organizationId={userOrganizationId} // Pass organizationId
            isAdmin={false} // Assume not admin in public view
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQuestions.map(question => (
            <QuestionCard 
              key={question.id} 
              question={question} 
              onClick={() => handleQuestionClick(question.id)}
              organizationId={userOrganizationId} // Pass organizationId
              isAdmin={false} // Assume not admin in public view
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Questions;
