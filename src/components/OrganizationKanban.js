import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Container, Typography, Button, Card, CardContent, Box } from '@mui/material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import ColorTag from './ColorTag';

const KANBAN_STATUSES = ['Now', 'Next', 'Future', 'Parked', 'Done'];

const COLUMN_COLORS = {
  Now: '#f860b1',
  Next: '#f3581d',
  Future: '#9dc131',
  Parked: '#6a7efc',
  Done: '#53c4af'
};

const OrganizationKanban = ({ organizationId, questions, setQuestions }) => {
  const [sortBy, setSortBy] = useState('manual_rank');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (organizationId) {
      fetchQuestions();
    } else {
      setError('No organization ID provided');
      setIsLoading(false);
    }
  }, [organizationId, sortBy]);

  const fetchQuestions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch questions from organization_question_rankings
      const { data: rankingsData, error: rankingsError } = await supabase
        .from('organization_question_rankings')
        .select(`
          question_id,
          manual_rank,
          kanban_status,
          kanban_order,
          questions (id, content, priority_score, organization_id, category)
        `)
        .eq('organization_id', organizationId);

      if (rankingsError) throw rankingsError;

      // Fetch questions directly associated with the organization
      const { data: directQuestions, error: directError } = await supabase
        .from('questions')
        .select('id, content, priority_score, category')
        .eq('organization_id', organizationId);

      if (directError) throw directError;

      // Combine all questions
      const allQuestions = [
        ...rankingsData.map(item => ({
          id: item.question_id,
          content: item.questions.content,
          priority_score: item.questions.priority_score,
          status: item.kanban_status || 'Now',
          order_in_status: item.kanban_order || 0,
          manual_rank: item.manual_rank,
          category: item.questions.category
        })),
        ...directQuestions.map(q => ({
          id: q.id,
          content: q.content,
          priority_score: q.priority_score,
          status: 'Now',
          order_in_status: 0,
          manual_rank: 0,
          category: q.category
        }))
      ];

      // Remove duplicates
      const uniqueQuestions = Array.from(new Set(allQuestions.map(q => q.id)))
        .map(id => allQuestions.find(q => q.id === id));

      // Group questions by Kanban status
      const groupedQuestions = KANBAN_STATUSES.reduce((acc, status) => {
        acc[status] = uniqueQuestions.filter(q => q.status === status);
        return acc;
      }, {});

      // Sort questions within each status
      KANBAN_STATUSES.forEach(status => {
        groupedQuestions[status].sort((a, b) => {
          if (sortBy === 'manual_rank') {
            return (b.manual_rank || 0) - (a.manual_rank || 0);
          } else {
            return (b.priority_score || 0) - (a.priority_score || 0);
          }
        });
      });

      setQuestions(groupedQuestions);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching questions:', error);
      setError('An error occurred while fetching questions.');
      setIsLoading(false);
    }
  };

  const onDragEnd = async (result) => {
    const { source, destination, draggableId } = result;

    if (!destination) {
      return;
    }

    const sourceStatus = source.droppableId;
    const destStatus = destination.droppableId;

    const newQuestions = { ...questions };
    const [movedQuestion] = newQuestions[sourceStatus].splice(source.index, 1);
    movedQuestion.status = destStatus;
    newQuestions[destStatus].splice(destination.index, 0, movedQuestion);

    setQuestions(newQuestions);

    // Update the database
    try {
      const { error } = await supabase
        .from('organization_question_rankings')
        .upsert({
          organization_id: organizationId,
          question_id: draggableId,
          kanban_status: destStatus,
          kanban_order: destination.index
        }, { onConflict: ['organization_id', 'question_id'] });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating question status:', error);
      alert('An error occurred while updating the question status.');
    }
  };

  const handleCardClick = (questionId) => {
    navigate(`/questions/${questionId}`);
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <Container maxWidth="xl" sx={{ backgroundColor: '#1f1d1e', minHeight: '100vh', py: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ color: 'white' }}>Organization Kanban Board</Typography>
      <Button 
        onClick={() => setSortBy(sortBy === 'manual_rank' ? 'priority_score' : 'manual_rank')}
        sx={{ mb: 2, backgroundColor: 'white', color: 'black' }}
      >
        Sort by: {sortBy === 'manual_rank' ? 'Manual Rank' : 'Priority Score'}
      </Button>
      <DragDropContext onDragEnd={onDragEnd}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          {KANBAN_STATUSES.map(status => (
            <Droppable droppableId={status} key={status}>
              {(provided) => (
                <Box
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  sx={{
                    width: '19%',
                    minHeight: '300px',
                    backgroundColor: '#f4f4f4',
                    borderRadius: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                  }}
                >
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      color: 'white', 
                      mb: 2, 
                      p: 2, 
                      backgroundColor: COLUMN_COLORS[status],
                    }}
                  >
                    {status}
                  </Typography>
                  <Box sx={{ p: 2, flexGrow: 1 }}>
                    {questions[status]?.map((question, index) => (
                      <Draggable key={question.id} draggableId={question.id} index={index}>
                        {(provided) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onClick={() => handleCardClick(question.id)}
                            sx={{
                              mb: 2,
                              backgroundColor: 'white',
                              cursor: 'pointer',
                              '&:hover': { boxShadow: 3 },
                              ...provided.draggableProps.style
                            }}
                          >
                            <Box sx={{ height: 8, backgroundColor: COLUMN_COLORS[status] }} />
                            <CardContent>
                              <Typography>{question.content}</Typography>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                                {question.category && <ColorTag category={question.category} />}
                                <Typography variant="caption">
                                  {sortBy === 'manual_rank' ? `Rank: ${question.manual_rank || 'N/A'}` : `Score: ${question.priority_score || 'N/A'}`}
                                </Typography>
                              </Box>
                            </CardContent>
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </Box>
                </Box>
              )}
            </Droppable>
          ))}
        </Box>
      </DragDropContext>
    </Container>
  );
};

export default OrganizationKanban;