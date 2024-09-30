import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Container, Typography, Button, List, ListItem, ListItemText } from '@mui/material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const OrganizationManualRanking = () => {
  const { organizationId } = useParams();
  const [questions, setQuestions] = useState([]);
  const [organization, setOrganization] = useState(null);

  useEffect(() => {
    fetchOrganization();
    fetchQuestions();
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

  const fetchQuestions = async () => {
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

      // Combine all questions, ensuring no duplicates
      const allQuestions = [
        ...directQuestions,
        ...indirectQuestions.map(q => ({ ...q.questions, id: q.question_id }))
      ];

      // Remove duplicates based on question ID
      const uniqueQuestions = Array.from(new Map(allQuestions.map(q => [q.id, q])).values());

      // Fetch rankings
      const { data: rankingsData, error: rankingsError } = await supabase
        .from('organization_question_rankings')
        .select('question_id, manual_rank')
        .eq('organization_id', organizationId);

      if (rankingsError) throw rankingsError;

      // Combine questions with their rankings
      const rankingsMap = new Map(rankingsData.map(r => [r.question_id, r.manual_rank]));
      const sortedQuestions = uniqueQuestions.map(q => ({
        ...q,
        manual_rank: rankingsMap.get(q.id) || null
      })).sort((a, b) => {
        if (a.manual_rank === null && b.manual_rank === null) return 0;
        if (a.manual_rank === null) return 1;
        if (b.manual_rank === null) return -1;
        return a.manual_rank - b.manual_rank;
      });

      setQuestions(sortedQuestions);
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

    // Update the manual_rank for all items
    const updatedItems = items.map((item, index) => ({
      ...item,
      manual_rank: index + 1
    }));

    setQuestions(updatedItems);
  };

  const applyInitialRanks = () => {
    const updatedQuestions = questions.map((question, index) => ({
      ...question,
      manual_rank: index + 1
    }));
    setQuestions(updatedQuestions);
  };

  const handleSubmitRanking = async () => {
    try {
      const updates = questions.map((question) => ({
        organization_id: organizationId,
        question_id: question.id,
        manual_rank: question.manual_rank
      }));

      const { data, error } = await supabase
        .from('organization_question_rankings')
        .upsert(updates, { onConflict: ['organization_id', 'question_id'] });

      if (error) throw error;

      console.log('Ranking update response:', data);
      alert('Ranking submitted successfully!');
      fetchQuestions(); // Refresh the questions to ensure we have the latest data
    } catch (error) {
      console.error('Error submitting ranking:', error);
      alert(`An error occurred while submitting your ranking: ${error.message}`);
    }
  };

  return (
    <Container maxWidth="md">
      <Typography variant="h4" component="h1" gutterBottom>
        {organization ? `${organization.name} - Manual Ranking` : 'Manual Ranking'}
      </Typography>
      <Typography variant="body1" gutterBottom>
        Drag and drop the questions to set their manual ranking order.
      </Typography>
      {questions.some(q => q.manual_rank === null) && (
        <Button
          variant="contained"
          color="secondary"
          onClick={applyInitialRanks}
          style={{ marginBottom: '16px' }}
        >
          Apply Initial Ranks
        </Button>
      )}
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
                      <ListItemText 
                        primary={question.content}
                        secondary={`Current Rank: ${question.manual_rank || 'Not ranked'}`}
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
        variant="contained"
        color="primary"
        onClick={handleSubmitRanking}
        style={{ marginTop: '16px' }}
      >
        Save Ranking
      </Button>
    </Container>
  );
};

export default OrganizationManualRanking;