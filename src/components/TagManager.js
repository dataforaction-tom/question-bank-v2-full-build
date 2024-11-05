import React, { useState, useEffect } from 'react';
import { Chip, TextField, Typography, Grid } from '@mui/material';
import Button from './Button';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { supabase } from '../supabaseClient';

const TagManager = ({ questionId, organizationId, isAdmin = false, mode = 'question' }) => {
  const [newTagName, setNewTagName] = useState('');
  const [organizationTags, setOrganizationTags] = useState([]);
  const [questionTags, setQuestionTags] = useState([]);

  useEffect(() => {
    if (organizationId) {
      fetchOrganizationTags();
    }
    if (questionId) {
      fetchQuestionTags();
    }
  }, [organizationId, questionId]);

  const fetchOrganizationTags = async () => {
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
  };

  const fetchQuestionTags = async () => {
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
  };

  const handleCreateTag = async () => {
    if (newTagName.trim() && mode === 'manage' && organizationId) {
      const { data, error } = await supabase
        .from('tags')
        .insert({ name: newTagName.trim(), organization_id: organizationId })
        .select();
      if (error) {
        console.error('Error creating tag:', error);
      } else {
        setOrganizationTags([...organizationTags, data[0]]);
        setNewTagName('');
      }
    }
  };

  const handleDeleteTag = async (tagId) => {
    if (mode === 'manage' && organizationId) {
      const { error } = await supabase
        .from('tags')
        .delete()
        .match({ id: tagId, organization_id: organizationId });
      if (error) {
        console.error('Error deleting tag:', error);
      } else {
        setOrganizationTags(organizationTags.filter(tag => tag.id !== tagId));
      }
    }
  };

  const handleAddTagToQuestion = async (tagId) => {
    if (!questionId) return;
    const { error } = await supabase
      .from('question_tags')
      .insert({ question_id: questionId, tag_id: tagId });
    if (error) {
      console.error('Error adding tag to question:', error);
    } else {
      fetchQuestionTags();
    }
  };

  const handleRemoveTagFromQuestion = async (tagId) => {
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
  };

  const renderTags = (tags, isQuestionTag = false) => (
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
  );

  if (!organizationId && !questionId) {
    return <Typography>No tags available for this question</Typography>;
  }

  return (
    <div>
      {mode === 'manage' ? (
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
          {questionTags.length > 0 && (
            <>
              {renderTags(questionTags, true)}
            </>
          )}
          {organizationId && organizationTags.length > 0 && (
            <>
              <Typography variant="subtitle1" gutterBottom style={{ marginTop: '1rem' }}>Available Tags</Typography>
              {renderTags(organizationTags.filter(tag => !questionTags.some(qt => qt && qt.id === tag.id)))}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default TagManager;
