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
  Card,
  CardContent,
  CardActions,
} from '@mui/material';
import * as Yup from 'yup';

const QuestionSchema = Yup.object().shape({
  content: Yup.string().required('Question content is required'),
  answer: Yup.string().required('Answer is required'),
  is_open: Yup.boolean(),
});

const SubmitQuestion = () => {
  const [similarQuestions, setSimilarQuestions] = useState([]);

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

      // Search for similar questions
      const { data: similarData, error: searchError } = await supabase
        .rpc('match_questions', { 
          query_embedding: data.embedding, 
          match_threshold: 0.8,
          match_count: 5
        });

      if (searchError) throw searchError;

      setSimilarQuestions(similarData);
      return data;
    } catch (error) {
      console.error('Error checking similar questions:', error);
      alert(`Failed to check for similar questions: ${error.message}`);
      throw error;
    }
  };

  return (
    <Container maxWidth='sm'>
      <Typography variant='h4' component='h1' gutterBottom>
        Submit a Question
      </Typography>
      <Formik
        initialValues={{ content: '', answer: '', is_open: true }}
        validationSchema={QuestionSchema}
        onSubmit={async (values, { setSubmitting, resetForm }) => {
          try {
            console.log('Submitting question:', values);

            const { embedding, category } = await checkSimilarQuestions(values.content);

            // Get the current user
            const {
              data: { user },
              error: userError,
            } = await supabase.auth.getUser();

            if (userError) {
              console.error('Error fetching user:', userError);
              alert('Error fetching user information.');
              setSubmitting(false);
              return;
            }

            // Determine the organization ID if the question is not open
            let organizationId = null;
            if (!values.is_open) {
              // Fetch the user's organization ID(s)
              const { data: orgUsers, error: orgError } = await supabase
                .from('organization_users')
                .select('organization_id')
                .eq('user_id', user.id);

              if (orgError) {
                console.error('Error fetching organization:', orgError);
                alert('Error fetching organization information.');
                setSubmitting(false);
                return;
              }

              if (orgUsers.length === 0) {
                alert('You are not associated with any organization.');
                setSubmitting(false);
                return;
              }

              // Assuming the user can select or defaults to the first organization
              organizationId = orgUsers[0].organization_id;
            }

            // Insert the new question
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
              resetForm();
              setSimilarQuestions([]);
            }
          } catch (error) {
            console.error('Unexpected error:', error);
            alert('An unexpected error occurred.');
          } finally {
            setSubmitting(false);
          }
        }}
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
              color='primary'
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
    </Container>
  );
};

export default SubmitQuestion;
