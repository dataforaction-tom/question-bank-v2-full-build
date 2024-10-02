// src/pages/SubmitQuestion.js

import React, { useState } from 'react';
import { Formik, Form } from 'formik';
import { supabase } from '../supabaseClient';
import {
  TextField,
  Button,
  Container,
  Typography,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import * as Yup from 'yup';
import SimilarQuestionsModal from '../components/SimilarQuestionsModal';

const QuestionSchema = Yup.object().shape({
  content: Yup.string().required('Question content is required'),
  answer: Yup.string().required('Answer is required'),
  is_open: Yup.boolean(),
});

const SubmitQuestion = () => {
  const [similarQuestions, setSimilarQuestions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [submissionData, setSubmissionData] = useState(null);

  const checkSimilarQuestions = async (content) => {
    try {
      console.log('Sending request to generate embedding');
      const response = await fetch('/api/generateEmbedding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: content }),
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to generate embedding: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Embedding data:', data);

      if (!data.embedding) {
        throw new Error('No embedding returned from API');
      }

      // Search for similar questions using the updated RPC
      console.log('Calling match_questions with embedding:', data.embedding);
      const { data: similarData, error: searchError } = await supabase
        .rpc('match_questions', { 
          query_embedding: data.embedding, 
          match_threshold: 0.8,
          match_count: 5
        });

      if (searchError) {
        console.error('Error searching for similar questions:', searchError);
        throw searchError;
      }

      console.log('Similar questions:', similarData);
      setSimilarQuestions(similarData);
      return data;
    } catch (error) {
      console.error('Error checking similar questions:', error);
      alert(`Failed to check for similar questions: ${error.message}`);
      throw error;
    }
  };

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      const { embedding, category } = await checkSimilarQuestions(values.content);

      if (similarQuestions.length > 0) {
        setSubmissionData({ values, embedding, category });
        setShowModal(true);
        setSubmitting(false);
        return;
      }

      await submitQuestion(values, embedding, category);
      resetForm();
    } catch (error) {
      console.error('Unexpected error:', error);
      alert('An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitQuestion = async (values, embedding, category) => {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError) {
      console.error('Error fetching user:', userError);
      alert('Error fetching user information.');
      return;
    }

    let organizationId = null;
    if (!values.is_open) {
      const { data: orgUsers, error: orgError } = await supabase
        .from('organization_users')
        .select('organization_id')
        .eq('user_id', user.id);

      if (orgError) {
        console.error('Error fetching organization:', orgError);
        alert('Error fetching organization information.');
        return;
      }

      if (orgUsers.length === 0) {
        alert('You are not associated with any organization.');
        return;
      }

      organizationId = orgUsers[0].organization_id;
    }

    const { data, error } = await supabase.from('questions').insert([
      {
        content: values.content,
        answer: values.answer,
        is_open: values.is_open,
        organization_id: organizationId,
        created_by: user.id,
        embedding: embedding,
        category: category,
      },
    ]);

    if (error) {
      console.error('Error submitting question:', error);
      alert(error.message);
    } else {
      console.log('Question submitted:', data);
      alert('Question submitted successfully!');
      setSimilarQuestions([]);
    }
  };

  const handleSelectSimilarQuestion = async (selectedQuestion) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Add endorsement
      const { error: endorsementError } = await supabase
        .from('endorsements')
        .insert([
          { user_id: user.id, question_id: selectedQuestion.id }
        ]);

      if (endorsementError) {
        throw endorsementError;
      }

      // Add follow
      const { error: followError } = await supabase
        .from('question_followers')
        .insert([
          { user_id: user.id, question_id: selectedQuestion.id }
        ]);

      if (followError) {
        throw followError;
      }

      // Create alternative question record
      const { error: alternativeError } = await supabase
        .from('alternative_questions')
        .insert([
          {
            original_question_id: selectedQuestion.id,
            alternative_content: submissionData.values.content,
            alternative_answer: submissionData.values.answer,
            user_id: user.id,
          }
        ]);

      if (alternativeError) {
        throw alternativeError;
      }

      setShowModal(false);
      setSubmissionData(null);
      alert('You have successfully endorsed and followed the existing question.');
    } catch (error) {
      console.error('Error processing similar question selection:', error);
      alert(`An error occurred: ${error.message}`);
    }
  };

  const handleSubmitOriginal = async () => {
    await submitQuestion(submissionData.values, submissionData.embedding, submissionData.category);
    setShowModal(false);
    setSubmissionData(null);
  };

  return (
    <Container maxWidth="md">
      <Typography variant="h4" component="h1" gutterBottom>
        Submit a Question
      </Typography>
      <Formik
        initialValues={{ content: '', answer: '', is_open: true }}
        validationSchema={QuestionSchema}
        onSubmit={handleSubmit}
      >
        {({
          isSubmitting,
          values,
          handleChange,
          errors,
          touched,
          handleBlur,
        }) => (
          <Form>
            <TextField
              label='Your Question'
              name='content'
              fullWidth
              margin='normal'
              multiline
              rows={4}
              value={values.content}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.content && Boolean(errors.content)}
              helperText={touched.content && errors.content}
            />
            <TextField
              label='Answering this question means you will be able to do what?'
              name='answer'
              fullWidth
              margin='normal'
              multiline
              rows={4}
              value={values.answer}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.answer && Boolean(errors.answer)}
              helperText={touched.answer && errors.answer}
            />
            <FormControlLabel
              control={
                <Checkbox
                  name='is_open'
                  checked={values.is_open}
                  onChange={handleChange}
                />
              }
              label='Make this question public'
            />
            <Button
              variant='contained'
              color='secondary'
              type='submit'
              disabled={isSubmitting}
              fullWidth
              style={{ marginTop: '1rem' }}
            >
              Submit Question
            </Button>
          </Form>
        )}
      </Formik>

      <SimilarQuestionsModal
        open={showModal}
        onClose={() => setShowModal(false)}
        similarQuestions={similarQuestions}
        onSelectQuestion={handleSelectSimilarQuestion}
        onSubmitOriginal={handleSubmitOriginal}
      />
    </Container>
  );
};

export default SubmitQuestion;