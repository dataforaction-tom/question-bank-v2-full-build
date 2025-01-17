const ResponseTypePill = ({ type, manualRank, kanbanStatus }) => {
    const typeStyles = {
      answer: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        label: 'Answer'
      },
      partial_answer: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        label: 'Partial Answer'
      },
      way_of_answering: {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        label: 'Way of Answering'
      },
      other: {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        label: 'Other'
      }
    };
  
    const rankStyles = {
      bg: 'bg-purple-100',
      text: 'text-purple-800'
    };
  
    const kanbanStyles = {
      'Now': { bg: 'bg-pink-100', text: 'text-pink-800' },
      'Next': { bg: 'bg-orange-100', text: 'text-orange-800' },
      'Future': { bg: 'bg-green-100', text: 'text-green-800' },
      'Parked': { bg: 'bg-blue-100', text: 'text-blue-800' },
      'No Action': { bg: 'bg-teal-100', text: 'text-teal-800' }
    };
  
    const style = typeStyles[type] || typeStyles.other;
    const kanbanStyle = kanbanStyles[kanbanStatus] || { bg: 'bg-gray-100', text: 'text-gray-800' };
  
    return (
      <div className="flex gap-2">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
          {style.label}
        </span>
        {manualRank && (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${rankStyles.bg} ${rankStyles.text}`}>
            Rank #{manualRank}
          </span>
        )}
        {kanbanStatus && (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${kanbanStyle.bg} ${kanbanStyle.text}`}>
            {kanbanStatus}
          </span>
        )}
      </div>
    );
  };

  export default ResponseTypePill;