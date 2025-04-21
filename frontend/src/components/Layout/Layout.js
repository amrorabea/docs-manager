import React from 'react';
import { Outlet } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import Sidebar from './Sidebar';
import './Layout.css';

const Layout = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <div className={`layout ${isAdmin ? 'with-sidebar' : ''}`}>
      {isAdmin && <Sidebar />}
      <div className="layout-container">
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;