import React from 'react';
import './UI.css';

/**
 * Standardized error message component for consistent UX across the application
 * @param {string} message - The error message to display
 * @param {function} onRetry - Optional retry function
 */
const ErrorMessage = ({ message = 'حدث خطأ، يرجى المحاولة مرة أخرى', onRetry }) => {
  return (
    <div className="ui-error">
      <p className="ui-error-text">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="ui-button secondary small">
          إعادة المحاولة
        </button>
      )}
    </div>
  );
};

export default ErrorMessage; 