import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { LoadMindLoader } from "@/components/LoadMindLoader";

export default function Index() {
  const { user, role, loading } = useAuth();
  if (loading) {
    return <LoadMindLoader />;
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!role) return <Navigate to="/auth" replace />;
  return <Navigate to={role === "carrier" ? "/carrier" : "/shipper"} replace />;
}
