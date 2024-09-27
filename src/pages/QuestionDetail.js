import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import ResponseForm from '../components/ResponseForm';
import ResponseList from '../components/ResponseList';
import Modal from '../components/Modal';
import { FaLinkedin, FaLink, FaEnvelope } from 'react-icons/fa';
import { colorMapping, defaultColors } from '../utils/colorMapping';

const QuestionDetail = () => {
  const { id } = useParams();
  const [question, setQuestion] = useState(null);
  const [responses, setResponses] = useState([]);
  const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);

  useEffect(() => {
    const fetchQuestion = async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching question:', error);
        alert('An error occurred while fetching the question.');
      } else {
        setQuestion(data);
      }
    };

    const fetchResponses = async () => {
      const { data, error } = await supabase
        .from('responses')
        .select('*')
        .eq('question_id', id);

      if (error) {
        console.error('Error fetching responses:', error);
      } else {
        setResponses(data);
      }
    };

    fetchQuestion();
    fetchResponses();
  }, [id]);

  if (!question) return <div>Loading...</div>;

  const currentUrl = window.location.href;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    alert('Link copied to clipboard');
  };

  const getCategoryColorClass = (category) => {
    return colorMapping[category] || defaultColors[0];
  };

  return (
    <div className="container mx-auto">
      <div className="shadow-md shadow-blue-100 rounded pt-6">
        <h1 className="bg-blue-900 rounded-lg font-bold text-4xl mb-2 text-white pl-2 pb-4 pt-4">{question.content}</h1>
        <div className="flex items-center text-gray-700 mb-4 pl-4">
          <i className="fas fa-calendar-alt mr-2" aria-hidden="true"></i> 
          <span>{new Date(question.created_at).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center mb-4 pl-4">
          <span className="mr-4">SHARE:</span>
          <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${currentUrl}`} target="_blank" rel="noopener noreferrer" className="text-blue-700 text-2xl mr-2" aria-label="Share on LinkedIn">
            <FaLinkedin />
          </a>
          <button onClick={handleCopyLink} className="text-gray-700 text-2xl mr-2" aria-label="Copy link">
            <FaLink />
          </button>
          <a href={`mailto:?subject=Check out this question&body=Check out this question I found: ${currentUrl}`} className="text-green-600 text-2xl" aria-label="Share via email">
            <FaEnvelope />
          </a>
        </div>
        
        <div className="text-slate-700 mb-8 pl-4">
          {question.answer && (
            <>
              <h2 className="text-2xl font-bold mb-2">Answer</h2>
              <p className="text-gray-700 text-base mb-4">{question.answer}</p>
            </>
          )}
          {question.details && (
            <>
              <h2 className="text-2xl font-bold mb-2">Details</h2>
              <p className="text-gray-700 text-base mb-4">{question.details}</p>
            </>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2 mb-8 py-4">
          <span className={`px-4 py-2 rounded-xl shadow-sm ${getCategoryColorClass(question.category)}`} aria-label={`Category: ${question.category}`}>{question.category}</span>
          <span className={`px-4 py-2 rounded-xl shadow-sm ${question.is_open ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`} aria-label={`Status: ${question.is_open ? 'Open' : 'Closed'}`}>
            {question.is_open ? 'Open' : 'Closed'}
          </span>
        </div>
      </div>

      <button
        onClick={() => setIsResponseModalOpen(true)}
        className="bg-gradient-to-r from-gray-900 to-blue-800 text-white text-2xl font-bold hover:bg-blue-700 py-2 px-4 rounded focus:outline-none focus:shadow-outline transition"
        aria-label="Respond to question"
      >
        Respond
      </button>

      <Modal isOpen={isResponseModalOpen} onClose={() => setIsResponseModalOpen(false)}>
        <ResponseForm questionId={question.id} />
      </Modal>

      {responses.length > 0 && (
        <>
          <h2 className="text-3xl font-bold mt-8 mb-4">Responses to this Question</h2>
          <ResponseList questionId={question.id} />
        </>
      )}
    </div>
  );
};

export default QuestionDetail;
