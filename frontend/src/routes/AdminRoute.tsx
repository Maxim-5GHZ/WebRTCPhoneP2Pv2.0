import { Navigate, Outlet } from 'react-router-dom';
import { useAuthContext } from '../hooks/useAuth';

const AdminRoute = () => {
  const { isAdmin, loading } = useAuthContext();

  if (loading) {
    // You can return a loading spinner here
    return <div>Loading...</div>;
  }

  return isAdmin ? <Outlet /> : <Navigate to="/" />;
};

export default AdminRoute;
