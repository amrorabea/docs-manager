import React from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import './Layout.css';

const Header = () => {
  const { auth, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <header className="header">
      <div className="header-container">
        <div className="logo">
          <Link to="/">
            <h1>مسار</h1>
          </Link>
        </div>
        
        <div className="header-actions">
          {auth?.user && (
            <div className="user-info">
              <span className="user-name">{auth.user.fullName || auth.user.username}</span>
              <button onClick={handleLogout} className="logout-btn">تسجيل خروج</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;