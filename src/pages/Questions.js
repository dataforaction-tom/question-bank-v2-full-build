import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import {
  Container,
  Typography,
  Card,
  CardContent,
  CardActionArea,
} from '@mui/material';
import {  useNavigate } from 'react-router-dom';

const Questions = () => {
  const [questions, setQuestions] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchQuestions = async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching questions:', error);
        alert('An error occurred while fetching questions.');
      } else {
        console.log('Fetched questions:', data);
        setQuestions(data);
      }
    };

    fetchQuestions();
  }, []);

  const handleQuestionClick = (id) => {
    navigate(`/questions/${id}`);
  };

  return (
    <Container>
      <Typography variant='h4' component='h1' gutterBottom>
        Questions
      </Typography>
      {questions.map((question) => (
        <Card
          key={question.id}
          style={{ marginBottom: '1rem' }}
          onClick={() => handleQuestionClick(question.id)}
        >
          <CardActionArea>
            <CardContent>
              <Typography variant='h6'>{question.content}</Typography>
              {/* Display additional info here */}
            </CardContent>
          </CardActionArea>
        </Card>
      ))}
    </Container>
  );
};

export default Questions;
