// src/pages/MyQuestions.js

import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import {
  Container,
  Typography,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
} from '@mui/material';

const MyQuestions = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null); // Manage user state

  useEffect(() => {
    const fetchUserAndQuestions = async () => {
      // Fetch the current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUser(user); // Set the user in state

        // Fetch questions where the user is the creator (created_by)
        const { data: questionsData, error: questionsError } = await supabase
          .from('questions')
          .select('id, content, created_at')
          .eq('created_by', user.id) // Fetch questions linked to the current user
          .order('created_at', { ascending: false });

        if (questionsError) {
          console.error('Error fetching questions:', questionsError);
        } else {
          setQuestions(questionsData); // Set the questions in state
        }
      }
      setLoading(false);
    };

    fetchUserAndQuestions();
  }, []); // Empty dependency array means this will run once when the component mounts

  if (loading) {
    return (
      <Container>
        <CircularProgress />
        <Typography>Loading questions...</Typography>
      </Container>
    );
  }

  return (
    <Container>
      <Typography variant='h4' gutterBottom>
        My Questions
      </Typography>
      {questions.length > 0 ? (
        <List>
          {questions.map((question) => (
            <ListItem
              key={question.id}
              button
              onClick={() => alert(`Clicked on question: ${question.id}`)}
            >
              <ListItemText
                primary={question.content}
                secondary={`Created at: ${new Date(
                  question.created_at
                ).toLocaleString()}`}
              />
            </ListItem>
          ))}
        </List>
      ) : (
        <Typography>No questions found.</Typography>
      )}
    </Container>
  );
};

export default MyQuestions;
