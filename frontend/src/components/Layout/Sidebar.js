import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import './Layout.css';

const Sidebar = () => {
  // Get auth from custom hook
  const { auth, isAdmin } = useAuth();
  
  // For debugging - remove in production
  useEffect(() => {
    console.log('Auth in Sidebar:', auth);
    console.log('Is admin?', isAdmin);
  }, [auth, isAdmin]);
  
  const [expandedMenus, setExpandedMenus] = useState({
    policies: true,
    departments: false,
    users: false
  });

  const toggleMenu = (menu, e) => {
    // If inside a NavLink, prevent navigation
    if (e) {
      e.stopPropagation();
    }
    
    setExpandedMenus(prev => ({
      ...prev,
      [menu]: !prev[menu]
    }));
  };
  // Fallback values for user display
  const userInitial = auth?.user?.fullName?.charAt(0) || 
                     auth?.user?.username?.charAt(0) || 
                     'U';
                     
  const userName = auth?.user?.fullName || 
                  auth?.user?.username || 
                  'مستخدم';
                  
  // const userRole = auth?.user?.role === 'admin' ? 'مدير النظام' : 'مستخدم';
  const userRole = 'admin';

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <h2>مسار</h2>
      </div>
      
      <nav className="sidebar-nav">
        <ul className="nav-list">
          
          {/* Policies Section */}
          <li className="nav-item">
            <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-sublink active' : 'nav-sublink'}>
              <div className="nav-section-title">
                <span className="nav-icon">📄</span>
                <span className="nav-text">السياسات</span>
              </div>
            </NavLink>
          </li>
          
          {/* Departments Section */}
          <li className="nav-item">
            <NavLink to="/departments" className={({ isActive }) => isActive ? 'nav-sublink active' : 'nav-sublink'}>
              <div className="nav-section-title">
                <span className="nav-icon">🏢</span>
                <span className="nav-text">الإدارات</span>
              </div>
            </NavLink>
          </li>
          
          {/* Users Section - Only for admins */}
          {isAdmin && (
            <li className="nav-item">
              <NavLink to="/users" className={({ isActive }) => isActive ? 'nav-sublink active' : 'nav-sublink'}>
                <div className="nav-section-title">
                  <span className="nav-icon">👥</span>
                  <span className="nav-text">المستخدمين</span>
                </div>
              </NavLink>
            </li>
          )}
          
          {/* Settings */}
          <li className="nav-item">
            <NavLink to="/settings" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              <span className="nav-icon">⚙️</span>
              <span className="nav-text">الإعدادات</span>
            </NavLink>
          </li>
        </ul>
      </nav>
      
      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">
            {userInitial}
          </div>
          <div className="user-details">
            <div className="user-name">{userName}</div>
            <div className="user-role">{userRole}</div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;