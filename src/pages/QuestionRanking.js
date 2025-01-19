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
import toast from 'react-hot-toast';

const QuestionRanking = ({ open, onClose, onSubmit }) => {
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    const fetchRandomQuestions = async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('is_open', true)
        .limit(100);  // Fetch more questions than needed

      if (error) {
        console.error('Error fetching questions:', error);
        toast.error('An error occurred while fetching questions.');
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

      toast.success('Ranking submitted successfully!');
      if (typeof onSubmit === 'function') {
        onSubmit();
      }
    } catch (error) {
      console.error('Error submitting ranking:', error);
      toast.error('An error occurred while submitting your ranking.');
    }
  };

  const getItemStyle = (index, questionsLength) => {
    if (index === 0) {
      return {
        backgroundColor: '#e6f7ff',
        border: '2px solid #1890ff',
        borderRadius: '4px',
        padding: '1rem',
        marginBottom: '0.5rem',
      };
    } else if (index === 1) {
      return {
        backgroundColor: '#f0f7ff',
        border: '1px solid #69c0ff',
        borderRadius: '4px',
        padding: '1rem',
        marginBottom: '0.5rem',
      };
    } else if (index === questionsLength - 1) {
      return {
        backgroundColor: '#fff7e6',
        border: '1px solid #ffd591',
        borderRadius: '4px',
        padding: '1rem',
        marginBottom: '0.5rem',
      };
    } else {
      return {
        backgroundColor: 'white',
        borderRadius: '4px',
        padding: '1rem',
        marginBottom: '0.5rem',
      };
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <div className='flex flex-col items-center justify-center'>
        <DialogTitle style={{ backgroundColor: '#020617', color: 'white'}} variant='h4'>Community priority ranking</DialogTitle>
      </div>
      <DialogContent>
        <div className='flex flex-col items-center justify-center'>
          <Typography style={{ fontWeight: 600 }} variant='h6' gutterBottom>
            We want to know which questions are most important to you. 
          </Typography>
        </div>
        <Typography variant='body1' gutterBottom>
          Our priorities are crowd sourced from everyone who uses the app. By providing a ranking you are helping us to understand which questions are most important, so we can focus our efforts on these. 
        </Typography>
        <Typography variant='subtitle1' gutterBottom>
          Drag and drop the questions to rank them from most important (top) to least important (bottom).
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
                          ...getItemStyle(index, questions.length),
                        }}
                      >
                        <ListItemText 
                          primary={
                            <Typography
                              variant="body1"
                              style={{ 
                                fontWeight: index === 0 ? 'bold' : index === 1 ? '500' : 'normal',
                                color: index === 0 ? '#1890ff' : index === 1 ? '#69c0ff' : 'inherit'
                              }}
                            >
                              {question.content}
                            </Typography>
                          }
                          secondary={
                            <>
                              {index === 0 && (
                                <Typography
                                  variant="caption"
                                  style={{ color: '#1890ff', marginTop: '0.5rem' }}
                                >
                                  Most Important
                                </Typography>
                              )}
                              {index === 1 && (
                                <Typography
                                  variant="caption"
                                  style={{ color: '#69c0ff', marginTop: '0.5rem' }}
                                >
                                  Second Most Important
                                </Typography>
                              )}
                              {index === questions.length - 1 && (
                                <Typography
                                  variant="caption"
                                  style={{ color: '#ffa940', marginTop: '0.5rem' }}
                                >
                                  Least Important
                                </Typography>
                              )}
                            </>
                          }
                        />
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
