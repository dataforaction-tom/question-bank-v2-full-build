const colorMapping = {
  Poverty: { bg: '#FEE2E2', border: '#DC2626', text: '#991B1B' },
  Health: { bg: '#D1FAE5', border: '#059669', text: '#065F46' },
  Education: { bg: '#DBEAFE', border: '#2563EB', text: '#1E40AF' },
  Environment: { bg: '#CCFBF1', border: '#0D9488', text: '#115E59' },
  Advice: { bg: '#E9D5FF', border: '#7C3AED', text: '#5B21B6' },
  Open: { bg: '#D1FAE5', border: '#10B981', text: '#065F46' },
  Closed: { bg: '#FEE2E2', border: '#EF4444', text: '#991B1B' },
  'High Priority': { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' },
  'Medium Priority': { bg: '#FFEDD5', border: '#F97316', text: '#9A3412' },
  'Low Priority': { bg: '#DBEAFE', border: '#3B82F6', text: '#1E40AF' }
};

const defaultColors = [
  { bg: '#F3F4F6', border: '#9CA3AF', text: '#4B5563' },
  { bg: '#E0E7FF', border: '#6366F1', text: '#4338CA' },
  { bg: '#FCE7F3', border: '#EC4899', text: '#9D174D' },
  { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' },
  { bg: '#CFFAFE', border: '#06B6D4', text: '#0E7490' }
];

export { colorMapping, defaultColors };