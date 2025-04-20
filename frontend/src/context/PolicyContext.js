import React, { createContext, useState, useEffect, useContext } from 'react';
import { getPolicies } from '../services/policyService';
import { getDepartments } from '../services/departmentService';
import AuthContext from './AuthContext'; // Import AuthContext

const PolicyContext = createContext({});

export const PolicyProvider = ({ children }) => {
  const [policies, setPolicies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    needsUpdate: 0
  });
  
  // Get auth context to check authentication status and handle auth errors
  const { auth, logout } = useContext(AuthContext);

  const fetchPolicies = async () => {
    if (!auth?.accessToken) {
      console.log('No access token available, skipping policy fetch');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching policies...');
      
      const data = await getPolicies();
      console.log(`Retrieved ${data.length} policies`);
      setPolicies(data);
      
      // Calculate stats
      setStats({
        total: data.length,
        active: data.filter(p => p.status === 'ساري').length,
        needsUpdate: data.filter(p => p.needsUpdate).length
      });
    } catch (err) {
      console.error('Error fetching policies:', err);
      
      // Handle authentication errors
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError('Authentication error. Please log in again.');
        // Optionally log the user out on auth errors
        // logout();
      } else {
        setError('Failed to load policies. Please try again later.');
      }
      
      setPolicies([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    if (!auth?.accessToken) {
      console.log('No access token available, skipping departments fetch');
      return;
    }
    
    try {
      console.log('Fetching departments...');
      const data = await getDepartments();
      console.log(`Retrieved ${data.length} departments`);
      setDepartments(data);
    } catch (err) {
      console.error('Error fetching departments:', err);
      
      // Handle authentication errors
      if (err.response?.status === 401 || err.response?.status === 403) {
        // Authentication error already handled in fetchPolicies
      } else {
        console.error('Failed to load departments');
      }
      
      setDepartments([]);
    }
  };

  // Fetch data when auth changes
  useEffect(() => {
    console.log('Auth state changed, accessToken exists:', !!auth?.accessToken);
    
    if (auth?.accessToken) {
      fetchPolicies();
      fetchDepartments();
    } else {
      // Clear data when not authenticated
      setPolicies([]);
      setDepartments([]);
      setStats({
        total: 0,
        active: 0,
        needsUpdate: 0
      });
      setLoading(false);
    }
  }, [auth?.accessToken]);

  return (
    <PolicyContext.Provider value={{ 
      policies, 
      setPolicies, 
      departments, 
      setDepartments, 
      loading, 
      error,
      stats,
      refreshPolicies: fetchPolicies,
      refreshDepartments: fetchDepartments
    }}>
      {children}
    </PolicyContext.Provider>
  );
};

export default PolicyContext;