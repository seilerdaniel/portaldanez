/**
 * Tipos generados a mano a partir de supabase/migrations/0001_init.sql.
 *
 * En un proyecto real conviene generarlos automáticamente con:
 *   supabase gen types typescript --local > src/types/database.ts
 * para que nunca queden desincronizados del esquema real. Se dejan
 * escritos a mano acá para que el proyecto compile de forma autocontenida
 * sin depender de una instancia de Supabase corriendo.
 *
 * IMPORTANTE: cada tabla necesita el campo `Relationships` (aunque sea un
 * array vacío) porque supabase-js valida internamente que cada tabla
 * cumpla la forma `GenericTable` de @supabase/postgrest-js. Sin ese campo
 * -y sin `Record<string, unknown>` válido en Insert/Update, en vez de
 * `never`- el chequeo de tipos falla silenciosamente y TODAS las columnas
 * de TODAS las tablas terminan tipadas como `never`. Ya nos pasó una vez:
 * si esto se vuelve a romper, es la primera causa a revisar.
 */

export type AppRole = "reader" | "writer" | "admin";
export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";
export type PayoutStatus = "pending" | "processing" | "completed" | "failed";
export type FileType = "pdf" | "epub";

export interface Database {
  public: {
    Tables: {
      genres: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["genres"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["genres"]["Row"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          user_id: string;
          display_name: string;
          bio: string | null;
          avatar_url: string | null;
          website: string | null;
          location: string | null;
          social_links: Record<string, string>;
          mercadopago_email: string | null;
          mercadopago_connected: boolean;
          mercadopago_collector_id: string | null;
          mercadopago_connected_at: string | null;
          balance: number;
          total_earnings: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: AppRole;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["user_roles"]["Row"]> & {
          user_id: string;
          role: AppRole;
        };
        // No se actualiza nunca desde el cliente (solo insert/delete).
        Update: Record<string, never>;
        Relationships: [];
      };
      books: {
        Row: {
          id: string;
          author_id: string;
          genre_id: string | null;
          title: string;
          slug: string;
          description: string;
          synopsis: string | null;
          price: number;
          cover_url: string | null;
          file_url: string | null;
          file_type: FileType | null;
          page_count: number | null;
          language: string;
          isbn: string | null;
          is_published: boolean;
          is_featured: boolean;
          total_sales: number;
          total_revenue: number;
          average_rating: number;
          review_count: number;
          created_at: string;
          updated_at: string;
          published_at: string | null;
          search_vector: unknown;
        };
        Insert: Partial<Database["public"]["Tables"]["books"]["Row"]> & {
          author_id: string;
          title: string;
          slug: string;
          description: string;
          price: number;
        };
        Update: Partial<Database["public"]["Tables"]["books"]["Row"]>;
        Relationships: [];
      };
      purchases: {
        Row: {
          id: string;
          user_id: string;
          book_id: string;
          amount: number;
          platform_fee: number;
          author_earning: number;
          payment_method: string;
          payment_id: string | null;
          payment_status: PaymentStatus;
          created_at: string;
          completed_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["purchases"]["Row"]> & {
          user_id: string;
          book_id: string;
          amount: number;
          platform_fee: number;
          author_earning: number;
        };
        Update: Partial<Database["public"]["Tables"]["purchases"]["Row"]>;
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          user_id: string;
          book_id: string;
          rating: number;
          comment: string | null;
          is_verified_purchase: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["reviews"]["Row"]> & {
          user_id: string;
          book_id: string;
          rating: number;
        };
        Update: Partial<Database["public"]["Tables"]["reviews"]["Row"]>;
        Relationships: [];
      };
      favorites: {
        Row: {
          id: string;
          user_id: string;
          book_id: string;
          created_at: string;
        };
        Insert: { user_id: string; book_id: string };
        // Los favoritos no se editan, solo se crean o se borran.
        Update: Record<string, never>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: "purchase" | "sale" | "payout" | "new_release" | "system";
          title: string;
          message: string;
          data: Record<string, unknown> | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["notifications"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["notifications"]["Row"]>;
        Relationships: [];
      };
      writer_payouts: {
        Row: {
          id: string;
          writer_id: string;
          amount: number;
          destination_email: string;
          status: PayoutStatus;
          notes: string | null;
          created_at: string;
          processed_at: string | null;
        };
        // Nunca se insertan directamente desde el cliente: la única vía es
        // la función request_payout() vía .rpc(). El UPDATE sí lo usa el
        // panel de admin para cambiar el estado del retiro.
        Insert: Record<string, never>;
        Update: Partial<{
          status: PayoutStatus;
          notes: string | null;
          processed_at: string | null;
        }>;
        Relationships: [];
      };
      webhook_events: {
        Row: {
          id: string;
          payment_id: string;
          event_type: string;
          processed_at: string;
        };
        // Solo el webhook, usando la service role key, escribe acá.
        Insert: { payment_id: string; event_type: string };
        Update: Record<string, never>;
        Relationships: [];
      };
      mercadopago_oauth_states: {
        Row: {
          profile_id: string;
          state: string;
          expires_at: string;
        };
        Insert: { profile_id: string; state: string; expires_at: string };
        Update: Record<string, never>;
        Relationships: [];
      };
      writer_mercadopago_accounts: {
        Row: {
          profile_id: string;
          mp_user_id: string;
          access_token: string;
          refresh_token: string;
          public_key: string | null;
          scope: string | null;
          expires_at: string;
          connected_at: string;
          updated_at: string;
        };
        // Sin políticas RLS a propósito: solo la service role key opera
        // esta tabla (ver lib/mercadopago/oauth.ts). Nunca se llama desde
        // el cliente del browser ni con la anon key.
        Insert: {
          profile_id: string;
          mp_user_id: string;
          access_token: string;
          refresh_token: string;
          public_key?: string | null;
          scope?: string | null;
          expires_at: string;
        };
        Update: Partial<{
          access_token: string;
          refresh_token: string;
          expires_at: string;
        }>;
        Relationships: [];
      };
    };
    Views: {
      public_profiles: {
        Row: {
          id: string;
          display_name: string;
          bio: string | null;
          avatar_url: string | null;
          website: string | null;
          location: string | null;
          social_links: Record<string, string>;
          created_at: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      request_payout: {
        Args: { _amount: number; _destination_email: string };
        Returns: Database["public"]["Tables"]["writer_payouts"]["Row"];
      };
      is_writer: {
        Args: { _user_id: string };
        Returns: boolean;
      };
      check_rate_limit: {
        Args: { _key: string; _max_requests: number; _window_seconds: number };
        Returns: boolean;
      };
    };
  };
}

export type Book = Database["public"]["Tables"]["books"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type PublicProfile = Database["public"]["Views"]["public_profiles"]["Row"];
export type Purchase = Database["public"]["Tables"]["purchases"]["Row"];
export type Review = Database["public"]["Tables"]["reviews"]["Row"];
export type Genre = Database["public"]["Tables"]["genres"]["Row"];
export type WriterPayout = Database["public"]["Tables"]["writer_payouts"]["Row"];
