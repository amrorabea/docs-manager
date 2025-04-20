import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaFileAlt, FaBuilding, FaUsersCog, FaCog, FaUser } from 'react-icons/fa';
import useAuth from '../../hooks/useAuth';
import './Layout.css';

const Sidebar = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  
  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <div className="sidebar">
      <div className="sidebar-brand">
        <h2>مسار</h2>
      </div>
      
      <nav className="sidebar-nav">
        <ul className="nav-list">
          <li className="nav-item">
            <Link to="/" className={`nav-link ${isActive('/')}`}>
              <span className="nav-icon"><FaFileAlt /></span>
              <span className="nav-text">السياسات</span>
            </Link>
          </li>
          
          <li className="nav-item">
            <Link to="/departments" className={`nav-link ${isActive('/departments')}`}>
              <span className="nav-icon"><FaBuilding /></span>
              <span className="nav-text">الإدارات</span>
            </Link>
          </li>
          
          <li className="nav-item">
            <Link to="/users" className={`nav-link ${isActive('/users')}`}>
              <span className="nav-icon"><FaUsersCog /></span>
              <span className="nav-text">المستخدمين</span>
            </Link>
          </li>
          
          <li className="nav-item">
            <Link to="/settings" className={`nav-link ${isActive('/settings')}`}>
              <span className="nav-icon"><FaCog /></span>
              <span className="nav-text">الإعدادات</span>
            </Link>
          </li>
        </ul>
      </nav>
      
      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">
            <FaUser />
          </div>
          <div className="user-details">
            <div className="sidebar-user-name">{user?.name || 'مستخدم'}</div>
            <div className="user-role">{user?.role || 'admin'}</div>
          </div>
        </div>
        <button onClick={logout} className="sidebar-logout-btn">
          تسجيل خروج
        </button>
      </div>
    </div>
  );
};

export default Sidebar;