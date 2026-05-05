import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, AppRole } from "@/lib/auth";

export function RoleGuard({ allow, children }: { allow: AppRole; children: ReactNode }) {
  const { user, role, loading } = useAuth();
  const loc = useLocation();
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface">
        <div className="font-display text-sm text-muted-foreground animate-pulse-soft">Loading LoadMind…</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace state={{ from: loc }} />;
  if (role !== allow) return <Navigate to={role ? (role === "carrier" ? "/carrier" : "/shipper") : "/auth"} replace />;
  return <>{children}</>;
}
