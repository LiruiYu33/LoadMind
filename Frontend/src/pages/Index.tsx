import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";

export default function Index() {
  const { user, role, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface">
        <div className="font-display text-sm text-muted-foreground animate-pulse-soft">Loading LoadMind…</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  return <Navigate to={role === "carrier" ? "/carrier" : "/shipper"} replace />;
}
