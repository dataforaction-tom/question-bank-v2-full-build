import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Card,
  CardContent,
  Box,
  styled,
} from '@mui/material';

const StyledCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  cursor: 'pointer',
  '&:hover': {
    boxShadow: theme.shadows[3],
  },
}));

const ColorBand = styled(Box)({
  height: 8,
  backgroundColor: '#6a7efc',
});

const SubmitButton = styled(Button)(({ theme }) => ({
  backgroundColor: '#f860b1',
  color: 'white',
  '&:hover': {
    backgroundColor: '#d14d93',
  },
  borderRadius: theme.shape.borderRadius,
}));

const CancelButton = styled(Button)(({ theme }) => ({
  backgroundColor: '#e0e0e0',
  color: '#333',
  '&:hover': {
    backgroundColor: '#c0c0c0',
  },
  borderRadius: theme.shape.borderRadius,
}));

const SimilarQuestionsModal = ({ open, onClose, similarQuestions, onSelectQuestion, onSubmitOriginal }) => {
  console.log('Modal open:', open);
  console.log('Similar questions in modal:', similarQuestions);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Similar Questions Found</DialogTitle>
      <DialogContent>
        <Typography gutterBottom>
          We found some similar questions. Would you like to use one of these instead?
        </Typography>
        {similarQuestions.map((question) => (
          <StyledCard key={question.id} onClick={() => onSelectQuestion(question)}>
            <ColorBand />
            <CardContent>
              <Typography variant="body1">{question.content}</Typography>
              <Typography variant="caption" color="textSecondary">
                Similarity: {(question.similarity * 100).toFixed(2)}%
              </Typography>
            </CardContent>
          </StyledCard>
        ))}
      </DialogContent>
      <DialogActions>
        <SubmitButton onClick={onSubmitOriginal} variant="contained">
          Submit My Original Question
        </SubmitButton>
        <CancelButton onClick={onClose} variant="contained">
          Cancel
        </CancelButton>
      </DialogActions>
    </Dialog>
  );
};

export default SimilarQuestionsModal;
