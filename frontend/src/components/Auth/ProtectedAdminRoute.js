import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { useEffect } from 'react';
import axios from '../../services/api';

const ProtectedAdminRoute = () => {
  const { user, isAdmin, loading, logout } = useAuth();
  const location = useLocation();

  // Enhanced security: If user is not admin, log the attempt and potentially logout
  useEffect(() => {
    // Check if user is loaded but not an admin
    if (!loading && user && !isAdmin) {
      // Log suspicious activity attempt to console
      console.warn('Security alert: Non-admin user attempted to access admin route:', {
        path: location.pathname,
        user: user.email,
        timestamp: new Date().toISOString(),
      });
      
      // Option: Log security event to backend for monitoring
      try {
        axios.post('/api/security/log-event', {
          type: 'UNAUTHORIZED_ACCESS',
          details: {
            path: location.pathname,
            user: user.email,
          }
        }).catch(err => console.error('Failed to log security event', err));
      } catch (error) {
        // Silent catch - don't disrupt the UI flow
      }
      
      // Option: Auto-logout on suspicious behavior (uncomment if needed)
      // setTimeout(() => logout(), 3000);
    }
  }, [user, isAdmin, loading, location, logout]);

  // While loading, show nothing to prevent flash of content
  if (loading) {
    return null;
  }

  // If user is not authenticated or not an admin, redirect to home
  if (!user || !isAdmin) {
    // Store the location they tried to access for potential logging purposes
    sessionStorage.setItem('unauthorized_access_attempt', location.pathname);
    
    return <Navigate to="/" state={{ 
      from: location,
      securityMessage: 'You do not have permission to access this area.' 
    }} replace />;
  }

  // If user is admin, render the protected routes
  return <Outlet />;
};

export default ProtectedAdminRoute;