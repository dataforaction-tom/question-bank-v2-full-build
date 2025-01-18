import React from 'react';
import { Chip } from '@mui/material';
import { colorMapping, defaultColors } from '../utils/colorMapping';

const ColorTag = ({ category, variant = 'default' }) => {
  const getCategoryColor = (category) => {
    return colorMapping[category] || defaultColors[0];
  };

  const color = getCategoryColor(category);

  return (
    <Chip
      label={category}
      sx={{
        backgroundColor: 'transparent',
        color: '#0f172a',
        border: `2px solid ${color.border}`,
        fontWeight: 'bold',
        '&:hover': {
          backgroundColor: 'rgba(0, 0, 0, 0.04)',
        },
      }}
    />
  );
};

export default ColorTag;
