import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
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
  
  // Prevent duplicate API calls
  const fetchingPolicies = useRef(false);
  const fetchingDepartments = useRef(false);
  
  // Get auth context to check authentication status and handle auth errors
  const { auth, logout } = useContext(AuthContext);

  const fetchPolicies = async () => {
    if (!auth?.accessToken && !localStorage.getItem('accessToken')) {
      console.log('No access token available, skipping policy fetch');
      setLoading(false);
      return;
    }
    
    // Prevent duplicate calls
    if (fetchingPolicies.current) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Already fetching policies, skipping duplicate request');
      }
      return;
    }
    
    fetchingPolicies.current = true;
    
    try {
      setLoading(true);
      setError(null);
      if (process.env.NODE_ENV !== 'production') {
        console.log('Fetching policies...');
      }
      
      const data = await getPolicies();
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Retrieved ${data.length} policies`);
      }
      setPolicies(data);
      
      // Calculate stats
      updateStats(data);
    } catch (err) {
      // Skip error handling for canceled requests
      if (err.isCanceled) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('Policy fetch request was canceled');
        }
        return;
      }
      
      console.error('Error fetching policies:', err);
      
      // Handle authentication errors and provide user-friendly feedback
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError('ليس لديك صلاحية أو انتهت الجلسة. يرجى تسجيل الدخول مجددًا.');
        // Optionally log the user out on auth errors
        // logout();
      } else {
        setError('فشل تحميل السياسات. يرجى المحاولة لاحقًا.');
      }
      
      setPolicies([]);
    } finally {
      setLoading(false);
      fetchingPolicies.current = false;
    }
  };

  // New function for searching policies
  const handleSearch = async (query, departmentId = null) => {
    if (!auth?.accessToken && !localStorage.getItem('accessToken')) {
      console.log('No access token available, skipping policy search');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Searching policies with query: "${query}", departmentId: ${departmentId || 'none'}`);
      }
      
      const data = await searchPolicies(query, departmentId);
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Retrieved ${data.length} policies from search`);
        if (data.length === 0) {
          console.log('No search results found - this will display "لا توجد نتائج مطابقة للبحث"');
        }
      }
      setPolicies(data);
      
      // Update stats for the search results
      updateStats(data);
    } catch (err) {
      // Skip error handling for canceled requests
      if (err.isCanceled) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('Policy search request was canceled');
        }
        return;
      }
      
      console.error('Error searching policies:', err);
      
      // Handle authentication errors and provide user-friendly feedback
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError('ليس لديك صلاحية أو انتهت الجلسة. يرجى تسجيل الدخول مجددًا.');
      } else {
        setError('فشل البحث في السياسات. يرجى المحاولة لاحقًا.');
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
    if (!auth?.accessToken && !localStorage.getItem('accessToken')) {
      console.log('No access token available, skipping departments fetch');
      return;
    }
    
    // Prevent duplicate calls
    if (fetchingDepartments.current) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Already fetching departments, skipping duplicate request');
      }
      return;
    }
    
    fetchingDepartments.current = true;
    
    try {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Fetching departments...');
      }
      const data = await getDepartments();
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Retrieved ${data.length} departments`);
      }
      setDepartments(data);
    } catch (err) {
      // Skip error handling for canceled requests
      if (err.isCanceled) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('Department fetch request was canceled');
        }
        return;
      }
      
      console.error('Error fetching departments:', err);
      
      // Handle authentication errors
      if (err.response?.status === 401 || err.response?.status === 403) {
        // Authentication error already handled in fetchPolicies
      } else {
        console.error('Failed to load departments');
      }
      
      setDepartments([]);
    } finally {
      fetchingDepartments.current = false;
    }
  };

  // Fetch data when auth changes
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('Auth state changed, accessToken exists:', !!auth?.accessToken);
    }
    
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
    
    // Cleanup function to handle component unmount
    return () => {
      // Nothing to clean up, but could cancel any pending requests here
    };
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