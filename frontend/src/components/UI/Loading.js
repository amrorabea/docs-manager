import React from 'react';
import './UI.css';

/**
 * Standardized loading component for consistent UX across the application
 * @param {string} message - Optional custom loading message
 * @param {string} size - Size of the loading spinner (small, medium, large)
 */
const Loading = ({ message = 'جاري التحميل...', size = 'medium' }) => {
  return (
    <div className={`ui-loading ${size}`}>
      <div className="ui-loading-spinner"></div>
      <p className="ui-loading-text">{message}</p>
    </div>
  );
};

export default Loading; 