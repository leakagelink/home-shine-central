export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      addons: {
        Row: {
          category_id: string | null;
          created_at: string;
          description: string | null;
          id: string;
          is_active: boolean;
          name: string;
          price_paise: number;
          slug: string;
          sort_order: number;
        };
        Insert: {
          category_id?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          price_paise: number;
          slug: string;
          sort_order?: number;
        };
        Update: {
          category_id?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          price_paise?: number;
          slug?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "addons_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "service_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      addresses: {
        Row: {
          area: string;
          building: string | null;
          city: string;
          created_at: string;
          house_no: string;
          id: string;
          is_default: boolean;
          label: string | null;
          landmark: string | null;
          pincode: string;
          state: string;
          street: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          area: string;
          building?: string | null;
          city: string;
          created_at?: string;
          house_no: string;
          id?: string;
          is_default?: boolean;
          label?: string | null;
          landmark?: string | null;
          pincode: string;
          state: string;
          street?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          area?: string;
          building?: string | null;
          city?: string;
          created_at?: string;
          house_no?: string;
          id?: string;
          is_default?: boolean;
          label?: string | null;
          landmark?: string | null;
          pincode?: string;
          state?: string;
          street?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          actor_role: Database["public"]["Enums"]["app_role"] | null;
          created_at: string;
          entity: string | null;
          entity_id: string | null;
          id: string;
          metadata: Json | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          actor_role?: Database["public"]["Enums"]["app_role"] | null;
          created_at?: string;
          entity?: string | null;
          entity_id?: string | null;
          id?: string;
          metadata?: Json | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          actor_role?: Database["public"]["Enums"]["app_role"] | null;
          created_at?: string;
          entity?: string | null;
          entity_id?: string | null;
          id?: string;
          metadata?: Json | null;
        };
        Relationships: [];
      };
      auth_attempts: {
        Row: {
          created_at: string;
          id: string;
          identifier: string;
          kind: string;
          succeeded: boolean;
        };
        Insert: {
          created_at?: string;
          id?: string;
          identifier: string;
          kind: string;
          succeeded?: boolean;
        };
        Update: {
          created_at?: string;
          id?: string;
          identifier?: string;
          kind?: string;
          succeeded?: boolean;
        };
        Relationships: [];
      };
      auth_credentials: {
        Row: {
          failed_attempts: number;
          locked_until: string | null;
          pin_algo: string;
          pin_hash: string;
          pin_salt: string;
          pin_set_at: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          failed_attempts?: number;
          locked_until?: string | null;
          pin_algo?: string;
          pin_hash: string;
          pin_salt: string;
          pin_set_at?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          failed_attempts?: number;
          locked_until?: string | null;
          pin_algo?: string;
          pin_hash?: string;
          pin_salt?: string;
          pin_set_at?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      booking_items: {
        Row: {
          addon_id: string | null;
          booking_id: string;
          created_at: string;
          id: string;
          kind: string;
          line_total_paise: number;
          name: string;
          quantity: number;
          service_id: string | null;
          unit_price_paise: number;
        };
        Insert: {
          addon_id?: string | null;
          booking_id: string;
          created_at?: string;
          id?: string;
          kind?: string;
          line_total_paise: number;
          name: string;
          quantity?: number;
          service_id?: string | null;
          unit_price_paise: number;
        };
        Update: {
          addon_id?: string | null;
          booking_id?: string;
          created_at?: string;
          id?: string;
          kind?: string;
          line_total_paise?: number;
          name?: string;
          quantity?: number;
          service_id?: string | null;
          unit_price_paise?: number;
        };
        Relationships: [
          {
            foreignKeyName: "booking_items_addon_id_fkey";
            columns: ["addon_id"];
            isOneToOne: false;
            referencedRelation: "addons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "booking_items_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "booking_items_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      booking_status_history: {
        Row: {
          actor_role: Database["public"]["Enums"]["app_role"] | null;
          booking_id: string;
          changed_by: string | null;
          created_at: string;
          id: string;
          note: string | null;
          status: Database["public"]["Enums"]["booking_status"];
        };
        Insert: {
          actor_role?: Database["public"]["Enums"]["app_role"] | null;
          booking_id: string;
          changed_by?: string | null;
          created_at?: string;
          id?: string;
          note?: string | null;
          status: Database["public"]["Enums"]["booking_status"];
        };
        Update: {
          actor_role?: Database["public"]["Enums"]["app_role"] | null;
          booking_id?: string;
          changed_by?: string | null;
          created_at?: string;
          id?: string;
          note?: string | null;
          status?: Database["public"]["Enums"]["booking_status"];
        };
        Relationships: [
          {
            foreignKeyName: "booking_status_history_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
        ];
      };
      bookings: {
        Row: {
          addons_paise: number;
          address_id: string | null;
          address_snapshot: Json | null;
          booking_number: string;
          cancel_reason: string | null;
          cancelled_at: string | null;
          category_slug: string | null;
          completed_at: string | null;
          coupon_id: string | null;
          created_at: string;
          customer_id: string;
          discount_paise: number;
          id: string;
          partner_id: string | null;
          rescheduled_from: Json | null;
          scheduled_date: string;
          slot_end: string;
          slot_start: string;
          special_instructions: string | null;
          status: Database["public"]["Enums"]["booking_status"];
          subtotal_paise: number;
          total_paise: number;
          updated_at: string;
        };
        Insert: {
          addons_paise?: number;
          address_id?: string | null;
          address_snapshot?: Json | null;
          booking_number?: string;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          category_slug?: string | null;
          completed_at?: string | null;
          coupon_id?: string | null;
          created_at?: string;
          customer_id: string;
          discount_paise?: number;
          id?: string;
          partner_id?: string | null;
          rescheduled_from?: Json | null;
          scheduled_date: string;
          slot_end: string;
          slot_start: string;
          special_instructions?: string | null;
          status?: Database["public"]["Enums"]["booking_status"];
          subtotal_paise?: number;
          total_paise?: number;
          updated_at?: string;
        };
        Update: {
          addons_paise?: number;
          address_id?: string | null;
          address_snapshot?: Json | null;
          booking_number?: string;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          category_slug?: string | null;
          completed_at?: string | null;
          coupon_id?: string | null;
          created_at?: string;
          customer_id?: string;
          discount_paise?: number;
          id?: string;
          partner_id?: string | null;
          rescheduled_from?: Json | null;
          scheduled_date?: string;
          slot_end?: string;
          slot_start?: string;
          special_instructions?: string | null;
          status?: Database["public"]["Enums"]["booking_status"];
          subtotal_paise?: number;
          total_paise?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_address_id_fkey";
            columns: ["address_id"];
            isOneToOne: false;
            referencedRelation: "addresses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_coupon_id_fkey";
            columns: ["coupon_id"];
            isOneToOne: false;
            referencedRelation: "coupons";
            referencedColumns: ["id"];
          },
        ];
      };
      coupon_usage: {
        Row: {
          booking_id: string | null;
          coupon_id: string;
          created_at: string;
          discount_paise: number;
          id: string;
          user_id: string;
        };
        Insert: {
          booking_id?: string | null;
          coupon_id: string;
          created_at?: string;
          discount_paise: number;
          id?: string;
          user_id: string;
        };
        Update: {
          booking_id?: string | null;
          coupon_id?: string;
          created_at?: string;
          discount_paise?: number;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "coupon_usage_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "coupon_usage_coupon_id_fkey";
            columns: ["coupon_id"];
            isOneToOne: false;
            referencedRelation: "coupons";
            referencedColumns: ["id"];
          },
        ];
      };
      coupons: {
        Row: {
          code: string;
          created_at: string;
          description: string | null;
          discount_type: string;
          discount_value: number;
          expires_at: string | null;
          id: string;
          is_active: boolean;
          max_discount_paise: number | null;
          min_order_paise: number;
          per_user_limit: number;
          starts_at: string;
          title: string;
          usage_limit: number | null;
          used_count: number;
        };
        Insert: {
          code: string;
          created_at?: string;
          description?: string | null;
          discount_type?: string;
          discount_value: number;
          expires_at?: string | null;
          id?: string;
          is_active?: boolean;
          max_discount_paise?: number | null;
          min_order_paise?: number;
          per_user_limit?: number;
          starts_at?: string;
          title: string;
          usage_limit?: number | null;
          used_count?: number;
        };
        Update: {
          code?: string;
          created_at?: string;
          description?: string | null;
          discount_type?: string;
          discount_value?: number;
          expires_at?: string | null;
          id?: string;
          is_active?: boolean;
          max_discount_paise?: number | null;
          min_order_paise?: number;
          per_user_limit?: number;
          starts_at?: string;
          title?: string;
          usage_limit?: number | null;
          used_count?: number;
        };
        Relationships: [];
      };
      job_photos: {
        Row: {
          booking_id: string;
          bytes: number | null;
          created_at: string;
          file_path: string;
          height: number | null;
          id: string;
          kind: Database["public"]["Enums"]["job_photo_kind"];
          partner_id: string;
          width: number | null;
        };
        Insert: {
          booking_id: string;
          bytes?: number | null;
          created_at?: string;
          file_path: string;
          height?: number | null;
          id?: string;
          kind: Database["public"]["Enums"]["job_photo_kind"];
          partner_id: string;
          width?: number | null;
        };
        Update: {
          booking_id?: string;
          bytes?: number | null;
          created_at?: string;
          file_path?: string;
          height?: number | null;
          id?: string;
          kind?: Database["public"]["Enums"]["job_photo_kind"];
          partner_id?: string;
          width?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "job_photos_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          audience: Database["public"]["Enums"]["app_role"] | null;
          body: string | null;
          booking_id: string | null;
          created_at: string;
          id: string;
          kind: string;
          read_at: string | null;
          title: string;
          user_id: string;
        };
        Insert: {
          audience?: Database["public"]["Enums"]["app_role"] | null;
          body?: string | null;
          booking_id?: string | null;
          created_at?: string;
          id?: string;
          kind?: string;
          read_at?: string | null;
          title: string;
          user_id: string;
        };
        Update: {
          audience?: Database["public"]["Enums"]["app_role"] | null;
          body?: string | null;
          booking_id?: string | null;
          created_at?: string;
          id?: string;
          kind?: string;
          read_at?: string | null;
          title?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
        ];
      };
      otp_requests: {
        Row: {
          attempts: number;
          code_hash: string;
          code_salt: string;
          consumed_at: string | null;
          created_at: string;
          expires_at: string;
          id: string;
          mobile: string;
          purpose: string;
        };
        Insert: {
          attempts?: number;
          code_hash: string;
          code_salt: string;
          consumed_at?: string | null;
          created_at?: string;
          expires_at: string;
          id?: string;
          mobile: string;
          purpose?: string;
        };
        Update: {
          attempts?: number;
          code_hash?: string;
          code_salt?: string;
          consumed_at?: string | null;
          created_at?: string;
          expires_at?: string;
          id?: string;
          mobile?: string;
          purpose?: string;
        };
        Relationships: [];
      };
      partner_commissions: {
        Row: {
          category_slug: string | null;
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          percent: number;
        };
        Insert: {
          category_slug?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          percent: number;
        };
        Update: {
          category_slug?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          percent?: number;
        };
        Relationships: [];
      };
      partner_earnings: {
        Row: {
          available_at: string | null;
          booking_id: string | null;
          commission_paise: number;
          created_at: string;
          gross_paise: number;
          id: string;
          net_paise: number;
          partner_id: string;
          state: string;
        };
        Insert: {
          available_at?: string | null;
          booking_id?: string | null;
          commission_paise: number;
          created_at?: string;
          gross_paise: number;
          id?: string;
          net_paise: number;
          partner_id: string;
          state?: string;
        };
        Update: {
          available_at?: string | null;
          booking_id?: string | null;
          commission_paise?: number;
          created_at?: string;
          gross_paise?: number;
          id?: string;
          net_paise?: number;
          partner_id?: string;
          state?: string;
        };
        Relationships: [
          {
            foreignKeyName: "partner_earnings_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
        ];
      };
      partner_kyc: {
        Row: {
          created_at: string;
          doc_number_masked: string | null;
          doc_type: string;
          file_path: string | null;
          id: string;
          partner_id: string;
          review_note: string | null;
          reviewed_at: string | null;
          reviewer_id: string | null;
          state: Database["public"]["Enums"]["kyc_status"];
        };
        Insert: {
          created_at?: string;
          doc_number_masked?: string | null;
          doc_type: string;
          file_path?: string | null;
          id?: string;
          partner_id: string;
          review_note?: string | null;
          reviewed_at?: string | null;
          reviewer_id?: string | null;
          state?: Database["public"]["Enums"]["kyc_status"];
        };
        Update: {
          created_at?: string;
          doc_number_masked?: string | null;
          doc_type?: string;
          file_path?: string | null;
          id?: string;
          partner_id?: string;
          review_note?: string | null;
          reviewed_at?: string | null;
          reviewer_id?: string | null;
          state?: Database["public"]["Enums"]["kyc_status"];
        };
        Relationships: [];
      };
      partner_profiles: {
        Row: {
          city: string | null;
          commission_percent: number;
          created_at: string;
          display_name: string | null;
          is_available: boolean;
          jobs_completed: number;
          kyc_state: Database["public"]["Enums"]["kyc_status"];
          rating: number;
          skills: string[];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          city?: string | null;
          commission_percent?: number;
          created_at?: string;
          display_name?: string | null;
          is_available?: boolean;
          jobs_completed?: number;
          kyc_state?: Database["public"]["Enums"]["kyc_status"];
          rating?: number;
          skills?: string[];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          city?: string | null;
          commission_percent?: number;
          created_at?: string;
          display_name?: string | null;
          is_available?: boolean;
          jobs_completed?: number;
          kyc_state?: Database["public"]["Enums"]["kyc_status"];
          rating?: number;
          skills?: string[];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          amount_paise: number;
          booking_id: string;
          created_at: string;
          currency: string;
          customer_id: string;
          failure_reason: string | null;
          id: string;
          idempotency_key: string | null;
          provider: string;
          provider_order_id: string | null;
          provider_payment_id: string | null;
          raw_event: Json | null;
          status: Database["public"]["Enums"]["payment_status"];
          updated_at: string;
          verified_at: string | null;
        };
        Insert: {
          amount_paise: number;
          booking_id: string;
          created_at?: string;
          currency?: string;
          customer_id: string;
          failure_reason?: string | null;
          id?: string;
          idempotency_key?: string | null;
          provider?: string;
          provider_order_id?: string | null;
          provider_payment_id?: string | null;
          raw_event?: Json | null;
          status?: Database["public"]["Enums"]["payment_status"];
          updated_at?: string;
          verified_at?: string | null;
        };
        Update: {
          amount_paise?: number;
          booking_id?: string;
          created_at?: string;
          currency?: string;
          customer_id?: string;
          failure_reason?: string | null;
          id?: string;
          idempotency_key?: string | null;
          provider?: string;
          provider_order_id?: string | null;
          provider_payment_id?: string | null;
          raw_event?: Json | null;
          status?: Database["public"]["Enums"]["payment_status"];
          updated_at?: string;
          verified_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
        ];
      };
      payout_history: {
        Row: {
          amount_paise: number;
          created_at: string;
          id: string;
          partner_id: string;
          provider: string;
          provider_payout_id: string | null;
          state: string;
          withdrawal_id: string | null;
        };
        Insert: {
          amount_paise: number;
          created_at?: string;
          id?: string;
          partner_id: string;
          provider?: string;
          provider_payout_id?: string | null;
          state?: string;
          withdrawal_id?: string | null;
        };
        Update: {
          amount_paise?: number;
          created_at?: string;
          id?: string;
          partner_id?: string;
          provider?: string;
          provider_payout_id?: string | null;
          state?: string;
          withdrawal_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payout_history_withdrawal_id_fkey";
            columns: ["withdrawal_id"];
            isOneToOne: false;
            referencedRelation: "withdrawal_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          mobile: string;
          status: Database["public"]["Enums"]["account_status"];
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          mobile: string;
          status?: Database["public"]["Enums"]["account_status"];
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          mobile?: string;
          status?: Database["public"]["Enums"]["account_status"];
          updated_at?: string;
        };
        Relationships: [];
      };
      refunds: {
        Row: {
          amount_paise: number;
          booking_id: string;
          created_at: string;
          customer_id: string;
          decided_at: string | null;
          decided_by: string | null;
          id: string;
          payment_id: string | null;
          provider_refund_id: string | null;
          reason: string | null;
          state: Database["public"]["Enums"]["refund_status"];
          updated_at: string;
        };
        Insert: {
          amount_paise: number;
          booking_id: string;
          created_at?: string;
          customer_id: string;
          decided_at?: string | null;
          decided_by?: string | null;
          id?: string;
          payment_id?: string | null;
          provider_refund_id?: string | null;
          reason?: string | null;
          state?: Database["public"]["Enums"]["refund_status"];
          updated_at?: string;
        };
        Update: {
          amount_paise?: number;
          booking_id?: string;
          created_at?: string;
          customer_id?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          id?: string;
          payment_id?: string | null;
          provider_refund_id?: string | null;
          reason?: string | null;
          state?: Database["public"]["Enums"]["refund_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "refunds_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "refunds_payment_id_fkey";
            columns: ["payment_id"];
            isOneToOne: false;
            referencedRelation: "payments";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: {
          booking_id: string;
          comment: string | null;
          created_at: string;
          customer_id: string;
          id: string;
          partner_id: string | null;
          rating: number;
        };
        Insert: {
          booking_id: string;
          comment?: string | null;
          created_at?: string;
          customer_id: string;
          id?: string;
          partner_id?: string | null;
          rating: number;
        };
        Update: {
          booking_id?: string;
          comment?: string | null;
          created_at?: string;
          customer_id?: string;
          id?: string;
          partner_id?: string | null;
          rating?: number;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: true;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
        ];
      };
      service_categories: {
        Row: {
          created_at: string;
          icon: string | null;
          id: string;
          is_active: boolean;
          name: string;
          slug: string;
          sort_order: number;
          tagline: string | null;
        };
        Insert: {
          created_at?: string;
          icon?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          slug: string;
          sort_order?: number;
          tagline?: string | null;
        };
        Update: {
          created_at?: string;
          icon?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          slug?: string;
          sort_order?: number;
          tagline?: string | null;
        };
        Relationships: [];
      };
      services: {
        Row: {
          category_id: string;
          created_at: string;
          description: string | null;
          duration_minutes: number | null;
          id: string;
          includes: string[];
          is_active: boolean;
          max_quantity: number;
          name: string;
          price_paise: number;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          category_id: string;
          created_at?: string;
          description?: string | null;
          duration_minutes?: number | null;
          id?: string;
          includes?: string[];
          is_active?: boolean;
          max_quantity?: number;
          name: string;
          price_paise: number;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          category_id?: string;
          created_at?: string;
          description?: string | null;
          duration_minutes?: number | null;
          id?: string;
          includes?: string[];
          is_active?: boolean;
          max_quantity?: number;
          name?: string;
          price_paise?: number;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "service_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      support_tickets: {
        Row: {
          admin_reply: string | null;
          booking_id: string | null;
          created_at: string;
          id: string;
          message: string;
          state: string;
          subject: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          admin_reply?: string | null;
          booking_id?: string | null;
          created_at?: string;
          id?: string;
          message: string;
          state?: string;
          subject: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          admin_reply?: string | null;
          booking_id?: string | null;
          created_at?: string;
          id?: string;
          message?: string;
          state?: string;
          subject?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "support_tickets_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      withdrawal_requests: {
        Row: {
          amount_paise: number;
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          id: string;
          note: string | null;
          partner_id: string;
          state: Database["public"]["Enums"]["withdrawal_status"];
          updated_at: string;
        };
        Insert: {
          amount_paise: number;
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          id?: string;
          note?: string | null;
          partner_id: string;
          state?: Database["public"]["Enums"]["withdrawal_status"];
          updated_at?: string;
        };
        Update: {
          amount_paise?: number;
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          id?: string;
          note?: string | null;
          partner_id?: string;
          state?: Database["public"]["Enums"]["withdrawal_status"];
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_admin: { Args: never; Returns: boolean };
    };
    Enums: {
      account_status: "active" | "suspended" | "deleted";
      app_role: "customer" | "partner" | "admin";
      booking_status:
        | "pending_payment"
        | "payment_verified"
        | "confirmed"
        | "partner_assigned"
        | "partner_accepted"
        | "on_the_way"
        | "arrived"
        | "work_started"
        | "work_completed"
        | "review_pending"
        | "completed"
        | "cancelled"
        | "refund_initiated"
        | "refund_completed";
      job_photo_kind: "before" | "after";
      kyc_status: "not_submitted" | "pending" | "approved" | "rejected";
      payment_status: "created" | "pending" | "paid" | "failed" | "refunded" | "partially_refunded";
      refund_status: "requested" | "approved" | "rejected" | "processing" | "completed";
      withdrawal_status: "requested" | "approved" | "rejected" | "paid";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      account_status: ["active", "suspended", "deleted"],
      app_role: ["customer", "partner", "admin"],
      booking_status: [
        "pending_payment",
        "payment_verified",
        "confirmed",
        "partner_assigned",
        "partner_accepted",
        "on_the_way",
        "arrived",
        "work_started",
        "work_completed",
        "review_pending",
        "completed",
        "cancelled",
        "refund_initiated",
        "refund_completed",
      ],
      job_photo_kind: ["before", "after"],
      kyc_status: ["not_submitted", "pending", "approved", "rejected"],
      payment_status: ["created", "pending", "paid", "failed", "refunded", "partially_refunded"],
      refund_status: ["requested", "approved", "rejected", "processing", "completed"],
      withdrawal_status: ["requested", "approved", "rejected", "paid"],
    },
  },
} as const;
