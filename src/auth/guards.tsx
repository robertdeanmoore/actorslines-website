import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

export function RequireAuth() {
  const { session, profile, loading, needsMfa } = useAuth();
  const location = useLocation();
  if (loading) return <p className="p-8 text-center text-gray-500">Loading…</p>;
  if (!session || needsMfa)
    return <Navigate to="/login" state={{ from: location }} replace />;
  if (!profile) return <p className="p-8 text-center text-gray-500">Loading profile…</p>;
  return <Outlet />;
}

export function RequireAdmin() {
  const { profile, loading } = useAuth();
  if (loading) return <p className="p-8 text-center text-gray-500">Loading…</p>;
  if (profile?.role !== "admin") return <Navigate to="/" replace />;
  return <Outlet />;
}
