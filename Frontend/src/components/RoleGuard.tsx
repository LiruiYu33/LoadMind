import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, AppRole } from "@/lib/auth";
import { LoadMindLoader } from "@/components/LoadMindLoader";

export function RoleGuard({ allow, children }: { allow: AppRole; children: ReactNode }) {
  const { user, role, loading } = useAuth();
  const loc = useLocation();
  if (loading) {
    return <LoadMindLoader />;
  }
  if (!user) return <Navigate to="/auth" replace state={{ from: loc }} />;
  if (role !== allow) return <Navigate to={role ? (role === "carrier" ? "/carrier" : "/shipper") : "/auth"} replace />;
  return <>{children}</>;
}
