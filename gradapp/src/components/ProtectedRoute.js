import { Navigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <h2>🔄 Checking authentication...</h2>; // Show a loading message while checking auth
  }

  return user ? children : <Navigate to="/login" />;
};

export default ProtectedRoute;
