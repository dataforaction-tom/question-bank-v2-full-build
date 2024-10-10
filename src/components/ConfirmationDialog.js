import React from 'react';
import { 
  Dialog, 
  DialogActions, 
  DialogContent, 
  DialogContentText, 
  DialogTitle, 
  Button,
  Typography,
  Box,
} from '@mui/material';
import { styled } from '@mui/material/styles';

const ColorBand = styled(Box)({
  height: 8,
  backgroundColor: '#6a7efc',
});

const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialogContent-root': {
    padding: theme.spacing(3),
  },
  '& .MuiDialogActions-root': {
    padding: theme.spacing(2),
  },
}));

const StyledDialogTitle = styled(DialogTitle)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  padding: theme.spacing(2),
}));

const ConfirmButton = styled(Button)(({ theme }) => ({
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

const ConfirmationDialog = ({ open, onClose, onConfirm, title, message }) => {
  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
      maxWidth="sm"
      fullWidth
    >
      <ColorBand />
      <StyledDialogTitle id="alert-dialog-title">
        <Typography variant="h6">{title}</Typography>
      </StyledDialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <CancelButton onClick={onClose} variant="contained">
          No
        </CancelButton>
        <ConfirmButton onClick={onConfirm} variant="contained" autoFocus>
          Yes
        </ConfirmButton>
      </DialogActions>
    </StyledDialog>
  );
};

export default ConfirmationDialog;
