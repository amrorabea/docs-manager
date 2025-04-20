import React from 'react';
import './UI.css';

/**
 * Standardized empty state component for consistent UX across the application
 * @param {string} message - The message to display when no data is available
 * @param {ReactNode} icon - Optional icon to display
 * @param {ReactNode} action - Optional action button or link
 */
const EmptyState = ({ message = 'لا توجد بيانات متاحة', icon, action }) => {
  return (
    <div className="ui-empty-state">
      {icon && <div className="ui-empty-state-icon">{icon}</div>}
      <p className="ui-empty-state-text">{message}</p>
      {action && <div className="ui-empty-state-action">{action}</div>}
    </div>
  );
};

export default EmptyState; 