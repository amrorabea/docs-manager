import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PolicyProvider } from './context/PolicyContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/Layout/Layout';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import PolicyList from './components/Policy/PolicyList';
import PolicyForm from './components/Policy/PolicyForm';
import DepartmentList from './components/Department/DepartmentList';
import RequireAuth from './components/Auth/RequireAuth';
import Users from './components/User/Users';
import UserDetails from './components/User/UserDetails';
import Settings from './components/Settings/Settings';
import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <PolicyProvider>
          <ToastProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route element={<RequireAuth />}>
                <Route path="/" element={<Layout />}>
                  <Route index element={<PolicyList />} />
                  <Route path="add-policy" element={<PolicyForm />} />
                  <Route path="edit-policy/:id" element={<PolicyForm />} />
                  <Route path="departments" element={<DepartmentList />} />
                  <Route path="/users" element={<Users />} />
                  <Route path="/users/:email" element={<UserDetails />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>
              </Route>
            </Routes>
          </ToastProvider>
        </PolicyProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;