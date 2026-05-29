import { apiRequest } from "@/lib/api";

export type OpenLoad = {
  id: string;
  origin: string;
  destination: string;
  route_origin?: string | null;
  route_destination?: string | null;
  weight_kg: number;
  load_type: string;
  value: number;
  predicted_margin: number;
  empty_miles_saved: number | null;
  match_score: number | null;
  ai_reasoning: string | null;
  pickup_time: string;
  dropoff_time: string;
  length_cm?: number | null;
  width_cm?: number | null;
  height_cm?: number | null;
  assigned_vehicle_id?: string | null;
  assigned_vehicle_unit?: string | null;
  assigned_carrier_id?: string | null;
  assigned_carrier_name?: string | null;
  assigned_at?: string | null;
  status: string;
  created_at: string;
};

export type AssignLoadInput = {
  vehicle_id: string;
};

export type CreateLoadInput = {
  cargo: string;
  origin: string;
  destination: string;
  weight_kg: number;
  load_type: string;
  value?: number;
  length_cm?: number | null;
  width_cm?: number | null;
  height_cm?: number | null;
  pickup_time: string;
  dropoff_time: string;
  shipment_code?: string;
};

export async function listOpenLoads(): Promise<OpenLoad[]> {
  return apiRequest<OpenLoad[]>("/api/v1/loads/open");
}

export async function createLoad(payload: CreateLoadInput): Promise<OpenLoad> {
  return apiRequest<OpenLoad>("/api/v1/loads", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function assignLoad(loadId: string, payload: AssignLoadInput): Promise<OpenLoad> {
  return apiRequest<OpenLoad>(`/api/v1/loads/${loadId}/assign`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function cancelLoadListing(loadId: string): Promise<OpenLoad> {
  return apiRequest<OpenLoad>(`/api/v1/loads/${loadId}/cancel`, {
    method: "POST",
  });
}

export async function restoreLoadListing(loadId: string): Promise<OpenLoad> {
  return apiRequest<OpenLoad>(`/api/v1/loads/${loadId}/restore`, {
    method: "POST",
  });
}

export async function confirmLoadPickup(loadId: string): Promise<OpenLoad> {
  return apiRequest<OpenLoad>(`/api/v1/loads/${loadId}/confirm-pickup`, {
    method: "POST",
  });
}

export async function confirmLoadDelivery(loadId: string): Promise<OpenLoad> {
  return apiRequest<OpenLoad>(`/api/v1/loads/${loadId}/confirm-delivery`, {
    method: "POST",
  });
}

export type PriceSuggestionInput = {
  cargo: string;
  origin: string;
  destination: string;
  weight_kg: number;
  load_type: string;
  length_cm?: number | null;
  width_cm?: number | null;
  height_cm?: number | null;
  pickup_time: string;
  dropoff_time: string;
};

export type PriceSuggestion = {
  suggested_price: number;
  reasoning?: string | null;
  pure_driving_hours?: number | null;
  actual_duration_hours?: number | null;
  distance_miles?: number | null;
};

export type RouteOptimizationJob = {
  id: number;
  description?: string | null;
  location: [number, number];
  service: number;
  time_windows?: [number, number][] | null;
};

export type RouteOptimizationShipmentStep = {
  id: number;
  description?: string | null;
  location: [number, number];
  service: number;
  time_windows?: [number, number][] | null;
};

export type RouteOptimizationShipment = {
  id: number;
  amount?: [number] | null;
  pickup: RouteOptimizationShipmentStep;
  delivery: RouteOptimizationShipmentStep;
};

export type RouteOptimizationVehicle = {
  id: number;
  profile: string;
  description?: string | null;
  start: [number, number];
  end: [number, number];
  time_window: [number, number];
  capacity?: [number] | null;
};

export type RouteOptimizationInput = {
  jobs: RouteOptimizationJob[];
  shipments?: RouteOptimizationShipment[];
  vehicles: RouteOptimizationVehicle[];
};

export type RouteOptimizationResponse = {
  routes?: Array<{
    steps?: Array<{
      type: string;
      id?: number;
      arrival?: number;
    }>;
  }>;
  unassigned?: Array<{ id?: number; type?: string; description?: string | null }>;
};

export type LoadRouteMetricsInput = {
  origin: string;
  destination: string;
};

export type LoadRouteMetrics = {
  distance_km: number;
  duration_seconds: number;
};

export async function suggestPrice(payload: PriceSuggestionInput): Promise<PriceSuggestion> {
  return apiRequest<PriceSuggestion>(`/api/v1/price-insights/suggest`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function optimizeRoute(payload: RouteOptimizationInput): Promise<RouteOptimizationResponse> {
  return apiRequest<RouteOptimizationResponse>(`/api/v1/route-optimization/optimize`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getLoadRouteMetrics(payload: LoadRouteMetricsInput): Promise<LoadRouteMetrics> {
  return apiRequest<LoadRouteMetrics>(`/api/v1/load-insights/route-metrics`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
