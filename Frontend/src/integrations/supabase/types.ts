export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      assignments: {
        Row: {
          carrier_id: string
          created_at: string
          driver_id: string | null
          eta: string | null
          id: string
          load_id: string | null
          status: string
          vehicle_id: string | null
        }
        Insert: {
          carrier_id: string
          created_at?: string
          driver_id?: string | null
          eta?: string | null
          id?: string
          load_id?: string | null
          status?: string
          vehicle_id?: string | null
        }
        Update: {
          carrier_id?: string
          created_at?: string
          driver_id?: string | null
          eta?: string | null
          id?: string
          load_id?: string | null
          status?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_load_id_fkey"
            columns: ["load_id"]
            isOneToOne: false
            referencedRelation: "loads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          avatar_seed: string | null
          created_at: string
          id: string
          name: string
          owner_id: string
          status: string
        }
        Insert: {
          avatar_seed?: string | null
          created_at?: string
          id?: string
          name: string
          owner_id: string
          status?: string
        }
        Update: {
          avatar_seed?: string | null
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          status?: string
        }
        Relationships: []
      }
      loads: {
        Row: {
          ai_reasoning: string | null
          assigned_at: string | null
          assigned_carrier_id: string | null
          assigned_carrier_name: string | null
          assigned_vehicle_id: string | null
          assigned_vehicle_unit: string | null
          cargo: string | null
          completed_at: string | null
          created_at: string
          delivered_confirmed_by_carrier_at: string | null
          delivered_confirmed_by_shipper_at: string | null
          destination: string
          dropoff_time: string
          empty_miles_saved: number | null
          height_cm: number | null
          id: string
          length_cm: number | null
          load_type: string
          match_score: number | null
          net_margin: number | null
          origin: string
          pickup_confirmed_by_carrier_at: string | null
          pickup_confirmed_by_shipper_at: string | null
          pickup_time: string
          predicted_margin: number
          route_destination: string | null
          route_origin: string | null
          shipment_code: string | null
          shipper_id: string
          status: string
          value: number
          weight_kg: number
          width_cm: number | null
        }
        Insert: {
          ai_reasoning?: string | null
          assigned_at?: string | null
          assigned_carrier_id?: string | null
          assigned_carrier_name?: string | null
          assigned_vehicle_id?: string | null
          assigned_vehicle_unit?: string | null
          cargo?: string | null
          completed_at?: string | null
          created_at?: string
          delivered_confirmed_by_carrier_at?: string | null
          delivered_confirmed_by_shipper_at?: string | null
          destination: string
          dropoff_time: string
          empty_miles_saved?: number | null
          height_cm?: number | null
          id?: string
          length_cm?: number | null
          load_type: string
          match_score?: number | null
          net_margin?: number | null
          origin: string
          pickup_confirmed_by_carrier_at?: string | null
          pickup_confirmed_by_shipper_at?: string | null
          pickup_time: string
          predicted_margin?: number
          route_destination?: string | null
          route_origin?: string | null
          shipment_code?: string | null
          shipper_id: string
          status?: string
          value?: number
          weight_kg: number
          width_cm?: number | null
        }
        Update: {
          ai_reasoning?: string | null
          assigned_at?: string | null
          assigned_carrier_id?: string | null
          assigned_carrier_name?: string | null
          assigned_vehicle_id?: string | null
          assigned_vehicle_unit?: string | null
          cargo?: string | null
          completed_at?: string | null
          created_at?: string
          delivered_confirmed_by_carrier_at?: string | null
          delivered_confirmed_by_shipper_at?: string | null
          destination?: string
          dropoff_time?: string
          empty_miles_saved?: number | null
          height_cm?: number | null
          id?: string
          length_cm?: number | null
          load_type?: string
          match_score?: number | null
          net_margin?: number | null
          origin?: string
          pickup_confirmed_by_carrier_at?: string | null
          pickup_confirmed_by_shipper_at?: string | null
          pickup_time?: string
          predicted_margin?: number
          route_destination?: string | null
          route_origin?: string | null
          shipment_code?: string | null
          shipper_id?: string
          status?: string
          value?: number
          weight_kg?: number
          width_cm?: number | null
        }
        Relationships: []
      }
      shipments: {
        Row: {
          cargo: string
          carrier: string | null
          completed_at: string | null
          created_at: string
          eta: string | null
          id: string
          net_margin: number | null
          route_destination: string
          route_origin: string
          shipment_code: string
          shipper_id: string
          status: string
          value: number
          weight_kg: number
        }
        Insert: {
          cargo: string
          carrier?: string | null
          completed_at?: string | null
          created_at?: string
          eta?: string | null
          id?: string
          net_margin?: number | null
          route_destination: string
          route_origin: string
          shipment_code: string
          shipper_id: string
          status?: string
          value?: number
          weight_kg?: number
        }
        Update: {
          cargo?: string
          carrier?: string | null
          completed_at?: string | null
          created_at?: string
          eta?: string | null
          id?: string
          net_margin?: number | null
          route_destination?: string
          route_origin?: string
          shipment_code?: string
          shipper_id?: string
          status?: string
          value?: number
          weight_kg?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          capacity_t: number
          created_at: string
          driver_name: string
          fuel_efficiency: number
          id: string
          lat: number | null
          lng: number | null
          location: string | null
          model: string
          owner_id: string
          preferred_routes: string[] | null
          status: string
          trailers: Json
          unit_id: string
          year: number
        }
        Insert: {
          capacity_t?: number
          created_at?: string
          driver_name: string
          fuel_efficiency: number
          id?: string
          lat?: number | null
          lng?: number | null
          location?: string | null
          model: string
          owner_id: string
          preferred_routes?: string[] | null
          status?: string
          trailers?: Json
          unit_id: string
          year?: number
        }
        Update: {
          capacity_t?: number
          created_at?: string
          driver_name?: string
          fuel_efficiency?: number
          id?: string
          lat?: number | null
          lng?: number | null
          location?: string | null
          model?: string
          owner_id?: string
          preferred_routes?: string[] | null
          status?: string
          trailers?: Json
          unit_id?: string
          year?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "carrier" | "shipper"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["carrier", "shipper"],
    },
  },
} as const
