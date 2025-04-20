import React from 'react';
import './UI.css';

/**
 * Standardized status badge component for consistent UX across the application
 * @param {string} status - The status value (valid, expired, draft)
 * @param {object} customLabels - Optional custom labels for each status
 */
const StatusBadge = ({ 
  status, 
  customLabels = {
    valid: 'ساري',
    expired: 'منتهي',
    draft: 'مسودة'
  }
}) => {
  return (
    <span className={`ui-status-badge ${status}`}>
      {customLabels[status] || status}
    </span>
  );
};

export default StatusBadge; 