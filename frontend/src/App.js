import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PolicyProvider } from './context/PolicyContext';
import Layout from './components/Layout/Layout';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import PolicyList from './components/Policy/PolicyList';
import PolicyForm from './components/Policy/PolicyForm';
import DepartmentList from './components/Department/DepartmentList';
import RequireAuth from './components/Auth/RequireAuth';
import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <PolicyProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route element={<RequireAuth />}>
              <Route path="/" element={<Layout />}>
                <Route index element={<PolicyList />} />
                <Route path="add-policy" element={<PolicyForm />} />
                <Route path="edit-policy/:id" element={<PolicyForm />} />
                <Route path="departments" element={<DepartmentList />} />
              </Route>
            </Route>
          </Routes>
        </PolicyProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;