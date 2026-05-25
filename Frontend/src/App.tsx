import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { RoleGuard } from "@/components/RoleGuard";
import { PortalShell } from "@/components/PortalShell";

import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Auth from "./pages/Auth.tsx";

import AIMatcher from "./pages/carrier/AIMatcher";
import Fleet from "./pages/carrier/Fleet";
import RouteOptimization from "./pages/carrier/RouteOptimization";

import ShipperDashboard from "./pages/shipper/Dashboard";
import PostShipment from "./pages/shipper/PostShipment";
import History from "./pages/shipper/History";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />

            <Route
              path="/carrier"
              element={
                <RoleGuard allow="carrier">
                  <PortalShell variant="carrier" hub="Melbourne Hub" />
                </RoleGuard>
              }
            >
              <Route index element={<AIMatcher />} />
              <Route path="matcher" element={<AIMatcher />} />
              <Route path="fleet" element={<Fleet />} />
              <Route path="route" element={<RouteOptimization />} />
              <Route path="billing" element={<Navigate to="/carrier" replace />} />
            </Route>

            <Route
              path="/shipper"
              element={
                <RoleGuard allow="shipper">
                  <PortalShell variant="shipper" hub="Shipper Portal" />
                </RoleGuard>
              }
            >
              <Route index element={<ShipperDashboard />} />
              <Route path="post" element={<PostShipment />} />
              <Route path="history" element={<History />} />
              <Route path="billing" element={<Navigate to="/shipper" replace />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
