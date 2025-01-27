import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const AuthRoute = ({ children }) => {
  const { session } = useAuth();

  if (!session) {
    return <Navigate to='/signin' replace />;
  }

  return children;
};

export default AuthRoute;
