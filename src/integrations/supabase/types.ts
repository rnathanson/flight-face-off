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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      aircraft_configs: {
        Row: {
          config_data: Json
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          config_data: Json
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          config_data?: Json
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      custom_ownership_estimates: {
        Row: {
          aircraft_cost: number
          aircraft_cost_base: number | null
          aircraft_type: string
          allow_share_selection: boolean
          cleaning_monthly: number | null
          created_at: string
          created_by: string | null
          customer_email: string | null
          customer_name: string
          down_payment_percent: number
          fuel_burn_per_hour: number | null
          fuel_price_per_gallon: number | null
          hangar_cost: number
          id: string
          include_jetstream_reserve: boolean | null
          inputs_locked: boolean | null
          insurance_annual: number
          interest_rate: number
          is_non_pilot: boolean
          jetstream_hourly: number | null
          jetstream_package: string | null
          last_viewed_at: string | null
          loan_term_years: number
          maintenance_per_hour: number
          management_fee: number
          notes: string | null
          owner_hours: number
          owner_usage_rate: number
          ownersfleet_sf50_hours: number
          ownersfleet_sr22_hours: number
          ownersfleet_sr22_pilot_services_hours: number
          ownership_share: number
          parking_type: string
          pilot_pool_contribution: number | null
          pilot_services_annual: number | null
          pilot_services_hourly: number | null
          pilot_services_hours: number
          pilot_services_rate: number
          rental_hours: number
          rental_revenue_rate: number
          sf50_owner_flown: boolean | null
          status: string
          subscriptions: number
          tci_training: number
          tiedown_cost: number
          unique_slug: string
          updated_at: string
          view_count: number
        }
        Insert: {
          aircraft_cost: number
          aircraft_cost_base?: number | null
          aircraft_type?: string
          allow_share_selection?: boolean
          cleaning_monthly?: number | null
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_name: string
          down_payment_percent: number
          fuel_burn_per_hour?: number | null
          fuel_price_per_gallon?: number | null
          hangar_cost: number
          id?: string
          include_jetstream_reserve?: boolean | null
          inputs_locked?: boolean | null
          insurance_annual: number
          interest_rate: number
          is_non_pilot?: boolean
          jetstream_hourly?: number | null
          jetstream_package?: string | null
          last_viewed_at?: string | null
          loan_term_years: number
          maintenance_per_hour: number
          management_fee: number
          notes?: string | null
          owner_hours: number
          owner_usage_rate: number
          ownersfleet_sf50_hours?: number
          ownersfleet_sr22_hours?: number
          ownersfleet_sr22_pilot_services_hours?: number
          ownership_share?: number
          parking_type: string
          pilot_pool_contribution?: number | null
          pilot_services_annual?: number | null
          pilot_services_hourly?: number | null
          pilot_services_hours: number
          pilot_services_rate: number
          rental_hours: number
          rental_revenue_rate: number
          sf50_owner_flown?: boolean | null
          status?: string
          subscriptions: number
          tci_training: number
          tiedown_cost: number
          unique_slug: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          aircraft_cost?: number
          aircraft_cost_base?: number | null
          aircraft_type?: string
          allow_share_selection?: boolean
          cleaning_monthly?: number | null
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_name?: string
          down_payment_percent?: number
          fuel_burn_per_hour?: number | null
          fuel_price_per_gallon?: number | null
          hangar_cost?: number
          id?: string
          include_jetstream_reserve?: boolean | null
          inputs_locked?: boolean | null
          insurance_annual?: number
          interest_rate?: number
          is_non_pilot?: boolean
          jetstream_hourly?: number | null
          jetstream_package?: string | null
          last_viewed_at?: string | null
          loan_term_years?: number
          maintenance_per_hour?: number
          management_fee?: number
          notes?: string | null
          owner_hours?: number
          owner_usage_rate?: number
          ownersfleet_sf50_hours?: number
          ownersfleet_sr22_hours?: number
          ownersfleet_sr22_pilot_services_hours?: number
          ownership_share?: number
          parking_type?: string
          pilot_pool_contribution?: number | null
          pilot_services_annual?: number | null
          pilot_services_hourly?: number | null
          pilot_services_hours?: number
          pilot_services_rate?: number
          rental_hours?: number
          rental_revenue_rate?: number
          sf50_owner_flown?: boolean | null
          status?: string
          subscriptions?: number
          tci_training?: number
          tiedown_cost?: number
          unique_slug?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      flight_ops_config: {
        Row: {
          acceptable_approaches: string[]
          acceptable_surfaces: string[]
          altitude_rules: Json
          climb_rate_fpm: number
          created_at: string | null
          cruise_speed_ktas: number
          descent_rate_fpm: number
          fuel_burn_cruise_lbs_per_hr: number
          fuel_capacity_lbs: number
          id: string
          ifr_requires_instrument_approach: boolean
          max_range_nm: number
          min_runway_length_ft: number
          min_runway_width_ft: number
          minimum_ceiling_ft: number
          minimum_visibility_sm: number
          requires_lighting: boolean
          requires_paved_surface: boolean
          reserve_fuel_minutes: number
          speed_above_fl100_kias: number
          speed_below_fl100_kias: number
          takeoff_landing_buffer_min: number
          taxi_time_major_airport_min: number
          taxi_time_private_fbo_min: number
          taxi_time_regional_airport_min: number
          updated_at: string | null
        }
        Insert: {
          acceptable_approaches?: string[]
          acceptable_surfaces?: string[]
          altitude_rules?: Json
          climb_rate_fpm?: number
          created_at?: string | null
          cruise_speed_ktas?: number
          descent_rate_fpm?: number
          fuel_burn_cruise_lbs_per_hr?: number
          fuel_capacity_lbs?: number
          id?: string
          ifr_requires_instrument_approach?: boolean
          max_range_nm?: number
          min_runway_length_ft?: number
          min_runway_width_ft?: number
          minimum_ceiling_ft?: number
          minimum_visibility_sm?: number
          requires_lighting?: boolean
          requires_paved_surface?: boolean
          reserve_fuel_minutes?: number
          speed_above_fl100_kias?: number
          speed_below_fl100_kias?: number
          takeoff_landing_buffer_min?: number
          taxi_time_major_airport_min?: number
          taxi_time_private_fbo_min?: number
          taxi_time_regional_airport_min?: number
          updated_at?: string | null
        }
        Update: {
          acceptable_approaches?: string[]
          acceptable_surfaces?: string[]
          altitude_rules?: Json
          climb_rate_fpm?: number
          created_at?: string | null
          cruise_speed_ktas?: number
          descent_rate_fpm?: number
          fuel_burn_cruise_lbs_per_hr?: number
          fuel_capacity_lbs?: number
          id?: string
          ifr_requires_instrument_approach?: boolean
          max_range_nm?: number
          min_runway_length_ft?: number
          min_runway_width_ft?: number
          minimum_ceiling_ft?: number
          minimum_visibility_sm?: number
          requires_lighting?: boolean
          requires_paved_surface?: boolean
          reserve_fuel_minutes?: number
          speed_above_fl100_kias?: number
          speed_below_fl100_kias?: number
          takeoff_landing_buffer_min?: number
          taxi_time_major_airport_min?: number
          taxi_time_private_fbo_min?: number
          taxi_time_regional_airport_min?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      partnership_groups: {
        Row: {
          actual_delivery_date: string | null
          admin_notes: string | null
          aircraft_order_date: string | null
          aircraft_tail_number: string | null
          aircraft_type: string
          created_at: string | null
          expected_delivery_date: string | null
          group_name: string | null
          id: string
          member_profile_ids: string[]
          shares_filled: number | null
          status: string | null
          total_shares_needed: number
          updated_at: string | null
        }
        Insert: {
          actual_delivery_date?: string | null
          admin_notes?: string | null
          aircraft_order_date?: string | null
          aircraft_tail_number?: string | null
          aircraft_type: string
          created_at?: string | null
          expected_delivery_date?: string | null
          group_name?: string | null
          id?: string
          member_profile_ids: string[]
          shares_filled?: number | null
          status?: string | null
          total_shares_needed: number
          updated_at?: string | null
        }
        Update: {
          actual_delivery_date?: string | null
          admin_notes?: string | null
          aircraft_order_date?: string | null
          aircraft_tail_number?: string | null
          aircraft_type?: string
          created_at?: string | null
          expected_delivery_date?: string | null
          group_name?: string | null
          id?: string
          member_profile_ids?: string[]
          shares_filled?: number | null
          status?: string | null
          total_shares_needed?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      partnership_interest_profiles: {
        Row: {
          additional_notes: string | null
          admin_notes: string | null
          aircraft_preference: string[]
          calculated_aircraft: string | null
          calculated_aircraft_cost: number | null
          calculated_down_payment_percent: number | null
          calculated_equity_3year: number | null
          calculated_leaseback_included: boolean | null
          calculated_loan_term_years: number | null
          calculated_monthly_gross_cost: number | null
          calculated_monthly_net_cost: number | null
          calculated_share: number | null
          compatibility_version: number | null
          created_at: string | null
          email: string
          fall_winter_days: number | null
          full_name: string
          id: string
          leaseback_interest: string
          match_pool: string[] | null
          match_scores: Json | null
          matched_with: string[] | null
          mission_profiles: string[]
          ownership_share_preferences: number[]
          passenger_types: string[] | null
          phone: string | null
          pilot_status: string
          preferred_contact_method: string | null
          previous_aircraft_owner: boolean | null
          purchase_timeline: string
          scheduling_flexibility: string
          share_flexible: boolean | null
          sharing_comfort: string | null
          spring_summer_days: number | null
          status: string | null
          training_completion_date: string | null
          typical_flying_time: string
          typical_passenger_count: string | null
          updated_at: string | null
          usage_frequency_days: number | null
          usage_seasonal_pattern: string | null
        }
        Insert: {
          additional_notes?: string | null
          admin_notes?: string | null
          aircraft_preference: string[]
          calculated_aircraft?: string | null
          calculated_aircraft_cost?: number | null
          calculated_down_payment_percent?: number | null
          calculated_equity_3year?: number | null
          calculated_leaseback_included?: boolean | null
          calculated_loan_term_years?: number | null
          calculated_monthly_gross_cost?: number | null
          calculated_monthly_net_cost?: number | null
          calculated_share?: number | null
          compatibility_version?: number | null
          created_at?: string | null
          email: string
          fall_winter_days?: number | null
          full_name: string
          id?: string
          leaseback_interest: string
          match_pool?: string[] | null
          match_scores?: Json | null
          matched_with?: string[] | null
          mission_profiles: string[]
          ownership_share_preferences: number[]
          passenger_types?: string[] | null
          phone?: string | null
          pilot_status: string
          preferred_contact_method?: string | null
          previous_aircraft_owner?: boolean | null
          purchase_timeline: string
          scheduling_flexibility: string
          share_flexible?: boolean | null
          sharing_comfort?: string | null
          spring_summer_days?: number | null
          status?: string | null
          training_completion_date?: string | null
          typical_flying_time: string
          typical_passenger_count?: string | null
          updated_at?: string | null
          usage_frequency_days?: number | null
          usage_seasonal_pattern?: string | null
        }
        Update: {
          additional_notes?: string | null
          admin_notes?: string | null
          aircraft_preference?: string[]
          calculated_aircraft?: string | null
          calculated_aircraft_cost?: number | null
          calculated_down_payment_percent?: number | null
          calculated_equity_3year?: number | null
          calculated_leaseback_included?: boolean | null
          calculated_loan_term_years?: number | null
          calculated_monthly_gross_cost?: number | null
          calculated_monthly_net_cost?: number | null
          calculated_share?: number | null
          compatibility_version?: number | null
          created_at?: string | null
          email?: string
          fall_winter_days?: number | null
          full_name?: string
          id?: string
          leaseback_interest?: string
          match_pool?: string[] | null
          match_scores?: Json | null
          matched_with?: string[] | null
          mission_profiles?: string[]
          ownership_share_preferences?: number[]
          passenger_types?: string[] | null
          phone?: string | null
          pilot_status?: string
          preferred_contact_method?: string | null
          previous_aircraft_owner?: boolean | null
          purchase_timeline?: string
          scheduling_flexibility?: string
          share_flexible?: boolean | null
          sharing_comfort?: string | null
          spring_summer_days?: number | null
          status?: string | null
          training_completion_date?: string | null
          typical_flying_time?: string
          typical_passenger_count?: string | null
          updated_at?: string | null
          usage_frequency_days?: number | null
          usage_seasonal_pattern?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
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
      increment_estimate_view: {
        Args: { _estimate_id: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
