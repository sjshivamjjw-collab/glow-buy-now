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
      post_drafts: {
        Row: {
          created_at: string
          device_label: string | null
          media: Json
          payload: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_label?: string | null
          media?: Json
          payload?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_label?: string | null
          media?: Json
          payload?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      post_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          post_id: string
          reason: string
          reporter_id: string
          resolved_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          post_id: string
          reason: string
          reporter_id: string
          resolved_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          post_id?: string
          reason?: string
          reporter_id?: string
          resolved_at?: string | null
          status?: string
        }
        Relationships: []
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
          cover_kind: string | null
          cover_url: string | null
          created_at: string
          hashtags: string[]
          id: string
          is_anonymous: boolean
          is_hidden: boolean
          like_count: number
          location: string | null
          location_norm: string | null
          music_title: string | null
          music_url: string | null
          review_recommendation: string | null
          review_subcategory: string | null
          search_tsv: unknown
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          category?: string | null
          comment_count?: number
          cover_kind?: string | null
          cover_url?: string | null
          created_at?: string
          hashtags?: string[]
          id?: string
          is_anonymous?: boolean
          is_hidden?: boolean
          like_count?: number
          location?: string | null
          location_norm?: string | null
          music_title?: string | null
          music_url?: string | null
          review_recommendation?: string | null
          review_subcategory?: string | null
          search_tsv?: unknown
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          category?: string | null
          comment_count?: number
          cover_kind?: string | null
          cover_url?: string | null
          created_at?: string
          hashtags?: string[]
          id?: string
          is_anonymous?: boolean
          is_hidden?: boolean
          like_count?: number
          location?: string | null
          location_norm?: string | null
          music_title?: string | null
          music_url?: string | null
          review_recommendation?: string | null
          review_subcategory?: string | null
          search_tsv?: unknown
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          gender: string | null
          id: string
          interested_categories: string[] | null
          interests: string[]
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
          email?: string | null
          gender?: string | null
          id: string
          interested_categories?: string[] | null
          interests?: string[]
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
          email?: string | null
          gender?: string | null
          id?: string
          interested_categories?: string[] | null
          interests?: string[]
          name?: string | null
          onboarding_completed?: boolean
          phone?: string | null
          username?: string | null
        }
        Relationships: []
      }
      reel_submission_media: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          kind: string
          sort_order: number
          storage_path: string
          submission_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          kind: string
          sort_order?: number
          storage_path: string
          submission_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          kind?: string
          sort_order?: number
          storage_path?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_submission_media_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "reel_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      reel_submissions: {
        Row: {
          cost_text: string | null
          created_at: string
          destination: string
          duration_days: number | null
          duration_label: string
          editor_notes: string | null
          id: string
          insights: Json
          itinerary: Json
          itinerary_enabled: boolean
          itinerary_kind: string | null
          status: string
          trip_title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cost_text?: string | null
          created_at?: string
          destination: string
          duration_days?: number | null
          duration_label: string
          editor_notes?: string | null
          id?: string
          insights?: Json
          itinerary?: Json
          itinerary_enabled?: boolean
          itinerary_kind?: string | null
          status?: string
          trip_title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cost_text?: string | null
          created_at?: string
          destination?: string
          duration_days?: number | null
          duration_label?: string
          editor_notes?: string | null
          id?: string
          insights?: Json
          itinerary?: Json
          itinerary_enabled?: boolean
          itinerary_kind?: string | null
          status?: string
          trip_title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
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
    }
    Functions: {
      extract_mention_usernames: { Args: { _text: string }; Returns: string[] }
      generate_username_from_email: {
        Args: { _email: string }
        Returns: string
      }
      get_blocked_user_ids: { Args: { _viewer: string }; Returns: string[] }
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
      normalize_location: { Args: { _loc: string }; Returns: string }
      search_hashtags: {
        Args: { _limit?: number; _q: string }
        Returns: {
          post_count: number
          tag: string
        }[]
      }
      search_locations: {
        Args: { _limit?: number; _q: string }
        Returns: {
          location: string
          post_count: number
        }[]
      }
      search_people: {
        Args: { _limit?: number; _q: string }
        Returns: {
          avatar_url: string
          id: string
          name: string
          score: number
          username: string
        }[]
      }
      search_posts: {
        Args: { _limit?: number; _offset?: number; _q: string }
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
          rank: number
          title: string
          user_id: string
        }[]
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
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "creator" | "shopper"
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
    },
  },
} as const
