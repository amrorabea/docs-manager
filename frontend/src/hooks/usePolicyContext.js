import { useContext } from 'react';
import PolicyContext from '../context/PolicyContext';

/**
 * Custom hook to access policy context
 * This provides a consistent way to access policy data and methods
 */
export const usePolicyContext = () => {
  const context = useContext(PolicyContext);
  
  if (!context) {
    throw new Error('usePolicyContext must be used within a PolicyProvider');
  }
  
  return context;
};

export default usePolicyContext; 