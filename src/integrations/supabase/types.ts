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
      post_comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments_public"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          body: string
          created_at: string
          id: string
          is_anonymous: boolean
          like_count: number
          parent_id: string | null
          post_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_anonymous?: boolean
          like_count?: number
          parent_id?: string | null
          post_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_anonymous?: boolean
          like_count?: number
          parent_id?: string | null
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "post_comments_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts_public"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts_public"
            referencedColumns: ["id"]
          },
        ]
      }
      post_media: {
        Row: {
          created_at: string
          id: string
          kind: string
          post_id: string
          sort_order: number
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          post_id: string
          sort_order?: number
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          post_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_media_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_media_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts_public"
            referencedColumns: ["id"]
          },
        ]
      }
      post_saves: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          body: string | null
          category: string | null
          comment_count: number
          created_at: string
          hashtags: string[]
          id: string
          is_anonymous: boolean
          like_count: number
          location: string | null
          music_title: string | null
          music_url: string | null
          review_recommendation: string | null
          review_subcategory: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          category?: string | null
          comment_count?: number
          created_at?: string
          hashtags?: string[]
          id?: string
          is_anonymous?: boolean
          like_count?: number
          location?: string | null
          music_title?: string | null
          music_url?: string | null
          review_recommendation?: string | null
          review_subcategory?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          category?: string | null
          comment_count?: number
          created_at?: string
          hashtags?: string[]
          id?: string
          is_anonymous?: boolean
          like_count?: number
          location?: string | null
          music_title?: string | null
          music_url?: string | null
          review_recommendation?: string | null
          review_subcategory?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
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
      user_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
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
      post_comments_public: {
        Row: {
          body: string | null
          created_at: string | null
          id: string | null
          is_anonymous: boolean | null
          like_count: number | null
          parent_id: string | null
          post_id: string | null
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string | null
          is_anonymous?: boolean | null
          like_count?: number | null
          parent_id?: string | null
          post_id?: string | null
          user_id?: never
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string | null
          is_anonymous?: boolean | null
          like_count?: number | null
          parent_id?: string | null
          post_id?: string | null
          user_id?: never
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "post_comments_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts_public"
            referencedColumns: ["id"]
          },
        ]
      }
      posts_public: {
        Row: {
          body: string | null
          category: string | null
          comment_count: number | null
          created_at: string | null
          hashtags: string[] | null
          id: string | null
          is_anonymous: boolean | null
          like_count: number | null
          location: string | null
          music_title: string | null
          music_url: string | null
          review_recommendation: string | null
          review_subcategory: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          body?: string | null
          category?: string | null
          comment_count?: number | null
          created_at?: string | null
          hashtags?: string[] | null
          id?: string | null
          is_anonymous?: boolean | null
          like_count?: number | null
          location?: string | null
          music_title?: string | null
          music_url?: string | null
          review_recommendation?: string | null
          review_subcategory?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: never
        }
        Update: {
          body?: string | null
          category?: string | null
          comment_count?: number | null
          created_at?: string | null
          hashtags?: string[] | null
          id?: string | null
          is_anonymous?: boolean | null
          like_count?: number | null
          location?: string | null
          music_title?: string | null
          music_url?: string | null
          review_recommendation?: string | null
          review_subcategory?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: never
        }
        Relationships: []
      }
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
      decrement_product_stock: {
        Args: { _product_id: string; _qty: number }
        Returns: boolean
      }
      decrement_variant_stock: {
        Args: { _qty: number; _variant_id: string }
        Returns: boolean
      }
      extract_mention_usernames: { Args: { _text: string }; Returns: string[] }
      get_chat_author_names: {
        Args: { _user_ids: string[] }
        Returns: {
          avatar_url: string
          id: string
          name: string
          username: string
        }[]
      }
      get_comment_like_state: {
        Args: { _comment_ids: string[] }
        Returns: {
          comment_id: string
          like_count: number
          liked_by_me: boolean
        }[]
      }
      get_platform_admin_ids: { Args: never; Returns: string[] }
      get_post_comments_public: {
        Args: { _post_id: string }
        Returns: {
          body: string
          created_at: string
          id: string
          is_anonymous: boolean
          like_count: number
          parent_id: string
          post_id: string
          user_id: string
        }[]
      }
      get_post_public: {
        Args: { _post_id: string }
        Returns: {
          body: string
          category: string
          comment_count: number
          created_at: string
          hashtags: string[]
          id: string
          is_anonymous: boolean
          like_count: number
          location: string
          music_title: string
          music_url: string
          review_recommendation: string
          review_subcategory: string
          title: string
          updated_at: string
          user_id: string
        }[]
      }
      get_public_profiles: {
        Args: { _ids: string[] }
        Returns: {
          avatar_url: string
          id: string
          name: string
          username: string
        }[]
      }
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
      get_trending_posts: {
        Args: { _limit?: number; _offset?: number }
        Returns: {
          body: string
          category: string
          comment_count: number
          cover_kind: string
          cover_url: string
          created_at: string
          hashtags: string[]
          id: string
          is_anonymous: boolean
          like_count: number
          location: string
          media_count: number
          score: number
          title: string
          user_id: string
        }[]
      }
      get_user_post_saves_count: { Args: { _user_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      search_profiles_for_mention: {
        Args: { _q: string }
        Returns: {
          avatar_url: string
          id: string
          name: string
          username: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "creator" | "shopper"
      application_status: "pending" | "approved" | "rejected"
      livestream_status: "scheduled" | "live" | "ended"
      order_status:
        | "pending"
        | "confirmed"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "return_initiated"
        | "return_completed"
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
      livestream_status: ["scheduled", "live", "ended"],
      order_status: [
        "pending",
        "confirmed",
        "shipped",
        "delivered",
        "cancelled",
        "return_initiated",
        "return_completed",
      ],
    },
  },
} as const
