import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import ResponseForm from './ResponseForm';

const ResponseTypePill = ({ type, manualRank, kanbanStatus }) => {
  const typeStyles = {
    answer: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      label: 'Answer'
    },
    partial_answer: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      label: 'Partial Answer'
    },
    way_of_answering: {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      label: 'Way of Answering'
    },
    other: {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      label: 'Other'
    }
  };

  const rankStyles = {
    bg: 'bg-purple-100',
    text: 'text-purple-800'
  };

  const kanbanStyles = {
    'Now': { bg: 'bg-pink-100', text: 'text-pink-800' },
    'Next': { bg: 'bg-orange-100', text: 'text-orange-800' },
    'Future': { bg: 'bg-green-100', text: 'text-green-800' },
    'Parked': { bg: 'bg-blue-100', text: 'text-blue-800' },
    'No Action': { bg: 'bg-teal-100', text: 'text-teal-800' }
  };

  const style = typeStyles[type] || typeStyles.other;
  const kanbanStyle = kanbanStyles[kanbanStatus] || { bg: 'bg-gray-100', text: 'text-gray-800' };

  return (
    <div className="flex gap-2">
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        {style.label}
      </span>
      {manualRank && (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${rankStyles.bg} ${rankStyles.text}`}>
          Rank #{manualRank}
        </span>
      )}
      {kanbanStatus && (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${kanbanStyle.bg} ${kanbanStyle.text}`}>
          {kanbanStatus}
        </span>
      )}
    </div>
  );
};

const ResponseCard = ({ response, currentUserId, onEdit, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this response?')) {
      await onDelete(response.id);
    }
  };

  const handleSubmit = async (updatedContent, updatedUrl) => {
    await onEdit(response.id, updatedContent, updatedUrl);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <ResponseForm
        questionId={response.question_id}
        responseId={response.id}
        initialContent={response.content}
        initialUrl={response.url}
        isEditing={true}
        onSubmit={(updatedContent, updatedUrl) => {
          onEdit(response.id, updatedContent, updatedUrl);
          setIsEditing(false);
        }}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <div className="bg-white shadow-md rounded-lg">
      <div className="bg-gradient-to-r from-sky-950 to-teal-500 font-bold text-lg text-white pl-4 p-1 flex justify-between items-center">
        <h2>Response</h2>
        <div className="pr-4">
          <ResponseTypePill 
            type={response.response_type || 'other'} 
            manualRank={response.response_rankings?.[0]?.manual_rank}
            kanbanStatus={response.response_rankings?.[0]?.kanban_status}
          />
        </div>
      </div>
      <p className="text-gray-800 mb-2 p-4">{response.content}</p>
      {response.url && (
        <a
          href={response.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline p-4"
        >
          {response.url}
        </a>
      )}
      <p className="text-sm text-gray-500 mt-2 p-4">
        Responded on: {new Date(response.created_at).toLocaleDateString()}
      </p>
      {currentUserId === response.user_id && (
        <div className="mt-2 p-4">
          <button
            onClick={handleEdit}
            className="text-blue-600 hover:underline mr-2 "
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="text-red-600 hover:underline"
          >
            Delete
          </button>
        </div>
      )}
      <div className="mb-8"></div>
    </div>
  );
};

const ResponseList = ({ questionId, currentUserId }) => {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchResponses = async () => {
    try {
      const { data, error } = await supabase
        .from('responses')
        .select(`
          *,
          response_rankings (
            manual_rank,
            kanban_status
          )
        `)
        .eq('question_id', questionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResponses(data);
    } catch (error) {
      console.error('Error fetching responses:', error);
      setError('Failed to load responses. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResponses();
  }, [questionId]);

  const handleEdit = async (responseId, updatedContent, updatedUrl) => {
    try {
      const { error } = await supabase
        .from('responses')
        .update({ content: updatedContent, url: updatedUrl })
        .eq('id', responseId);

      if (error) throw error;
      await fetchResponses();
    } catch (error) {
      console.error('Error updating response:', error);
      alert('Failed to update response. Please try again.');
    }
  };

  const handleDelete = async (responseId) => {
    try {
      const { error } = await supabase
        .from('responses')
        .delete()
        .eq('id', responseId);

      if (error) throw error;
      await fetchResponses();
    } catch (error) {
      console.error('Error deleting response:', error);
      alert('Failed to delete response. Please try again.');
    }
  };

  if (loading) return <div>Loading responses...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div>
      
      {responses.length === 0 ? (
        <p></p>
      ) : (
        
        responses.map((response) => (
          <ResponseCard
            key={response.id}
            response={response}
            currentUserId={currentUserId}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))
      )}
    </div>
  );
};

export default ResponseList;