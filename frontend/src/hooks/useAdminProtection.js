import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuth from './useAuth';
import axios from '../services/api';

/**
 * Enhanced hook to protect admin routes from direct URL access
 * Provides stronger security with additional verification
 */
const useAdminProtection = () => {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [verified, setVerified] = useState(false);

  // Primary protection - client-side role check
  useEffect(() => {
    // Only run after auth state is loaded
    if (!loading) {
      // If user is not admin or not authenticated, redirect to home
      if (!user || !isAdmin) {
        console.warn('Security: Unauthorized access attempt to admin route:', {
          path: location.pathname,
          user: user?.email || 'unauthenticated',
          timestamp: new Date().toISOString()
        });
        
        // Track access attempts for security monitoring
        if (user) {
          try {
            axios.post('/api/security/log-event', {
              type: 'DIRECT_URL_ACCESS',
              details: {
                path: location.pathname,
                user: user.email,
              }
            }).catch(err => console.error('Failed to log security event', err));
          } catch (error) {
            // Silent catch
          }
        }
        
        // Immediate redirect with security message
        navigate('/', { 
          replace: true,
          state: { securityMessage: 'Access denied. This event has been logged.' } 
        });
      } else {
        // User has admin role, they're verified
        setVerified(true);
      }
    }
  }, [user, isAdmin, loading, navigate, location]);

  // Secondary protection - verify admin status with server if needed
  useEffect(() => {
    // If the token could be compromised, verify with the server
    const verifyAdminWithServer = async () => {
      if (user && isAdmin && !verified) {
        try {
          const response = await axios.get('/api/users/verify-admin');
          if (!response.data.isAdmin) {
            console.error('Server rejected admin status');
            navigate('/', { replace: true });
          } else {
            setVerified(true);
          }
        } catch (error) {
          console.error('Failed to verify admin status with server');
          navigate('/', { replace: true });
        }
      }
    };
    
    // Uncomment to enable double-verification with server
    // verifyAdminWithServer();
  }, [user, isAdmin, verified, navigate]);

  return { 
    hasAccess: !loading && user && isAdmin && verified,
    loading: loading || (user && isAdmin && !verified)
  };
};

export default useAdminProtection; 