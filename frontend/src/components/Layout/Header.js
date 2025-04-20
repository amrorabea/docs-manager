import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import './Layout.css';

const Header = () => {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      // After logout, redirect to login page
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Get user display name with fallback
  const userDisplayName = auth?.user?.fullName || auth?.user?.username || 'User';
  
  // Check if user is logged in
  const isLoggedIn = !!auth?.accessToken && !!auth?.user;

  return (
    <header className="header">
      <div className="header-container">
        <div className="logo">
          <Link to="/">
            <h1>مسار</h1>
          </Link>
        </div>
        
        <div className="header-actions">
          {isLoggedIn ? (
            <div className="user-info">
              <span className="user-name">{userDisplayName}</span>
              <button 
                onClick={handleLogout} 
                className="logout-btn"
                aria-label="تسجيل خروج"
              >
                تسجيل خروج
              </button>
            </div>
          ) : (
            <Link to="/login" className="login-link">
              تسجيل الدخول
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;