import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Container, Typography, Button as MuiButton } from '@mui/material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { colorMapping, defaultColors } from '../utils/colorMapping';

import toast from 'react-hot-toast';
const OrganizationManualRanking = ({ organizationId }) => {
  
  const [questions, setQuestions] = useState([]);
  const [organization, setOrganization] = useState(null);
  const [viewMode, setViewMode] = useState('card'); // 'card' or 'list'

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
      toast.error('An error occurred while fetching questions.');
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
      toast.success('Ranking submitted successfully!');
      fetchQuestions(); // Refresh the questions to ensure we have the latest data
    } catch (error) {
      console.error('Error submitting ranking:', error);
      toast.error(`An error occurred while submitting your ranking: ${error.message}`);
    }
  };

  const getColorForCategory = (category) => {
    return colorMapping[category] || defaultColors[Math.floor(Math.random() * defaultColors.length)];
  };

  const QuestionCard = ({ question, index }) => {
    const colors = getColorForCategory(question.category);
    return (
      <Draggable key={question.id} draggableId={question.id} index={index}>
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className="bg-white shadow-md rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow duration-200 mb-4"
          >
            <div style={{ backgroundColor: colors.border }} className="h-2"></div>
            <div className="p-4">
              <h4 className="text-lg font-semibold mb-2 wrap">{question.content}</h4>
              <p className="text-sm text-gray-600">Current Rank: {question.manual_rank || 'Not ranked'}</p>
              <p className="text-sm text-gray-600">Category: {question.category}</p>
            </div>
          </div>
        )}
      </Draggable>
    );
  };

  return (
    <Container maxWidth="md">
      <Typography variant="h4" component="h1" gutterBottom>
        {organization ? `${organization.name} - Manual Ranking` : 'Manual Ranking'}
      </Typography>
      <Typography variant="body1" gutterBottom>
        Drag and drop the questions to set their manual ranking order.
      </Typography>
      
      <div className="flex justify-between items-center mb-4">
        <div>
          {questions.some(q => q.manual_rank === null) && (
            <MuiButton
              variant="contained"
              color="secondary"
              onClick={applyInitialRanks}
            >
              Apply Initial Ranks
            </MuiButton>
          )}
        </div>
        <div className="flex space-x-2">
          
        </div>
      </div>

      <DragDropContext onDragEnd={handleOnDragEnd}>
        <Droppable droppableId="questions">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef}>
              {viewMode === 'card' ? (
                questions.map((question, index) => (
                  <QuestionCard key={question.id} question={question} index={index} />
                ))
              ) : (
                <ul className="space-y-2 bg-gray-100 rounded-lg p-4">
                  {questions.map((question, index) => (
                    <Draggable key={question.id} draggableId={question.id} index={index}>
                      {(provided) => (
                        <li
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="bg-white shadow rounded-lg p-3 hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
                        >
                          <p className="font-medium truncate">{question.content}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            Current Rank: {question.manual_rank || 'Not ranked'}
                          </p>
                        </li>
                      )}
                    </Draggable>
                  ))}
                </ul>
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <MuiButton
        variant="contained"
        color="primary"
        onClick={handleSubmitRanking}
        style={{ marginTop: '16px' }}
      >
        Save Ranking
      </MuiButton>
    </Container>
  );
};

export default OrganizationManualRanking;