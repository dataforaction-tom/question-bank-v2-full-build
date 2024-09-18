// src/pages/SubmitQuestion.js

import React from 'react';
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

const QuestionSchema = Yup.object().shape({
  content: Yup.string().required('Question content is required'),
  is_open: Yup.boolean(),
});

const SubmitQuestion = () => {
  return (
    <Container maxWidth='sm'>
      <Typography variant='h4' component='h1' gutterBottom>
        Submit a Question
      </Typography>
      <Formik
        initialValues={{ content: '', is_open: true }}
        validationSchema={QuestionSchema}
        onSubmit={async (values, { setSubmitting, resetForm }) => {
          try {
            console.log('Submitting question:', values);

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
                is_open: values.is_open,
                organization_id: organizationId,
                created_by: user.id,
                
              },
            ]);

            if (error) {
              console.error('Error submitting question:', error);
              alert(error.message);
            } else {
              console.log('Question submitted:', data);
              alert('Question submitted successfully!');
              resetForm();
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
