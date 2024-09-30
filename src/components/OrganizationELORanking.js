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
    try {
      // Fetch questions directly associated with the organization
      const { data: directQuestions, error: directError } = await supabase
        .from('questions')
        .select('*')
        .eq('organization_id', organizationId);

      if (directError) throw directError;

      // Fetch questions from organization_questions table
      const { data: indirectQuestions, error: indirectError } = await supabase
        .from('organization_questions')
        .select(`
          question_id,
          questions (*)
        `)
        .eq('organization_id', organizationId);

      if (indirectError) throw indirectError;

      // Combine all questions
      const allQuestions = [
        ...directQuestions,
        ...indirectQuestions.map(q => ({ ...q.questions, id: q.question_id }))
      ];

      // Remove duplicates
      const uniqueQuestions = Array.from(new Set(allQuestions.map(q => q.id)))
        .map(id => allQuestions.find(q => q.id === id));

      // Shuffle and select 3 random questions
      const shuffled = uniqueQuestions.sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, 3);

      setQuestions(selected);
    } catch (error) {
      console.error('Error fetching questions:', error);
      alert('An error occurred while fetching questions.');
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

      // Ensure all questions are in the organization_question_rankings table
      const updates = questions.map((question, index) => ({
        organization_id: organizationId,
        question_id: question.id,
        elo_score: question.elo_rating || 1500, // Default ELO rating if not set
      }));

      const { error } = await supabase
        .from('organization_question_rankings')
        .upsert(updates, { onConflict: ['organization_id', 'question_id'] });

      if (error) throw error;

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