import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Container, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';

const QuestionDetail = () => {
  const { id } = useParams();
  const [question, setQuestion] = useState(null);

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
        console.log('Fetched question:', data);
        setQuestion(data);
      }
    };

    fetchQuestion();
  }, [id]);

  if (!question) {
    return (
      <Container>
        <Typography variant='h6'>Loading...</Typography>
      </Container>
    );
  }

  return (
    <Container>
      <Typography variant='h4' component='h1' gutterBottom>
        {question.content}
      </Typography>
      {/* Display responses, tags, etc. */}
    </Container>
  );
};

export default QuestionDetail;
