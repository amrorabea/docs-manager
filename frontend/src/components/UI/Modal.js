import React, { useEffect } from 'react';
import './UI.css';

const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer,
  size = 'medium',
  className = '' 
}) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  const modalClasses = `ui-modal-size-${size} ${className}`;
  
  return (
    <div className="ui-modal-overlay" onClick={onClose}>
      <div className={`ui-modal ${modalClasses}`} onClick={(e) => e.stopPropagation()}>
        <div className="ui-modal-header">
          <h3 className="ui-modal-title">{title}</h3>
          <button className="ui-modal-close" onClick={onClose}>&times;</button>
        </div>
        
        <div className="ui-modal-body">
          {children}
        </div>
        
        {footer && (
          <div className="ui-modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;