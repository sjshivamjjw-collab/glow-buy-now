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
      addresses: {
        Row: {
          city: string
          country: string
          created_at: string
          id: string
          is_default: boolean
          label: string | null
          name: string
          phone: string | null
          state: string | null
          street: string
          updated_at: string
          user_id: string
          zip: string | null
        }
        Insert: {
          city: string
          country?: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string | null
          name: string
          phone?: string | null
          state?: string | null
          street: string
          updated_at?: string
          user_id: string
          zip?: string | null
        }
        Update: {
          city?: string
          country?: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string | null
          name?: string
          phone?: string | null
          state?: string | null
          street?: string
          updated_at?: string
          user_id?: string
          zip?: string | null
        }
        Relationships: []
      }
      cancellation_requests: {
        Row: {
          created_at: string
          id: string
          order_id: string
          reason: string | null
          requested_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          reason?: string | null
          requested_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          reason?: string | null
          requested_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cancellation_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cancellation_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          created_at: string
          id: string
          livestream_id: string
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          livestream_id: string
          message: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          livestream_id?: string
          message?: string
          user_id?: string
        }
        Relationships: []
      }
      communities: {
        Row: {
          approval_status: Database["public"]["Enums"]["community_approval_status"]
          cover_url: string | null
          created_at: string
          creator_id: string
          description: string | null
          dms_enabled: boolean
          id: string
          info_attachments: Json
          intro_video_url: string | null
          is_published: boolean
          key_outcomes: string[]
          member_count: number
          name: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          slug: string
          social_links: Json
          updated_at: string
        }
        Insert: {
          approval_status?: Database["public"]["Enums"]["community_approval_status"]
          cover_url?: string | null
          created_at?: string
          creator_id: string
          description?: string | null
          dms_enabled?: boolean
          id?: string
          info_attachments?: Json
          intro_video_url?: string | null
          is_published?: boolean
          key_outcomes?: string[]
          member_count?: number
          name: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug: string
          social_links?: Json
          updated_at?: string
        }
        Update: {
          approval_status?: Database["public"]["Enums"]["community_approval_status"]
          cover_url?: string | null
          created_at?: string
          creator_id?: string
          description?: string | null
          dms_enabled?: boolean
          id?: string
          info_attachments?: Json
          intro_video_url?: string | null
          is_published?: boolean
          key_outcomes?: string[]
          member_count?: number
          name?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug?: string
          social_links?: Json
          updated_at?: string
        }
        Relationships: []
      }
      community_admins: {
        Row: {
          community_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          community_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          community_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      community_channels: {
        Row: {
          community_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          post_permission: string
          required_tier_level: number
          slug: string
          sort_order: number
        }
        Insert: {
          community_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          post_permission?: string
          required_tier_level?: number
          slug: string
          sort_order?: number
        }
        Update: {
          community_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          post_permission?: string
          required_tier_level?: number
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      community_chat_messages: {
        Row: {
          attachment_mime: string | null
          attachment_name: string | null
          attachment_size: number | null
          attachment_url: string | null
          body: string | null
          channel_id: string
          community_id: string
          created_at: string
          id: string
          kind: string
          poll: Json | null
          user_id: string
        }
        Insert: {
          attachment_mime?: string | null
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_url?: string | null
          body?: string | null
          channel_id: string
          community_id: string
          created_at?: string
          id?: string
          kind?: string
          poll?: Json | null
          user_id: string
        }
        Update: {
          attachment_mime?: string | null
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_url?: string | null
          body?: string | null
          channel_id?: string
          community_id?: string
          created_at?: string
          id?: string
          kind?: string
          poll?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      community_chat_poll_votes: {
        Row: {
          created_at: string
          id: string
          message_id: string
          option_index: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          option_index: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          option_index?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_chat_poll_votes_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "community_chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      community_dm_messages: {
        Row: {
          attachment_mime: string | null
          attachment_name: string | null
          attachment_size: number | null
          attachment_url: string | null
          body: string | null
          community_id: string
          created_at: string
          id: string
          kind: string
          recipient_id: string
          sender_id: string
          thread_id: string
        }
        Insert: {
          attachment_mime?: string | null
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_url?: string | null
          body?: string | null
          community_id: string
          created_at?: string
          id?: string
          kind?: string
          recipient_id: string
          sender_id: string
          thread_id: string
        }
        Update: {
          attachment_mime?: string | null
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_url?: string | null
          body?: string | null
          community_id?: string
          created_at?: string
          id?: string
          kind?: string
          recipient_id?: string
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_dm_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "community_dm_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      community_dm_threads: {
        Row: {
          community_id: string
          created_at: string
          id: string
          last_message_at: string | null
          user_a: string
          user_b: string
        }
        Insert: {
          community_id: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          user_a: string
          user_b: string
        }
        Update: {
          community_id?: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          user_a?: string
          user_b?: string
        }
        Relationships: []
      }
      community_event_rsvps: {
        Row: {
          created_at: string
          event_id: string
          id: string
          status: Database["public"]["Enums"]["event_rsvp_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          status?: Database["public"]["Enums"]["event_rsvp_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          status?: Database["public"]["Enums"]["event_rsvp_status"]
          user_id?: string
        }
        Relationships: []
      }
      community_events: {
        Row: {
          audience_user_ids: string[]
          community_id: string
          cover_url: string | null
          created_at: string
          created_by: string
          description: string | null
          ends_at: string | null
          id: string
          location_url: string | null
          required_tier_level: number
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          audience_user_ids?: string[]
          community_id: string
          cover_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          ends_at?: string | null
          id?: string
          location_url?: string | null
          required_tier_level?: number
          starts_at: string
          title: string
          updated_at?: string
        }
        Update: {
          audience_user_ids?: string[]
          community_id?: string
          cover_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          location_url?: string | null
          required_tier_level?: number
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      community_resources: {
        Row: {
          community_id: string
          created_at: string
          created_by: string
          description: string | null
          file_size: number | null
          id: string
          kind: Database["public"]["Enums"]["resource_kind"]
          required_tier_level: number
          title: string
          url: string
        }
        Insert: {
          community_id: string
          created_at?: string
          created_by: string
          description?: string | null
          file_size?: number | null
          id?: string
          kind: Database["public"]["Enums"]["resource_kind"]
          required_tier_level?: number
          title: string
          url: string
        }
        Update: {
          community_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          file_size?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["resource_kind"]
          required_tier_level?: number
          title?: string
          url?: string
        }
        Relationships: []
      }
      community_reviews: {
        Row: {
          body: string | null
          community_id: string
          created_at: string
          id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          community_id: string
          created_at?: string
          id?: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          community_id?: string
          created_at?: string
          id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      community_tiers: {
        Row: {
          billing_period_months: number
          community_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          kind: Database["public"]["Enums"]["tier_kind"]
          name: string
          price_inr: number | null
          razorpay_plan_id: string | null
          sort_order: number
          trial_days: number
          updated_at: string
        }
        Insert: {
          billing_period_months?: number
          community_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          kind: Database["public"]["Enums"]["tier_kind"]
          name: string
          price_inr?: number | null
          razorpay_plan_id?: string | null
          sort_order?: number
          trial_days?: number
          updated_at?: string
        }
        Update: {
          billing_period_months?: number
          community_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["tier_kind"]
          name?: string
          price_inr?: number | null
          razorpay_plan_id?: string | null
          sort_order?: number
          trial_days?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_tiers_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          id: string
          seller_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          id?: string
          seller_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          id?: string
          seller_id?: string
        }
        Relationships: []
      }
      livestreams: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          ended_at: string | null
          featured_product_id: string | null
          hms_room_id: string | null
          id: string
          product_ids: string[]
          scheduled_at: string | null
          seller_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["livestream_status"]
          thumbnail_url: string | null
          title: string
          updated_at: string
          viewer_count: number
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          ended_at?: string | null
          featured_product_id?: string | null
          hms_room_id?: string | null
          id?: string
          product_ids?: string[]
          scheduled_at?: string | null
          seller_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["livestream_status"]
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          viewer_count?: number
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          ended_at?: string | null
          featured_product_id?: string | null
          hms_room_id?: string | null
          id?: string
          product_ids?: string[]
          scheduled_at?: string | null
          seller_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["livestream_status"]
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          viewer_count?: number
        }
        Relationships: []
      }
      membership_disputes: {
        Row: {
          admin_notes: string | null
          community_id: string
          created_at: string
          id: string
          membership_id: string
          reason: string
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["dispute_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          community_id: string
          created_at?: string
          id?: string
          membership_id: string
          reason: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          community_id?: string
          created_at?: string
          id?: string
          membership_id?: string
          reason?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      memberships: {
        Row: {
          cancelled_at: string | null
          community_id: string
          created_at: string
          current_period_end: string | null
          id: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_subscription_id: string | null
          source: Database["public"]["Enums"]["membership_source"]
          started_at: string | null
          status: Database["public"]["Enums"]["membership_status"]
          tier_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          community_id: string
          created_at?: string
          current_period_end?: string | null
          id?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_subscription_id?: string | null
          source: Database["public"]["Enums"]["membership_source"]
          started_at?: string | null
          status?: Database["public"]["Enums"]["membership_status"]
          tier_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          community_id?: string
          created_at?: string
          current_period_end?: string | null
          id?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_subscription_id?: string | null
          source?: Database["public"]["Enums"]["membership_source"]
          started_at?: string | null
          status?: Database["public"]["Enums"]["membership_status"]
          tier_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "community_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          id?: string
          message: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string
          quantity: number
          unit_price: number
          variant_id: string | null
          variant_label: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          quantity?: number
          unit_price: number
          variant_id?: string | null
          variant_label?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          unit_price?: number
          variant_id?: string | null
          variant_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          payment_method: string
          payment_status: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          seller_id: string
          shipping_address: Json | null
          status: Database["public"]["Enums"]["order_status"]
          total_amount: number
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          payment_method?: string
          payment_status?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          seller_id: string
          shipping_address?: Json | null
          status?: Database["public"]["Enums"]["order_status"]
          total_amount: number
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          payment_method?: string
          payment_status?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          seller_id?: string
          shipping_address?: Json | null
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      otp_codes: {
        Row: {
          attempt_count: number
          code: string
          created_at: string
          expires_at: string
          id: string
          phone: string
          verified: boolean
        }
        Insert: {
          attempt_count?: number
          code: string
          created_at?: string
          expires_at: string
          id?: string
          phone: string
          verified?: boolean
        }
        Update: {
          attempt_count?: number
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
          verified?: boolean
        }
        Relationships: []
      }
      payment_intents: {
        Row: {
          amount_inr: number
          community_id: string
          created_at: string
          id: string
          razorpay_order_id: string
          tier_id: string
          user_id: string
        }
        Insert: {
          amount_inr: number
          community_id: string
          created_at?: string
          id?: string
          razorpay_order_id: string
          tier_id: string
          user_id: string
        }
        Update: {
          amount_inr?: number
          community_id?: string
          created_at?: string
          id?: string
          razorpay_order_id?: string
          tier_id?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      product_variants: {
        Row: {
          created_at: string
          id: string
          product_id: string
          size_label: string
          sort_order: number
          stock_quantity: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          size_label: string
          sort_order?: number
          stock_quantity?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          size_label?: string
          sort_order?: number
          stock_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          compare_at_price: number | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          images: string[]
          is_active: boolean
          price: number
          seller_id: string
          stock_quantity: number
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          compare_at_price?: number | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          images?: string[]
          is_active?: boolean
          price: number
          seller_id: string
          stock_quantity?: number
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          compare_at_price?: number | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          images?: string[]
          is_active?: boolean
          price?: number
          seller_id?: string
          stock_quantity?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          auth_secret: string | null
          avatar_url: string | null
          city: string | null
          created_at: string
          date_of_birth: string | null
          gender: string | null
          id: string
          interested_categories: string[] | null
          name: string | null
          onboarding_completed: boolean
          phone: string | null
          username: string | null
        }
        Insert: {
          auth_secret?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          gender?: string | null
          id: string
          interested_categories?: string[] | null
          name?: string | null
          onboarding_completed?: boolean
          phone?: string | null
          username?: string | null
        }
        Update: {
          auth_secret?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          gender?: string | null
          id?: string
          interested_categories?: string[] | null
          name?: string | null
          onboarding_completed?: boolean
          phone?: string | null
          username?: string | null
        }
        Relationships: []
      }
      return_requests: {
        Row: {
          created_at: string
          id: string
          order_id: string
          reason: string | null
          requested_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          reason?: string | null
          requested_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          reason?: string | null
          requested_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_applications: {
        Row: {
          brand_name: string | null
          category: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          description: string
          gst_tax_id: string | null
          id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sample_product_images: string[] | null
          seller_name: string | null
          shipping_network: string | null
          social_media_links: Json | null
          status: Database["public"]["Enums"]["application_status"]
          store_name: string
          updated_at: string
          user_id: string
          website_link: string | null
        }
        Insert: {
          brand_name?: string | null
          category: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          description: string
          gst_tax_id?: string | null
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sample_product_images?: string[] | null
          seller_name?: string | null
          shipping_network?: string | null
          social_media_links?: Json | null
          status?: Database["public"]["Enums"]["application_status"]
          store_name: string
          updated_at?: string
          user_id: string
          website_link?: string | null
        }
        Update: {
          brand_name?: string | null
          category?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string
          gst_tax_id?: string | null
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sample_product_images?: string[] | null
          seller_name?: string | null
          shipping_network?: string | null
          social_media_links?: Json | null
          status?: Database["public"]["Enums"]["application_status"]
          store_name?: string
          updated_at?: string
          user_id?: string
          website_link?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      seller_ratings: {
        Row: {
          cancelled_orders: number | null
          delivered_orders: number | null
          rating: number | null
          returned_orders: number | null
          seller_id: string | null
          total_orders: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_revoke_seller: { Args: { _user_id: string }; Returns: boolean }
      become_creator: { Args: never; Returns: boolean }
      can_access_community_tier: {
        Args: {
          _community_id: string
          _required_level: number
          _user_id: string
        }
        Returns: boolean
      }
      can_post_in_channel: {
        Args: { _channel_id: string; _community_id: string; _user_id: string }
        Returns: boolean
      }
      decrement_product_stock: {
        Args: { _product_id: string; _qty: number }
        Returns: boolean
      }
      decrement_variant_stock: {
        Args: { _qty: number; _variant_id: string }
        Returns: boolean
      }
      get_chat_author_names: {
        Args: { _user_ids: string[] }
        Returns: {
          avatar_url: string
          id: string
          name: string
          username: string
        }[]
      }
      get_or_create_dm_thread: {
        Args: { _community_id: string; _other_user_id: string }
        Returns: string
      }
      get_platform_admin_ids: { Args: never; Returns: string[] }
      get_seller_public_profile: {
        Args: { _seller_id: string }
        Returns: {
          avatar_url: string
          id: string
          name: string
          username: string
        }[]
      }
      get_seller_public_profiles: {
        Args: { _ids: string[] }
        Returns: {
          avatar_url: string
          id: string
          name: string
          username: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active_community_member: {
        Args: { _community_id: string; _user_id: string }
        Returns: boolean
      }
      is_community_admin: {
        Args: { _community_id: string; _user_id: string }
        Returns: boolean
      }
      user_community_tier_level: {
        Args: { _community_id: string; _user_id: string }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "creator" | "shopper"
      application_status: "pending" | "approved" | "rejected"
      community_approval_status: "pending" | "approved" | "rejected"
      dispute_status: "open" | "resolved" | "rejected"
      event_rsvp_status: "going" | "maybe" | "declined"
      livestream_status: "scheduled" | "live" | "ended"
      membership_source: "free" | "razorpay_sub" | "razorpay_order"
      membership_status: "active" | "pending" | "expired" | "cancelled"
      order_status:
        | "pending"
        | "confirmed"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "return_initiated"
        | "return_completed"
      resource_kind: "file" | "link"
      tier_kind: "free" | "paid_monthly" | "paid_one_time"
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
      app_role: ["admin", "creator", "shopper"],
      application_status: ["pending", "approved", "rejected"],
      community_approval_status: ["pending", "approved", "rejected"],
      dispute_status: ["open", "resolved", "rejected"],
      event_rsvp_status: ["going", "maybe", "declined"],
      livestream_status: ["scheduled", "live", "ended"],
      membership_source: ["free", "razorpay_sub", "razorpay_order"],
      membership_status: ["active", "pending", "expired", "cancelled"],
      order_status: [
        "pending",
        "confirmed",
        "shipped",
        "delivered",
        "cancelled",
        "return_initiated",
        "return_completed",
      ],
      resource_kind: ["file", "link"],
      tier_kind: ["free", "paid_monthly", "paid_one_time"],
    },
  },
} as const
