import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Typography, DialogTitle } from '@mui/material';

const ResponseForm = ({ questionId, responseId, onSubmit, initialContent = '', initialUrl = '', isEditing = false, onCancel }) => {
  const [content, setContent] = useState(initialContent);
  const [url, setUrl] = useState(initialUrl);

  useEffect(() => {
    setContent(initialContent);
    setUrl(initialUrl);
  }, [initialContent, initialUrl]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!content.trim()) {
      alert('Please enter a response.');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        alert('Please log in to submit a response.');
        return;
      }

      const trimmedUrl = url ? url.trim() : null;

      if (isEditing) {
        // Update existing response
        const { error } = await supabase
          .from('responses')
          .update({
            content: content.trim(),
            url: trimmedUrl,
          })
          .eq('id', responseId); // Use responseId for editing

        if (error) throw error;
      } else {
        // Insert new response
        const { error } = await supabase
          .from('responses')
          .insert({
            question_id: questionId,
            user_id: user.id,
            content: content.trim(),
            url: trimmedUrl,
          });

        if (error) throw error;
      }

      setContent('');
      setUrl('');
      onSubmit();
      alert(isEditing ? 'Response updated successfully!' : 'Response submitted successfully!');
    } catch (error) {
      console.error('Error submitting response:', error);
      alert('Failed to submit response. Please try again.');
    }
  };

  return (
    <div className="flex flex-col">
      <div className='flex flex-col items-center justify-center'>
        <DialogTitle style={{ backgroundColor: '#020617', color: 'white', width: '100%' }} variant='h4'>
          {isEditing ? 'Edit Response' : 'Add Response'}
        </DialogTitle>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4 p-4">
        <div>
          <Typography variant="subtitle1" className="block text-sm font-medium text-gray-700 mb-2">
            Your Response
          </Typography>
          <textarea
            id="content"
            name="content"
            rows="4"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          ></textarea>
        </div>
        
        <div>
          <Typography variant="subtitle1" className="block text-sm font-medium text-gray-700 mb-2">
            URL (optional)
          </Typography>
          <input
            type="url"
            id="url"
            name="url"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
        
        <div className="flex justify-between pt-4">
          <button
            type="submit"
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-sky-900 hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
          >
            {isEditing ? 'Update Response' : 'Submit Response'}
          </button>
          {isEditing && (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default ResponseForm;
