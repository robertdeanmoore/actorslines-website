import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { isNightTheme } from "../lib/theme";
import { Container } from "../components/ui/Layout";
import { ErrorState, LoadingState } from "../components/ui/States";

export function RequireAuth() {
  const { session, profile, loading, needsMfa, error, retry } = useAuth();
  const location = useLocation();
  const night = isNightTheme();
  if (loading)
    return night ? (
      <Container size="detail">
        <LoadingState label="Loading..." />
      </Container>
    ) : (
      <p className="p-8 text-center text-gray-500">Loading…</p>
    );
  if (error)
    return (
      <Container size="detail">
        <ErrorState
          title="Could not load your account"
          message={error}
          onRetry={() => void retry()}
        />
        <p className="mt-4 text-center">
          <Link to="/login" state={{ from: location }}>Sign in again</Link>
        </p>
      </Container>
    );
  if (!session || needsMfa)
    return <Navigate to="/login" state={{ from: location }} replace />;
  if (!profile)
    return night ? (
      <Container size="detail">
        <LoadingState label="Loading..." />
      </Container>
    ) : (
      <p className="p-8 text-center text-gray-500">Loading profile…</p>
    );
  return <Outlet />;
}

export function RequireAdmin() {
  const { profile, loading } = useAuth();
  const night = isNightTheme();
  if (loading)
    return night ? (
      <Container size="detail">
        <LoadingState label="Loading..." />
      </Container>
    ) : (
      <p className="p-8 text-center text-gray-500">Loading…</p>
    );
  if (profile?.role !== "admin") return <Navigate to="/" replace />;
  return <Outlet />;
}
