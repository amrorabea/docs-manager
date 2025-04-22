import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

const ProtectedAdminRoute = () => {
  const { user } = useAuth();
  const location = useLocation();

  if (user?.role !== 'admin') {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default ProtectedAdminRoute;