import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Container, Typography, Button, List, ListItem, ListItemText } from '@mui/material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const OrganizationELORanking = () => {
  const { organizationId } = useParams();
  const [questions, setQuestions] = useState([]);
  const [organization, setOrganization] = useState(null);

  useEffect(() => {
    fetchOrganization();
    fetchRandomQuestions();
  }, [organizationId]);

  const fetchOrganization = async () => {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();

    if (error) {
      console.error('Error fetching organization:', error);
    } else {
      setOrganization(data);
    }
  };

  const fetchRandomQuestions = async () => {
    const { data, error } = await supabase
      .from('organization_questions')
      .select(`
        question_id,
        questions(*)
      `)
      .eq('organization_id', organizationId)
      .limit(100);

    if (error) {
      console.error('Error fetching questions:', error);
      alert('An error occurred while fetching questions.');
    } else {
      const shuffled = data.sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, 3).map(item => item.questions);
      setQuestions(selected);
    }
  };

  const handleOnDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(questions);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setQuestions(items);
  };

  const handleSubmitRanking = async () => {
    try {
      for (let i = 0; i < questions.length - 1; i++) {
        for (let j = i + 1; j < questions.length; j++) {
          await supabase.rpc('update_organization_elo_ratings', {
            org_id: organizationId,
            winner_id: questions[i].id,
            loser_id: questions[j].id,
          });
        }
      }

      alert('Ranking submitted successfully!');
      fetchRandomQuestions();
    } catch (error) {
      console.error('Error submitting ranking:', error);
      alert('An error occurred while submitting your ranking.');
    }
  };

  return (
    <Container maxWidth="md">
      <Typography variant="h4" component="h1" gutterBottom>
        {organization ? `${organization.name} - ELO Ranking` : 'ELO Ranking'}
      </Typography>
      <Typography variant="body1" gutterBottom>
        Drag and drop the questions to rank them from most important (top) to least important (bottom).
      </Typography>
      <DragDropContext onDragEnd={handleOnDragEnd}>
        <Droppable droppableId="questions">
          {(provided) => (
            <List {...provided.droppableProps} ref={provided.innerRef}>
              {questions.map((question, index) => (
                <Draggable key={question.id} draggableId={question.id} index={index}>
                  {(provided) => (
                    <ListItem
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      style={{
                        ...provided.draggableProps.style,
                        marginBottom: '8px',
                        backgroundColor: 'white',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
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
        variant="contained"
        color="primary"
        onClick={handleSubmitRanking}
        style={{ marginTop: '16px' }}
      >
        Submit Ranking
      </Button>
    </Container>
  );
};

export default OrganizationELORanking;