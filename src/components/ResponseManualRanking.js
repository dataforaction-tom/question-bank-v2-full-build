import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { supabase } from '../supabaseClient';
import { Container, Typography, Card, CardContent } from '@mui/material';
import { useOrganization } from '../context/OrganizationContext';
import toast from 'react-hot-toast';

const ResponseManualRanking = ({ questionId, organizationId }) => {
  const { isAdmin } = useOrganization();
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchResponses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('responses')
        .select(`
          *,
          questions!inner(
            id,
            content
          ),
          response_rankings!left (
            manual_rank,
            elo_score
          )
        `)
        .eq('question_id', questionId)
        .order('created_at');

      if (error) throw error;

      const sortedResponses = data.sort((a, b) => {
        const rankA = a.response_rankings?.[0]?.manual_rank ?? Infinity;
        const rankB = b.response_rankings?.[0]?.manual_rank ?? Infinity;
        return rankA - rankB;
      });

      setResponses(sortedResponses);
    } catch (error) {
      console.error('Error fetching responses:', error);
      toast.error('Failed to fetch responses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (questionId && organizationId) {
      fetchResponses();
    }
  }, [questionId, organizationId]);

  if (!isAdmin) {
    return <div>You must be an admin to access this feature.</div>;
  }

  if (loading) {
    return <div>Loading responses...</div>;
  }

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(responses);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setResponses(items);

    try {
      const updates = items.map((response, index) => ({
        response_id: response.id,
        question_id: questionId,
        organization_id: organizationId,
        manual_rank: index + 1
      }));

      const { error } = await supabase
        .from('response_rankings')
        .upsert(updates, { onConflict: ['response_id', 'organization_id'] });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating rankings:', error);
      toast.error('Failed to update rankings');
      fetchResponses(); // Revert to previous state if there's an error
    }
  };

  return (
    <Container maxWidth="md">
      <Typography variant="h5" gutterBottom>
        Response Rankings
      </Typography>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="responses">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef}>
              {responses.map((response, index) => (
                <Draggable
                  key={response.id}
                  draggableId={response.id}
                  index={index}
                >
                  {(provided) => (
                    <Card
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      sx={{ marginBottom: 2 }}
                    >
                      <CardContent>
                        <Typography variant="body2" color="textSecondary" gutterBottom>
                          Question: {response.questions.content.substring(0, 100)}...
                        </Typography>
                        <Typography>{response.content}</Typography>
                        <Typography variant="caption" color="textSecondary">
                          Rank: {index + 1}
                        </Typography>
                      </CardContent>
                    </Card>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </Container>
  );
};

export default ResponseManualRanking; 