import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import ResponseForm from './ResponseForm';

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
    <div className="bg-white shadow-md rounded-lg p-4 mb-4">
      <p className="text-gray-800 mb-2">{response.content}</p>
      {response.url && (
        <a
          href={response.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          {response.url}
        </a>
      )}
      <p className="text-sm text-gray-500 mt-2">
        Responded on: {new Date(response.created_at).toLocaleDateString()}
      </p>
      {currentUserId === response.user_id && (
        <div className="mt-2">
          <button
            onClick={handleEdit}
            className="text-blue-600 hover:underline mr-2"
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
        .select('*')
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
      <h2 className="text-2xl font-bold mb-4">Responses</h2>
      {responses.length === 0 ? (
        <p>No responses yet.</p>
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