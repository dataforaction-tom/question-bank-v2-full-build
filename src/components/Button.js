import React from 'react';

const buttonTypes = {
  Action: 'bg-blue-600 hover:bg-blue-700 text-white',
  ChangeView: 'bg-purple-600 hover:bg-purple-700 text-white',
  Submit: 'bg-green-600 hover:bg-green-700 text-white',
  Confirm: 'bg-yellow-600 hover:bg-yellow-700 text-black',
  Cancel: 'bg-pink-600 hover:bg-pink-700 text-white',
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

  const baseClasses = 'font-bold rounded transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-opacity-50';
  const typeClasses = buttonTypes[type];
  const sizeClass = sizeClasses[size];
  const activeClass = !active ? 'bg-opacity-50' : '';

  const finalClassName = `${baseClasses} ${typeClasses} ${sizeClass} ${activeClass} ${className}`;
  
  // Log the final className
  console.log('Button classes:', finalClassName);

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