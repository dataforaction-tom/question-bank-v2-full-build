import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { supabase } from '../supabaseClient';
import { Box, Typography, Card, CardContent } from '@mui/material';
import toast from 'react-hot-toast';
import { useOrganization } from '../context/OrganizationContext';
import ResponseTypePill from './ResponseTypePill';

const KANBAN_STATUSES = ['Now', 'Next', 'Future', 'Parked', 'No Action'];

const COLUMN_COLORS = {
  'Now': '#f860b1',    // Pink
  'Next': '#f3581d',   // Orange
  'Future': '#9dc131', // Green
  'Parked': '#6a7efc', // Blue
  'No Action': '#53c4af' // Teal
};



const ResponseKanban = ({ questionId, organizationId, fetchMode = 'question' }) => {
  const { isAdmin } = useOrganization();
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchResponses = async () => {
    try {
      setLoading(true);

      let questionsToFetch = [];
      
      if (fetchMode === 'organization' && organizationId) {
        // Fetch all questions for the organization
        const { data: orgQuestions, error: orgError } = await supabase
          .from('questions')
          .select('id')
          .eq('organization_id', organizationId);

        const { data: indirectQuestions, error: indirectError } = await supabase
          .from('organization_questions')
          .select('question_id')
          .eq('organization_id', organizationId);

        if (orgError) throw orgError;
        if (indirectError) throw indirectError;

        questionsToFetch = [
          ...orgQuestions.map(q => q.id),
          ...indirectQuestions.map(q => q.question_id)
        ];
      } else {
        // Just fetch responses for the current question
        questionsToFetch = [questionId];
      }

      // Updated query to use correct field names
      const { data: responsesData, error: responsesError } = await supabase
        .from('responses')
        .select(`
          *,
          questions(
            id,
            content
          ),
          response_rankings (
            manual_rank,
            elo_score,
            kanban_status,
            kanban_order
          )
        `)
        .in('question_id', questionsToFetch)
        .eq('response_rankings.organization_id', organizationId);

      if (responsesError) throw responsesError;

      // Group responses by kanban status
      const groupedResponses = KANBAN_STATUSES.reduce((acc, status) => {
        acc[status] = responsesData
          .filter(r => {
            const ranking = r.response_rankings?.[0];
            return ranking?.kanban_status === status || (!ranking && status === 'No Action');
          })
          .sort((a, b) => {
            const orderA = a.response_rankings?.[0]?.kanban_order ?? 0;
            const orderB = b.response_rankings?.[0]?.kanban_order ?? 0;
            return orderA - orderB;
          });
        return acc;
      }, {});

      setResponses(groupedResponses);
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
    const { source, destination, draggableId } = result;

    if (!destination) return;

    const sourceStatus = source.droppableId;
    const destStatus = destination.droppableId;

    // Update local state
    const newResponses = { ...responses };
    const [movedResponse] = newResponses[sourceStatus].splice(source.index, 1);
    newResponses[destStatus].splice(destination.index, 0, movedResponse);
    setResponses(newResponses);

    try {
      // Get all responses in the destination column to update their order
      const destinationResponses = newResponses[destStatus];
      const updates = destinationResponses.map((response, index) => ({
        response_id: response.id,
        question_id: response.question_id,
        organization_id: organizationId,
        kanban_status: destStatus,
        kanban_order: index,
        manual_rank: response.response_rankings?.[0]?.manual_rank ?? null,
        elo_score: response.response_rankings?.[0]?.elo_score ?? 1500
      }));

      const { error } = await supabase
        .from('response_rankings')
        .upsert(updates, { onConflict: ['response_id', 'organization_id'] });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating response ranking:', error);
      toast.error('Failed to update response position');
      // Revert the state if there's an error
      fetchResponses();
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', padding: 2 }}>
        {KANBAN_STATUSES.map(status => (
          <Box
            key={status}
            sx={{
              width: 300,
              minWidth: 300,
              backgroundColor: '#f4f4f4',
              borderRadius: 2,
              padding: 2
            }}
          >
            <Typography
              variant="h6"
              sx={{
                color: 'white',
                backgroundColor: COLUMN_COLORS[status],
                padding: 1,
                borderRadius: 1,
                marginBottom: 2
              }}
            >
              {status} ({responses[status]?.length || 0})
            </Typography>
            <Droppable droppableId={status} key={status}>
              {(provided, snapshot = {}) => (
                <Box
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  sx={{ 
                    minHeight: 500,
                    backgroundColor: snapshot.isDraggingOver ? '#e8e8e8' : '#f4f4f4',
                    transition: 'background-color 0.2s ease'
                  }}
                >
                  {responses[status]?.map((response, index) => (
                    <Draggable
                      key={response.id}
                      draggableId={response.id}
                      index={index}
                    >
                      {(provided, snapshot = {}) => (
                        <Card
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          sx={{ 
                            marginBottom: 2,
                            transform: snapshot.isDragging ? 'rotate(2deg)' : 'none',
                            transition: 'transform 0.2s ease'
                          }}
                        >
                          <CardContent>
                            
                            <Typography>{response.content}</Typography>
                            <ResponseTypePill type={response.response_type} />
                          </CardContent>
                        </Card>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </Box>
              )}
            </Droppable>
          </Box>
        ))}
      </Box>
    </DragDropContext>
  );
};

export default ResponseKanban;