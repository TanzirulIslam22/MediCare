import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../layouts/Layout';
import { Spinner } from '../components/ui';

export function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner />;

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  if (roles && !roles.includes(user.role)) {
    const home = {
      PATIENT: '/patient',
      DOCTOR: '/doctor',
      RECEPTIONIST: '/reception',
      PHARMACIST: '/pharmacy',
      ADMIN: '/admin',
    }[user.role];
    return <Navigate to={home} replace />;
  }

  return <Layout />;
}
