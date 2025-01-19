import React from 'react';

const buttonTypes = {
  Action: 'bg-gradient-to-r from-slate-950 to-sky-900 hover:bg-blue-700 text-white rounded-xl',
  ChangeView: 'bg-sky-800 hover:bg-pink-600 text-white rounded-xl',
  Submit: 'bg-gradient-to-r from-slate-950 to-sky-900 text-white rounded-xl  ',
  Confirm: 'bg-yellow-600 hover:bg-yellow-700 text-black rounded-xl',
  Cancel: 'bg-red-600 hover:bg-red-700 text-white rounded-xl',
  Respond: 'bg-teal-500 hover:bg-teal-600 text-white rounded-xl',
};

const Button = ({ 
  type = 'Action', 
  size = 'md', 
  className = '', 
  active = false,
  children, 
  ...props 
}) => {
  const sizeClasses = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  };

  const baseClasses = 'font-bold rounded transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-opacity-50 bg-opacity-40 ';
  const typeClasses = buttonTypes[type];
  const sizeClass = sizeClasses[size];
  const activeClass = !active ? 'bg-opacity-80 ' : '';

  const finalClassName = `${baseClasses} ${typeClasses} ${sizeClass} ${activeClass} ${className}`;
  
  

  return (
    <button
      className={finalClassName}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
