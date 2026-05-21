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

export async function suggestPrice(payload: PriceSuggestionInput): Promise<PriceSuggestion> {
  return apiRequest<PriceSuggestion>(`/api/v1/price-insights/suggest`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
