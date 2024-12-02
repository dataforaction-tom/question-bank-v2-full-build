import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Chip, TextField, Typography, Grid } from '@mui/material';
import Button from './Button';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { supabase } from '../supabaseClient';

const TagManager = React.memo(({ questionId, organizationId, isAdmin = false, mode = 'question' }) => {
  const [newTagName, setNewTagName] = useState('');
  const [organizationTags, setOrganizationTags] = useState([]);
  const [questionTags, setQuestionTags] = useState([]);

  // Memoize fetch functions
  const fetchOrganizationTags = useCallback(async () => {
    if (!organizationId) return;
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('organization_id', organizationId);
    if (error) {
      console.error('Error fetching organization tags:', error);
    } else {
      setOrganizationTags(data.filter(tag => tag != null));
    }
  }, [organizationId]);

  const fetchQuestionTags = useCallback(async () => {
    if (!questionId) return;
    const { data, error } = await supabase
      .from('question_tags')
      .select('tags(*)')
      .eq('question_id', questionId);
    if (error) {
      console.error('Error fetching question tags:', error);
    } else {
      setQuestionTags(data.map(item => item.tags).filter(tag => tag != null));
    }
  }, [questionId]);

  // Fetch data only when IDs change
  useEffect(() => {
    if (organizationId) {
      fetchOrganizationTags();
    }
    if (questionId) {
      fetchQuestionTags();
    }
  }, [organizationId, questionId, fetchOrganizationTags, fetchQuestionTags]);

  // Memoize handlers
  const handleCreateTag = useCallback(async () => {
    if (newTagName.trim() && mode === 'manage' && organizationId) {
      const { data, error } = await supabase
        .from('tags')
        .insert({ name: newTagName.trim(), organization_id: organizationId })
        .select();
      if (error) {
        console.error('Error creating tag:', error);
      } else {
        setOrganizationTags(prev => [...prev, data[0]]);
        setNewTagName('');
      }
    }
  }, [newTagName, mode, organizationId]);

  const handleDeleteTag = useCallback(async (tagId) => {
    if (mode === 'manage' && organizationId) {
      const { error } = await supabase
        .from('tags')
        .delete()
        .match({ id: tagId, organization_id: organizationId });
      if (error) {
        console.error('Error deleting tag:', error);
      } else {
        setOrganizationTags(prev => prev.filter(tag => tag.id !== tagId));
      }
    }
  }, [mode, organizationId]);

  const handleAddTagToQuestion = useCallback(async (tagId) => {
    if (!questionId) return;
    const { error } = await supabase
      .from('question_tags')
      .insert({ question_id: questionId, tag_id: tagId });
    if (error) {
      console.error('Error adding tag to question:', error);
    } else {
      fetchQuestionTags();
    }
  }, [questionId, fetchQuestionTags]);

  const handleRemoveTagFromQuestion = useCallback(async (tagId) => {
    if (!questionId) return;
    const { error } = await supabase
      .from('question_tags')
      .delete()
      .match({ question_id: questionId, tag_id: tagId });
    if (error) {
      console.error('Error removing tag from question:', error);
    } else {
      fetchQuestionTags();
    }
  }, [questionId, fetchQuestionTags]);

  // Memoize renderTags function
  const renderTags = useCallback((tags, isQuestionTag = false) => (
    <Grid container spacing={1}>
      {tags.filter(tag => tag != null).map(tag => (
        <Grid item key={tag.id}>
          <Chip
            label={tag.name}
            onDelete={mode === 'manage' && isAdmin ? 
              () => handleDeleteTag(tag.id) : 
              isQuestionTag ? () => handleRemoveTagFromQuestion(tag.id) : undefined
            }
            onClick={mode === 'question' && !isQuestionTag ? () => handleAddTagToQuestion(tag.id) : undefined}
            color={isQuestionTag ? "primary" : "default"}
            deleteIcon={<DeleteIcon />}
          />
        </Grid>
      ))}
    </Grid>
  ), [mode, isAdmin, handleDeleteTag, handleRemoveTagFromQuestion, handleAddTagToQuestion]);

  // Memoize the content to render
  const content = useMemo(() => {
    if (!organizationId && !questionId) {
      return <Typography>No tags available for this question</Typography>;
    }

    return mode === 'manage' ? (
      <>
        <Typography variant="subtitle1" gutterBottom>Organization Tags</Typography>
        {renderTags(organizationTags)}
        {isAdmin && (
          <div className="mt-4">
            <TextField
              label="New Tag Name"
              variant="outlined"
              size="small"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
            />
            <Button
              onClick={handleCreateTag}
              disabled={!newTagName.trim()}
              className="ml-2"
            >
              <AddIcon /> Add Tag
            </Button>
          </div>
        )}
      </>
    ) : (
      <>
        {questionTags.length > 0 && renderTags(questionTags, true)}
        {organizationId && organizationTags.length > 0 && (
          <>
            <Typography variant="subtitle1" gutterBottom style={{ marginTop: '1rem' }}>Available Tags</Typography>
            {renderTags(organizationTags.filter(tag => !questionTags.some(qt => qt && qt.id === tag.id)))}
          </>
        )}
      </>
    );
  }, [mode, organizationId, questionId, organizationTags, questionTags, isAdmin, newTagName, renderTags, handleCreateTag]);

  return <div>{content}</div>;
});

TagManager.displayName = 'TagManager';

export default TagManager;
