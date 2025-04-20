import React from 'react';
import './UI.css';

const Card = ({ children, className = '', ...props }) => {
  const cardClasses = `ui-card ${className}`;
  
  return (
    <div className={cardClasses} {...props}>
      {children}
    </div>
  );
};

export default Card;