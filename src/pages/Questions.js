import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import QuestionTable from '../components/QuestionTable';
import QuestionCard from '../components/QuestionCard';
import Filter from '../components/Filter';
import { useNavigate } from 'react-router-dom';
import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import Button from '../components/Button';  // Import the Button component

const Questions = () => {
  const [questions, setQuestions] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [viewMode, setViewMode] = useState('cards'); // 'table' or 'cards'
  const [filters, setFilters] = useState({ category: '', is_open: '' });
  const navigate = useNavigate();
  const [userOrganizationId, setUserOrganizationId] = useState(null);
  const [groupBy, setGroupBy] = useState(null);

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

  const GroupingMenu = () => (
    <Menu as="div" className="relative inline-block text-left">
      <div>
        <Menu.Button className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-indigo-500">
          Group by
          <ChevronDownIcon className="-mr-1 ml-2 h-5 w-5" aria-hidden="true" />
        </Menu.Button>
      </div>
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

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Questions</h1>
      <Filter filters={filters} setFilters={setFilters} />
      <div className="flex flex-col sm:flex-row justify-end mb-4">
        <div className="mb-4 sm:mb-0 flex space-x-4">
          <GroupingMenu />
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