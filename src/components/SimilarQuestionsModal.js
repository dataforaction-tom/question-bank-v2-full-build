import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';

const SimilarQuestionsModal = ({ open, onClose, similarQuestions, onSelectQuestion, onSubmitOriginal }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Similar Questions Found</DialogTitle>
      <DialogContent>
        <Typography>
          We found some similar questions. Would you like to use one of these instead?
        </Typography>
        <List>
          {similarQuestions.map((question) => (
            <ListItem 
              button 
              key={question.id} 
              onClick={() => onSelectQuestion(question)}
            >
              <ListItemText 
                primary={question.content} 
                secondary={`Similarity: ${(question.similarity * 100).toFixed(2)}%`} 
              />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onSubmitOriginal} color="primary">
          Submit My Original Question
        </Button>
        <Button onClick={onClose} color="secondary">
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SimilarQuestionsModal;
