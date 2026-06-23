import { createFileRoute, Navigate, Outlet, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/components/AuthProvider";

export const Route = createFileRoute("/_authenticated")({
  component: AuthGate,
});

function AuthGate() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!user) {
    const redirect = location.pathname.startsWith("/auth") ? "/events" : location.href;
    return <Navigate to="/auth" search={{ mode: "signin", redirect }} replace />;
  }
  return <Outlet />;
}
