import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  Dialog,
  DialogContent,
  DialogTitle,
} from '@mui/material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const QuestionRanking = ({ open, onClose, onSubmit }) => {
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    const fetchRandomQuestions = async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .limit(100);  // Fetch more questions than needed

      if (error) {
        console.error('Error fetching questions:', error);
        alert('An error occurred while fetching questions.');
      } else {
        // Shuffle the fetched questions and take the first 3
        const shuffled = data.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 3);
        console.log('Fetched questions for ranking:', selected);
        setQuestions(selected);
      }
    };

    fetchRandomQuestions();
  }, []);

  const handleOnDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(questions);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setQuestions(items);
  };

  const handleSubmitRanking = async () => {
    try {
      console.log('Submitting ranking:', questions);

      // Update Elo ratings
      await supabase.rpc('update_elo_ratings', {
        winner_id: questions[0].id,
        loser_id: questions[1].id,
      });

      await supabase.rpc('update_elo_ratings', {
        winner_id: questions[0].id,
        loser_id: questions[2].id,
      });

      await supabase.rpc('update_elo_ratings', {
        winner_id: questions[1].id,
        loser_id: questions[2].id,
      });

      alert('Ranking submitted successfully!');
      if (typeof onSubmit === 'function') {
        onSubmit();
      }
    } catch (error) {
      console.error('Error submitting ranking:', error);
      alert('An error occurred while submitting your ranking.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Rank the Questions</DialogTitle>
      <DialogContent>
        <Typography variant='body1' gutterBottom>
          Drag and drop the questions to rank them from most important (top) to
          least important (bottom).
        </Typography>
        <DragDropContext onDragEnd={handleOnDragEnd}>
          <Droppable droppableId='questions'>
            {(provided) => (
              <List
                {...provided.droppableProps}
                ref={provided.innerRef}
                style={{ backgroundColor: '#f0f0f0', padding: '1rem' }}
              >
                {questions.map((question, index) => (
                  <Draggable
                    key={question.id}
                    draggableId={question.id}
                    index={index}
                  >
                    {(provided) => (
                      <ListItem
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        style={{
                          ...provided.draggableProps.style,
                          marginBottom: '0.5rem',
                          backgroundColor: 'white',
                        }}
                      >
                        <ListItemText primary={question.content} />
                      </ListItem>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </List>
            )}
          </Droppable>
        </DragDropContext>
        <Button
          variant='contained'
          color='primary'
          onClick={handleSubmitRanking}
          style={{ marginTop: '1rem' }}
        >
          Submit Ranking
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default QuestionRanking;
