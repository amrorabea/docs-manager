import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import './Layout.css';

const Sidebar = () => {
  const { auth } = useAuth();
  const [expandedMenus, setExpandedMenus] = useState({
    policies: true,
    departments: false,
    users: false
  });

  const toggleMenu = (menu) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menu]: !prev[menu]
    }));
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <h2>مسار</h2>
      </div>
      
      <nav className="sidebar-nav">
        <ul className="nav-list">
          {/* Dashboard */}
          <li className="nav-item">
            <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              <span className="nav-icon">📊</span>
              <span className="nav-text">لوحة المعلومات</span>
            </NavLink>
          </li>
          
          {/* Policies Section */}
          <li className="nav-item">
            <div 
              className={`nav-section-header ${expandedMenus.policies ? 'expanded' : ''}`}
              onClick={() => toggleMenu('policies')}
            >
              <div className="nav-section-title">
                <span className="nav-icon">📄</span>
                <span className="nav-text">السياسات</span>
              </div>
              <span className="expand-icon">▼</span>
            </div>
            
            {expandedMenus.policies && (
              <ul className="nav-submenu">
                <li className="nav-subitem">
                  <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-sublink active' : 'nav-sublink'}>
                    <span className="nav-text">عرض السياسات</span>
                  </NavLink>
                </li>
                <li className="nav-subitem">
                  <NavLink to="/add-policy" className={({ isActive }) => isActive ? 'nav-sublink active' : 'nav-sublink'}>
                    <span className="nav-text">إضافة سياسة</span>
                  </NavLink>
                </li>
              </ul>
            )}
          </li>
          
          {/* Departments Section */}
          <li className="nav-item">
            <div 
              className={`nav-section-header ${expandedMenus.departments ? 'expanded' : ''}`}
              onClick={() => toggleMenu('departments')}
            >
              <div className="nav-section-title">
                <span className="nav-icon">🏢</span>
                <span className="nav-text">الإدارات</span>
              </div>
              <span className="expand-icon">▼</span>
            </div>
            
            {expandedMenus.departments && (
              <ul className="nav-submenu">
                <li className="nav-subitem">
                  <NavLink to="/departments" className={({ isActive }) => isActive ? 'nav-sublink active' : 'nav-sublink'}>
                    <span className="nav-text">إدارة الإدارات</span>
                  </NavLink>
                </li>
              </ul>
            )}
          </li>
          
          {/* Users Section - Only for admins */}
          {auth?.user?.role === 'admin' && (
            <li className="nav-item">
              <div 
                className={`nav-section-header ${expandedMenus.users ? 'expanded' : ''}`}
                onClick={() => toggleMenu('users')}
              >
                <div className="nav-section-title">
                  <span className="nav-icon">👥</span>
                  <span className="nav-text">المستخدمين</span>
                </div>
                <span className="expand-icon">▼</span>
              </div>
              
              {expandedMenus.users && (
                <ul className="nav-submenu">
                  <li className="nav-subitem">
                    <NavLink to="/users" className={({ isActive }) => isActive ? 'nav-sublink active' : 'nav-sublink'}>
                      <span className="nav-text">إدارة المستخدمين</span>
                    </NavLink>
                  </li>
                </ul>
              )}
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
            {auth?.user?.fullName?.charAt(0) || auth?.user?.username?.charAt(0) || 'U'}
          </div>
          <div className="user-details">
            <div className="user-name">{auth?.user?.fullName || auth?.user?.username}</div>
            <div className="user-role">{auth?.user?.role === 'admin' ? 'مدير النظام' : 'مستخدم'}</div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;