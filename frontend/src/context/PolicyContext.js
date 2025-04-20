import React, { createContext, useState, useEffect } from 'react';
import { getPolicies } from '../services/policyService';
import { getDepartments } from '../services/departmentService';

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

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const data = await getPolicies();
      setPolicies(data);
      
      // Calculate stats
      setStats({
        total: data.length,
        active: data.filter(p => p.status === 'ساري').length,
        needsUpdate: data.filter(p => p.needsUpdate).length
      });
    } catch (err) {
      console.error('Error fetching policies:', err);
      setError('Failed to load policies');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const data = await getDepartments();
      setDepartments(data);
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  };

  useEffect(() => {
    fetchPolicies();
    fetchDepartments();
  }, []);

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