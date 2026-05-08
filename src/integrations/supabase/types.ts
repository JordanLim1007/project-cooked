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
      cooking_progress: {
        Row: {
          checked_ingredient_ids: string[]
          created_at: string
          current_step: number
          id: string
          is_complete: boolean
          recipe_id: string
          timer_state: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          checked_ingredient_ids?: string[]
          created_at?: string
          current_step?: number
          id?: string
          is_complete?: boolean
          recipe_id: string
          timer_state?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          checked_ingredient_ids?: string[]
          created_at?: string
          current_step?: number
          id?: string
          is_complete?: boolean
          recipe_id?: string
          timer_state?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cooking_progress_recipe_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
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
        Relationships: [
          {
            foreignKeyName: "follows_follower_profile_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_profile_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string
          data: Json
          id: string
          is_read: boolean
          recipe_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          data?: Json
          id?: string
          is_read?: boolean
          recipe_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          data?: Json
          id?: string
          is_read?: boolean
          recipe_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      recipe_images: {
        Row: {
          id: string
          image_url: string
          position: number
          recipe_id: string
        }
        Insert: {
          id?: string
          image_url: string
          position?: number
          recipe_id: string
        }
        Update: {
          id?: string
          image_url?: string
          position?: number
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_images_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_ingredients: {
        Row: {
          id: string
          image_url: string | null
          is_optional: boolean
          name: string
          position: number
          quantity: string | null
          recipe_id: string
        }
        Insert: {
          id?: string
          image_url?: string | null
          is_optional?: boolean
          name: string
          position?: number
          quantity?: string | null
          recipe_id: string
        }
        Update: {
          id?: string
          image_url?: string | null
          is_optional?: boolean
          name?: string
          position?: number
          quantity?: string | null
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_likes: {
        Row: {
          created_at: string
          recipe_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          recipe_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          recipe_id?: string
          user_id?: string
        }
        Relationships: []
      }
      recipe_schedule: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          recipe_id: string
          scheduled_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          recipe_id: string
          scheduled_date: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          recipe_id?: string
          scheduled_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_schedule_recipe_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_steps: {
        Row: {
          animation_key: string | null
          emphasis: Json | null
          id: string
          keywords: string[] | null
          position: number
          recipe_id: string
          text: string
          timer_seconds: number | null
          title: string | null
        }
        Insert: {
          animation_key?: string | null
          emphasis?: Json | null
          id?: string
          keywords?: string[] | null
          position?: number
          recipe_id: string
          text: string
          timer_seconds?: number | null
          title?: string | null
        }
        Update: {
          animation_key?: string | null
          emphasis?: Json | null
          id?: string
          keywords?: string[] | null
          position?: number
          recipe_id?: string
          text?: string
          timer_seconds?: number | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_steps_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          calories: number | null
          cooking_style: string | null
          cover_image_url: string | null
          created_at: string
          cuisine: string | null
          description: string | null
          difficulty: string | null
          food_type: string | null
          id: string
          is_published: boolean
          is_vegan: boolean
          meal_type: string | null
          meal_types: string[]
          spice_level: string | null
          time_minutes: number | null
          tips: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          calories?: number | null
          cooking_style?: string | null
          cover_image_url?: string | null
          created_at?: string
          cuisine?: string | null
          description?: string | null
          difficulty?: string | null
          food_type?: string | null
          id?: string
          is_published?: boolean
          is_vegan?: boolean
          meal_type?: string | null
          meal_types?: string[]
          spice_level?: string | null
          time_minutes?: number | null
          tips?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          calories?: number | null
          cooking_style?: string | null
          cover_image_url?: string | null
          created_at?: string
          cuisine?: string | null
          description?: string | null
          difficulty?: string | null
          food_type?: string | null
          id?: string
          is_published?: boolean
          is_vegan?: boolean
          meal_type?: string | null
          meal_types?: string[]
          spice_level?: string | null
          time_minutes?: number | null
          tips?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipes_author_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      review_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          position: number
          review_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          position?: number
          review_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          position?: number
          review_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_images_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rating: number
          recipe_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          recipe_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          recipe_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_author_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_recipes: {
        Row: {
          created_at: string
          recipe_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          recipe_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          recipe_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_recipes_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          cooking_styles: string[]
          created_at: string
          cuisines: string[]
          spice_level: string | null
          time_preference: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cooking_styles?: string[]
          created_at?: string
          cuisines?: string[]
          spice_level?: string | null
          time_preference?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cooking_styles?: string[]
          created_at?: string
          cuisines?: string[]
          spice_level?: string | null
          time_preference?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
