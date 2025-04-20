import React from 'react';
import Card from '../UI/Card';
import useAuth from '../../hooks/useAuth';
import { Link } from 'react-router-dom';
import './Layout.css';

/**
 * Standardized page layout component for consistent structure across the application
 * @param {string} title - Page title
 * @param {ReactNode} children - Page content
 * @param {ReactNode} actions - Optional action buttons for the header
 * @param {boolean} showHeader - Whether to show the user header
 */
const PageLayout = ({ 
  title, 
  children, 
  actions,
  showHeader = true
}) => {
  const { user, logout } = useAuth();
  
  return (
    <Card className="page-layout">
      <div className="page-layout-header">
        <h2 className="page-title">{title}</h2>
        {actions && <div className="page-actions">{actions}</div>}
      </div>
      
      {showHeader && (
        <header className="user-header">
          <div className="user-menu">
            <span className="user-name">{user?.name || 'المستخدم'}</span>
            <button onClick={logout} className="logout-btn">تسجيل خروج</button>
          </div>
        </header>
      )}
      
      <div className="page-content">
        {children}
      </div>
    </Card>
  );
};

export default PageLayout; 