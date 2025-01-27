import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { supabase } from '../supabaseClient';
import { Container, Typography, Card, CardContent } from '@mui/material';
import { useOrganization } from '../context/OrganizationContext';
import toast from 'react-hot-toast';

const ResponseTypePill = ({ type, manualRank, kanbanStatus }) => {
  const typeStyles = {
    answer: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      label: 'Answer'
    },
    partial_answer: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      label: 'Partial Answer'
    },
    way_of_answering: {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      label: 'Way of Answering'
    },
    other: {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      label: 'Other'
    }
  };

  const rankStyles = {
    bg: 'bg-purple-100',
    text: 'text-purple-800'
  };

  const kanbanStyles = {
    'Now': { bg: 'bg-pink-100', text: 'text-pink-800' },
    'Next': { bg: 'bg-orange-100', text: 'text-orange-800' },
    'Future': { bg: 'bg-green-100', text: 'text-green-800' },
    'Parked': { bg: 'bg-blue-100', text: 'text-blue-800' },
    'No Action': { bg: 'bg-teal-100', text: 'text-teal-800' }
  };

  const style = typeStyles[type] || typeStyles.other;
  const kanbanStyle = kanbanStyles[kanbanStatus] || { bg: 'bg-gray-100', text: 'text-gray-800' };

  return (
    <div className="flex gap-2">
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        {style.label}
      </span>
      {manualRank && (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${rankStyles.bg} ${rankStyles.text}`}>
          Rank #{manualRank}
        </span>
      )}
      {kanbanStatus && (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${kanbanStyle.bg} ${kanbanStyle.text}`}>
          {kanbanStatus}
        </span>
      )}
    </div>
  );
};

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
          questions(
            id,
            content
          ),
          response_rankings(
            manual_rank,
            elo_score,
            kanban_status
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
                        <div className="bg-gradient-to-r from-sky-950 to-teal-500 font-bold text-lg text-white pl-4 p-1 flex justify-between items-center">
                          <h2>Response</h2>
                          <div className="pr-4">
                            <ResponseTypePill 
                              type={response.response_type || 'other'}
                              manualRank={index + 1}
                              kanbanStatus={response.response_rankings?.[0]?.kanban_status}
                            />
                          </div>
                        </div>
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