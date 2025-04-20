import React, { createContext, useState, useEffect, useContext } from 'react';
import { getPolicies, searchPolicies } from '../services/policyService';
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
    expired: 0,
    draft: 0
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
      updateStats(data);
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

  // New function for searching policies
  const handleSearch = async (query, departmentId = null) => {
    if (!auth?.accessToken) {
      console.log('No access token available, skipping policy search');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      console.log(`Searching policies with query: "${query}", departmentId: ${departmentId || 'none'}`);
      
      const data = await searchPolicies(query, departmentId);
      console.log(`Retrieved ${data.length} policies from search`);
      if (data.length === 0) {
        console.log('No search results found - this will display "لا توجد نتائج مطابقة للبحث"');
      }
      setPolicies(data);
      
      // Update stats for the search results
      updateStats(data);
    } catch (err) {
      console.error('Error searching policies:', err);
      
      // Handle authentication errors
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError('Authentication error. Please log in again.');
      } else {
        setError('Failed to search policies. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper function to update stats
  const updateStats = (policyData) => {
    setStats({
      total: policyData.length,
      active: policyData.filter(p => p.status === 'valid').length,
      expired: policyData.filter(p => p.status === 'expired').length,
      draft: policyData.filter(p => p.status === 'draft').length
    });
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
        expired: 0,
        draft: 0
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
      refreshDepartments: fetchDepartments,
      searchPolicies: handleSearch
    }}>
      {children}
    </PolicyContext.Provider>
  );
};

export default PolicyContext;