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
        backgroundColor: variant === 'outlined' ? 'transparent' : color.bg,
        color: color.text,
        border: `2px dashed ${color.border}`,
        fontWeight: 'bold',
        '&:hover': {
          backgroundColor: variant === 'outlined' ? 'rgba(0, 0, 0, 0.04)' : color.bg,
        },
      }}
    />
  );
};

export default ColorTag;
