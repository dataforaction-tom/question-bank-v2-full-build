import React from 'react';
import { Button as MuiButton } from '@mui/material';
import Button from './Button';

const MaterialButtonWrapper = ({ variant, color, ...props }) => {
  const getType = () => {
    if (variant === 'contained' && color === 'primary') return 'Action';
    if (variant === 'contained' && color === 'secondary') return 'Submit';
    if (variant === 'outlined') return 'Cancel';
    return 'Action';
  };

  return <Button type={getType()} {...props} />;
};

export default MaterialButtonWrapper;
