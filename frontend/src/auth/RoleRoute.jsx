import { Navigate } from "react-router-dom";
import { useAuth } from "./auth-context";
import Spinner from "../components/Spinner";

const RoleRoute = ({ roles, permission, children }) => {
  const { isAuthenticated, user, loading, hasPermission } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <Spinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (
    !roles.includes(user?.role) &&
    !(permission && hasPermission(permission))
  ) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default RoleRoute;