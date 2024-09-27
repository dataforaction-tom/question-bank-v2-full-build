const colorMapping = {
  Poverty: 'border-dashed border-4 border-red-600 text-red-800',
  Health: 'border-dashed border-4 border-green-600 text-green-800',
  Education: 'border-dashed border-4 border-blue-600 text-blue-800',
  Environment: 'border-dashed border-4 border-teal-600 text-teal-800',
  Advice: 'border-dashed border-4 border-purple-600 text-purple-800',
  Open: 'border-double border-4 border-green-500 text-green-800',
  Closed: 'border-double border-4 border-red-500 text-red-800',
  'High Priority': 'border-double border-4 border-yellow-500 text-yellow-800',
  'Medium Priority': 'border-double border-4 border-orange-500 text-orange-800',
  'Low Priority': 'border-double border-4 border-blue-500 text-blue-800'
};

const defaultColors = [
  'border-double border-4 border-gray-200 text-gray-800',
  'border-double border-4 border-indigo-200 text-indigo-800',
  'border-double border-4 border-pink-200 text-pink-800',
  'border-double border-4 border-yellow-200 text-yellow-800',
  'border-double border-4 border-cyan-200 text-cyan-800'
];

export { colorMapping, defaultColors };
