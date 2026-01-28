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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string
          admin_id: string
          admin_username: string
          created_at: string
          details: Json | null
          id: string
          resource_id: string | null
          resource_type: string
        }
        Insert: {
          action: string
          admin_id: string
          admin_username: string
          created_at?: string
          details?: Json | null
          id?: string
          resource_id?: string | null
          resource_type: string
        }
        Update: {
          action?: string
          admin_id?: string
          admin_username?: string
          created_at?: string
          details?: Json | null
          id?: string
          resource_id?: string | null
          resource_type?: string
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_active: boolean | null
          last_login_at: string | null
          password_hash: string
          totp_enabled: boolean | null
          totp_secret: string | null
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          password_hash: string
          totp_enabled?: boolean | null
          totp_secret?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          password_hash?: string
          totp_enabled?: boolean | null
          totp_secret?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      advanced_kyc_verifications: {
        Row: {
          aml_acknowledgment: boolean | null
          annual_income: string | null
          created_at: string | null
          id: string
          income_source: string | null
          investment_experience: string | null
          investment_purpose: string | null
          occupation: string | null
          reject_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          risk_acknowledgment: boolean | null
          status: string | null
          submitted_at: string | null
          updated_at: string | null
          user_id: string
          video_url: string | null
        }
        Insert: {
          aml_acknowledgment?: boolean | null
          annual_income?: string | null
          created_at?: string | null
          id?: string
          income_source?: string | null
          investment_experience?: string | null
          investment_purpose?: string | null
          occupation?: string | null
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_acknowledgment?: boolean | null
          status?: string | null
          submitted_at?: string | null
          updated_at?: string | null
          user_id: string
          video_url?: string | null
        }
        Update: {
          aml_acknowledgment?: boolean | null
          annual_income?: string | null
          created_at?: string | null
          id?: string
          income_source?: string | null
          investment_experience?: string | null
          investment_purpose?: string | null
          occupation?: string | null
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_acknowledgment?: boolean | null
          status?: string | null
          submitted_at?: string | null
          updated_at?: string | null
          user_id?: string
          video_url?: string | null
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          api_key: string
          api_secret: string
          api_secret_encrypted: string | null
          created_at: string
          exchange: string
          id: string
          is_active: boolean | null
          passphrase: string | null
          passphrase_encrypted: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key: string
          api_secret: string
          api_secret_encrypted?: string | null
          created_at?: string
          exchange: string
          id?: string
          is_active?: boolean | null
          passphrase?: string | null
          passphrase_encrypted?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key?: string
          api_secret?: string
          api_secret_encrypted?: string | null
          created_at?: string
          exchange?: string
          id?: string
          is_active?: boolean | null
          passphrase?: string | null
          passphrase_encrypted?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: unknown
          resource_id: string | null
          resource_type: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          resource_id?: string | null
          resource_type: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          resource_id?: string | null
          resource_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crypto_news: {
        Row: {
          category: string
          content: string | null
          created_at: string
          id: string
          image_url: string | null
          is_hot: boolean | null
          language: string | null
          published_at: string
          source: string
          source_url: string | null
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_hot?: boolean | null
          language?: string | null
          published_at: string
          source: string
          source_url?: string | null
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_hot?: boolean | null
          language?: string | null
          published_at?: string
          source?: string
          source_url?: string | null
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      cs_agents: {
        Row: {
          avatar_url: string | null
          created_at: string
          current_conversations: number | null
          display_name: string
          id: string
          is_active: boolean | null
          is_online: boolean | null
          last_login_at: string | null
          max_conversations: number | null
          password_hash: string
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          current_conversations?: number | null
          display_name: string
          id?: string
          is_active?: boolean | null
          is_online?: boolean | null
          last_login_at?: string | null
          max_conversations?: number | null
          password_hash: string
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          current_conversations?: number | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          is_online?: boolean | null
          last_login_at?: string | null
          max_conversations?: number | null
          password_hash?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      cs_conversations: {
        Row: {
          agent_id: string | null
          created_at: string
          ended_at: string | null
          id: string
          is_ai_mode: boolean | null
          last_message_at: string | null
          last_message_preview: string | null
          priority: number | null
          rated_at: string | null
          rating: number | null
          rating_comment: string | null
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          is_ai_mode?: boolean | null
          last_message_at?: string | null
          last_message_preview?: string | null
          priority?: number | null
          rated_at?: string | null
          rating?: number | null
          rating_comment?: string | null
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          is_ai_mode?: boolean | null
          last_message_at?: string | null
          last_message_preview?: string | null
          priority?: number | null
          rated_at?: string | null
          rating?: number | null
          rating_comment?: string | null
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cs_conversations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "cs_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      cs_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          image_url: string | null
          is_read: boolean | null
          message_type: string | null
          read_at: string | null
          sender_id: string | null
          sender_type: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_read?: boolean | null
          message_type?: string | null
          read_at?: string | null
          sender_id?: string | null
          sender_type: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_read?: boolean | null
          message_type?: string | null
          read_at?: string | null
          sender_id?: string | null
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "cs_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "cs_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      cs_quick_replies: {
        Row: {
          category: string | null
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          sort_order: number | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cs_quick_replies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "cs_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      cs_transfers: {
        Row: {
          conversation_id: string
          created_at: string
          from_agent_id: string | null
          id: string
          reason: string | null
          to_agent_id: string | null
        }
        Insert: {
          conversation_id: string
          created_at?: string
          from_agent_id?: string | null
          id?: string
          reason?: string | null
          to_agent_id?: string | null
        }
        Update: {
          conversation_id?: string
          created_at?: string
          from_agent_id?: string | null
          id?: string
          reason?: string | null
          to_agent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cs_transfers_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "cs_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cs_transfers_from_agent_id_fkey"
            columns: ["from_agent_id"]
            isOneToOne: false
            referencedRelation: "cs_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cs_transfers_to_agent_id_fkey"
            columns: ["to_agent_id"]
            isOneToOne: false
            referencedRelation: "cs_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      deposit_addresses: {
        Row: {
          address: string
          coin_name: string
          coin_symbol: string
          confirmations_required: number | null
          created_at: string
          id: string
          is_active: boolean | null
          min_deposit: number | null
          network: string
          qr_code_url: string | null
          updated_at: string
        }
        Insert: {
          address: string
          coin_name: string
          coin_symbol: string
          confirmations_required?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          min_deposit?: number | null
          network: string
          qr_code_url?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
          coin_name?: string
          coin_symbol?: string
          confirmations_required?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          min_deposit?: number | null
          network?: string
          qr_code_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      deposit_records: {
        Row: {
          amount: number
          coin_symbol: string
          confirmations: number | null
          created_at: string
          from_address: string | null
          id: string
          network: string
          screenshot_url: string | null
          status: string
          submit_method: string | null
          to_address: string
          tx_hash: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          coin_symbol: string
          confirmations?: number | null
          created_at?: string
          from_address?: string | null
          id?: string
          network: string
          screenshot_url?: string | null
          status?: string
          submit_method?: string | null
          to_address: string
          tx_hash?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          coin_symbol?: string
          confirmations?: number | null
          created_at?: string
          from_address?: string | null
          id?: string
          network?: string
          screenshot_url?: string | null
          status?: string
          submit_method?: string | null
          to_address?: string
          tx_hash?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      earn_products: {
        Row: {
          apy_rate: number
          coin_name: string
          coin_symbol: string
          created_at: string
          id: string
          is_active: boolean | null
          lock_period_days: number | null
          max_amount: number | null
          min_amount: number
          product_type: string
          return_type: string | null
          risk_level: string
          total_value_locked: number | null
          updated_at: string
        }
        Insert: {
          apy_rate: number
          coin_name: string
          coin_symbol: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          lock_period_days?: number | null
          max_amount?: number | null
          min_amount?: number
          product_type: string
          return_type?: string | null
          risk_level: string
          total_value_locked?: number | null
          updated_at?: string
        }
        Update: {
          apy_rate?: number
          coin_name?: string
          coin_symbol?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          lock_period_days?: number | null
          max_amount?: number | null
          min_amount?: number
          product_type?: string
          return_type?: string | null
          risk_level?: string
          total_value_locked?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      earn_subscriptions: {
        Row: {
          amount: number
          created_at: string
          earned_interest: number | null
          end_date: string | null
          id: string
          last_interest_date: string | null
          product_id: string
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          earned_interest?: number | null
          end_date?: string | null
          id?: string
          last_interest_date?: string | null
          product_id: string
          start_date?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          earned_interest?: number | null
          end_date?: string | null
          id?: string
          last_interest_date?: string | null
          product_id?: string
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "earn_subscriptions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "earn_products"
            referencedColumns: ["id"]
          },
        ]
      }
      email_verifications: {
        Row: {
          code: string
          created_at: string | null
          email: string
          expires_at: string
          verified: boolean | null
        }
        Insert: {
          code: string
          created_at?: string | null
          email: string
          expires_at: string
          verified?: boolean | null
        }
        Update: {
          code?: string
          created_at?: string | null
          email?: string
          expires_at?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      expert_showcases: {
        Row: {
          created_at: string
          description: string | null
          direction: string
          entry_price: number | null
          exit_price: number | null
          expert_avatar: string | null
          expert_name: string
          id: string
          image_url: string | null
          is_active: boolean | null
          leverage: number
          profit_amount: number
          profit_percent: number
          symbol: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          direction?: string
          entry_price?: number | null
          exit_price?: number | null
          expert_avatar?: string | null
          expert_name: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          leverage?: number
          profit_amount?: number
          profit_percent?: number
          symbol?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          direction?: string
          entry_price?: number | null
          exit_price?: number | null
          expert_avatar?: string | null
          expert_name?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          leverage?: number
          profit_amount?: number
          profit_percent?: number
          symbol?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      expert_strategies: {
        Row: {
          config: Json
          created_at: string
          description: string | null
          expert_avatar: string | null
          expert_name: string
          followers_count: number
          id: string
          is_active: boolean | null
          min_investment: number
          name: string
          profit_rate: number
          risk_level: string
          strategy_type: string
          symbol: string
          total_profit: number
          total_trades: number
          updated_at: string
          win_rate: number
        }
        Insert: {
          config?: Json
          created_at?: string
          description?: string | null
          expert_avatar?: string | null
          expert_name: string
          followers_count?: number
          id?: string
          is_active?: boolean | null
          min_investment?: number
          name: string
          profit_rate?: number
          risk_level?: string
          strategy_type?: string
          symbol?: string
          total_profit?: number
          total_trades?: number
          updated_at?: string
          win_rate?: number
        }
        Update: {
          config?: Json
          created_at?: string
          description?: string | null
          expert_avatar?: string | null
          expert_name?: string
          followers_count?: number
          id?: string
          is_active?: boolean | null
          min_investment?: number
          name?: string
          profit_rate?: number
          risk_level?: string
          strategy_type?: string
          symbol?: string
          total_profit?: number
          total_trades?: number
          updated_at?: string
          win_rate?: number
        }
        Relationships: []
      }
      expert_strategy_subscriptions: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          investment_amount: number
          profit: number | null
          started_at: string
          status: string
          strategy_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          investment_amount: number
          profit?: number | null
          started_at?: string
          status?: string
          strategy_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          investment_amount?: number
          profit?: number | null
          started_at?: string
          status?: string
          strategy_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expert_strategy_subscriptions_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "expert_strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_trades: {
        Row: {
          amount: number
          created_at: string
          id: string
          leverage: number
          showcase_id: string
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          leverage?: number
          showcase_id: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          leverage?: number
          showcase_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_trades_showcase_id_fkey"
            columns: ["showcase_id"]
            isOneToOne: false
            referencedRelation: "expert_showcases"
            referencedColumns: ["id"]
          },
        ]
      }
      futures_contracts: {
        Row: {
          contract_size: number
          created_at: string
          expiry_date: string | null
          id: string
          is_active: boolean | null
          is_perpetual: boolean | null
          maintenance_margin: number | null
          max_leverage: number | null
          name: string
          symbol: string
          tick_size: number
          underlying: string
          updated_at: string
        }
        Insert: {
          contract_size?: number
          created_at?: string
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          is_perpetual?: boolean | null
          maintenance_margin?: number | null
          max_leverage?: number | null
          name: string
          symbol: string
          tick_size?: number
          underlying: string
          updated_at?: string
        }
        Update: {
          contract_size?: number
          created_at?: string
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          is_perpetual?: boolean | null
          maintenance_margin?: number | null
          max_leverage?: number | null
          name?: string
          symbol?: string
          tick_size?: number
          underlying?: string
          updated_at?: string
        }
        Relationships: []
      }
      futures_orders: {
        Row: {
          avg_fill_price: number | null
          created_at: string
          filled_quantity: number | null
          id: string
          leverage: number
          order_type: string
          position_side: string
          price: number | null
          quantity: number
          reduce_only: boolean | null
          side: string
          status: string
          stop_price: number | null
          symbol: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_fill_price?: number | null
          created_at?: string
          filled_quantity?: number | null
          id?: string
          leverage?: number
          order_type: string
          position_side?: string
          price?: number | null
          quantity: number
          reduce_only?: boolean | null
          side: string
          status?: string
          stop_price?: number | null
          symbol: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_fill_price?: number | null
          created_at?: string
          filled_quantity?: number | null
          id?: string
          leverage?: number
          order_type?: string
          position_side?: string
          price?: number | null
          quantity?: number
          reduce_only?: boolean | null
          side?: string
          status?: string
          stop_price?: number | null
          symbol?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      futures_positions: {
        Row: {
          closed_at: string | null
          created_at: string
          entry_price: number
          id: string
          leverage: number
          liquidation_price: number | null
          margin: number
          mark_price: number | null
          quantity: number
          realized_pnl: number | null
          side: string
          status: string
          symbol: string
          unrealized_pnl: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          entry_price?: number
          id?: string
          leverage?: number
          liquidation_price?: number | null
          margin?: number
          mark_price?: number | null
          quantity?: number
          realized_pnl?: number | null
          side: string
          status?: string
          symbol: string
          unrealized_pnl?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          entry_price?: number
          id?: string
          leverage?: number
          liquidation_price?: number | null
          margin?: number
          mark_price?: number | null
          quantity?: number
          realized_pnl?: number | null
          side?: string
          status?: string
          symbol?: string
          unrealized_pnl?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      kyc_verifications: {
        Row: {
          address: string | null
          created_at: string
          id: string
          id_back_url: string | null
          id_front_url: string | null
          id_number: string
          id_type: string
          kyc_level: string
          nationality: string | null
          occupation: string | null
          real_name: string
          reject_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_url: string | null
          status: string
          submitted_at: string
          trading_limit: number | null
          updated_at: string
          user_id: string
          video_url: string | null
          withdrawal_limit: number | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          id_back_url?: string | null
          id_front_url?: string | null
          id_number: string
          id_type: string
          kyc_level?: string
          nationality?: string | null
          occupation?: string | null
          real_name: string
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string | null
          status?: string
          submitted_at?: string
          trading_limit?: number | null
          updated_at?: string
          user_id: string
          video_url?: string | null
          withdrawal_limit?: number | null
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          id_back_url?: string | null
          id_front_url?: string | null
          id_number?: string
          id_type?: string
          kyc_level?: string
          nationality?: string | null
          occupation?: string | null
          real_name?: string
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string | null
          status?: string
          submitted_at?: string
          trading_limit?: number | null
          updated_at?: string
          user_id?: string
          video_url?: string | null
          withdrawal_limit?: number | null
        }
        Relationships: []
      }
      mining_products: {
        Row: {
          allow_early_redemption: boolean | null
          created_at: string
          daily_rate: number
          description: string | null
          early_redemption_fee: number | null
          expected_profit: number
          icon_type: string | null
          id: string
          is_active: boolean | null
          is_free: boolean | null
          max_amount: number | null
          min_amount: number
          name: string
          period_days: number
          return_type: string | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          allow_early_redemption?: boolean | null
          created_at?: string
          daily_rate?: number
          description?: string | null
          early_redemption_fee?: number | null
          expected_profit?: number
          icon_type?: string | null
          id?: string
          is_active?: boolean | null
          is_free?: boolean | null
          max_amount?: number | null
          min_amount?: number
          name: string
          period_days?: number
          return_type?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          allow_early_redemption?: boolean | null
          created_at?: string
          daily_rate?: number
          description?: string | null
          early_redemption_fee?: number | null
          expected_profit?: number
          icon_type?: string | null
          id?: string
          is_active?: boolean | null
          is_free?: boolean | null
          max_amount?: number | null
          min_amount?: number
          name?: string
          period_days?: number
          return_type?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      otc_merchants: {
        Row: {
          completion_rate: number
          created_at: string
          id: string
          is_active: boolean | null
          merchant_level: string
          merchant_name: string
          support_coins: string[]
          updated_at: string
        }
        Insert: {
          completion_rate?: number
          created_at?: string
          id?: string
          is_active?: boolean | null
          merchant_level: string
          merchant_name: string
          support_coins?: string[]
          updated_at?: string
        }
        Update: {
          completion_rate?: number
          created_at?: string
          id?: string
          is_active?: boolean | null
          merchant_level?: string
          merchant_name?: string
          support_coins?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      otc_orders: {
        Row: {
          amount: number
          coin_symbol: string
          completed_at: string | null
          created_at: string
          id: string
          merchant_id: string
          order_type: string
          payment_method: string | null
          price: number
          status: string
          total_usd: number
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          coin_symbol: string
          completed_at?: string | null
          created_at?: string
          id?: string
          merchant_id: string
          order_type: string
          payment_method?: string | null
          price: number
          status?: string
          total_usd: number
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          coin_symbol?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          merchant_id?: string
          order_type?: string
          payment_method?: string | null
          price?: number
          status?: string
          total_usd?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "otc_orders_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "otc_merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      otc_prices: {
        Row: {
          avg_response_time: number
          coin_symbol: string
          created_at: string
          id: string
          is_active: boolean | null
          max_limit: number
          merchant_id: string
          min_limit: number
          price: number
          updated_at: string
        }
        Insert: {
          avg_response_time?: number
          coin_symbol: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          max_limit: number
          merchant_id: string
          min_limit: number
          price: number
          updated_at?: string
        }
        Update: {
          avg_response_time?: number
          coin_symbol?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          max_limit?: number
          merchant_id?: string
          min_limit?: number
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "otc_prices_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "otc_merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_attempts: {
        Row: {
          created_at: string | null
          id: string
          phone: string
          success: boolean | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          phone: string
          success?: boolean | null
        }
        Update: {
          created_at?: string | null
          id?: string
          phone?: string
          success?: boolean | null
        }
        Relationships: []
      }
      perpetual_positions: {
        Row: {
          amount: number
          close_price: number | null
          closed_at: string | null
          created_at: string
          entry_price: number
          id: string
          leverage: number
          liquidation_price: number | null
          margin: number
          side: string
          status: string
          symbol: string
          unrealized_pnl: number | null
          user_id: string
        }
        Insert: {
          amount: number
          close_price?: number | null
          closed_at?: string | null
          created_at?: string
          entry_price: number
          id?: string
          leverage: number
          liquidation_price?: number | null
          margin: number
          side: string
          status?: string
          symbol: string
          unrealized_pnl?: number | null
          user_id: string
        }
        Update: {
          amount?: number
          close_price?: number | null
          closed_at?: string | null
          created_at?: string
          entry_price?: number
          id?: string
          leverage?: number
          liquidation_price?: number | null
          margin?: number
          side?: string
          status?: string
          symbol?: string
          unrealized_pnl?: number | null
          user_id?: string
        }
        Relationships: []
      }
      platform_announcements: {
        Row: {
          content: string | null
          created_at: string
          id: string
          is_important: boolean | null
          published_at: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          is_important?: boolean | null
          published_at?: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          is_important?: boolean | null
          published_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_notices: {
        Row: {
          content: string
          created_at: string
          end_time: string | null
          id: string
          is_active: boolean | null
          link_url: string | null
          priority: number | null
          start_time: string | null
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          end_time?: string | null
          id?: string
          is_active?: boolean | null
          link_url?: string | null
          priority?: number | null
          start_time?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          end_time?: string | null
          id?: string
          is_active?: boolean | null
          link_url?: string | null
          priority?: number | null
          start_time?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          has_password: boolean | null
          id: string
          is_vip: boolean | null
          language_preference: string | null
          updated_at: string
          user_number: number
          username: string
          vip_level: number | null
          wallet_address: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          has_password?: boolean | null
          id: string
          is_vip?: boolean | null
          language_preference?: string | null
          updated_at?: string
          user_number?: number
          username: string
          vip_level?: number | null
          wallet_address?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          has_password?: boolean | null
          id?: string
          is_vip?: boolean | null
          language_preference?: string | null
          updated_at?: string
          user_number?: number
          username?: string
          vip_level?: number | null
          wallet_address?: string | null
        }
        Relationships: []
      }
      pwa_installations: {
        Row: {
          browser: string | null
          created_at: string
          device_type: string
          id: string
          installed_at: string
          is_active: boolean | null
          last_opened_at: string | null
          open_count: number | null
          os_version: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          browser?: string | null
          created_at?: string
          device_type: string
          id?: string
          installed_at?: string
          is_active?: boolean | null
          last_opened_at?: string | null
          open_count?: number | null
          os_version?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          browser?: string | null
          created_at?: string
          device_type?: string
          id?: string
          installed_at?: string
          is_active?: boolean | null
          last_opened_at?: string | null
          open_count?: number | null
          os_version?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      second_contract_orders: {
        Row: {
          admin_result: string | null
          amount: number
          created_at: string
          direction: string
          duration: number
          entry_price: number
          final_price: number | null
          id: string
          profit: number | null
          result: string | null
          settled_at: string | null
          settlement_time: string
          status: string
          symbol: string
          user_id: string
          yield_rate: number | null
        }
        Insert: {
          admin_result?: string | null
          amount: number
          created_at?: string
          direction: string
          duration: number
          entry_price: number
          final_price?: number | null
          id?: string
          profit?: number | null
          result?: string | null
          settled_at?: string | null
          settlement_time: string
          status?: string
          symbol?: string
          user_id: string
          yield_rate?: number | null
        }
        Update: {
          admin_result?: string | null
          amount?: number
          created_at?: string
          direction?: string
          duration?: number
          entry_price?: number
          final_price?: number | null
          id?: string
          profit?: number | null
          result?: string | null
          settled_at?: string | null
          settlement_time?: string
          status?: string
          symbol?: string
          user_id?: string
          yield_rate?: number | null
        }
        Relationships: []
      }
      stock_orders: {
        Row: {
          avg_fill_price: number | null
          created_at: string
          filled_quantity: number | null
          id: string
          order_type: string
          price: number | null
          quantity: number
          side: string
          status: string
          stop_price: number | null
          symbol: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_fill_price?: number | null
          created_at?: string
          filled_quantity?: number | null
          id?: string
          order_type: string
          price?: number | null
          quantity: number
          side: string
          status?: string
          stop_price?: number | null
          symbol: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_fill_price?: number | null
          created_at?: string
          filled_quantity?: number | null
          id?: string
          order_type?: string
          price?: number | null
          quantity?: number
          side?: string
          status?: string
          stop_price?: number | null
          symbol?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stock_positions: {
        Row: {
          avg_cost: number
          created_at: string
          id: string
          market_value: number | null
          quantity: number
          realized_pnl: number | null
          symbol: string
          unrealized_pnl: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_cost?: number
          created_at?: string
          id?: string
          market_value?: number | null
          quantity?: number
          realized_pnl?: number | null
          symbol: string
          unrealized_pnl?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_cost?: number
          created_at?: string
          id?: string
          market_value?: number | null
          quantity?: number
          realized_pnl?: number | null
          symbol?: string
          unrealized_pnl?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stock_symbols: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          market: string
          name: string
          sector: string | null
          symbol: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          market?: string
          name: string
          sector?: string | null
          symbol: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          market?: string
          name?: string
          sector?: string | null
          symbol?: string
          updated_at?: string
        }
        Relationships: []
      }
      strategies: {
        Row: {
          config: Json
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          strategy_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          strategy_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          strategy_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_configs: {
        Row: {
          config_key: string
          config_value: Json
          created_at: string
          description: string | null
          id: string
          updated_at: string
        }
        Insert: {
          config_key: string
          config_value?: Json
          created_at?: string
          description?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          config_key?: string
          config_value?: Json
          created_at?: string
          description?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_messages: {
        Row: {
          content: string
          created_at: string | null
          details: Json | null
          id: string
          is_read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          details?: Json | null
          id?: string
          is_read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          is_read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      time_contract_assets: {
        Row: {
          category: string
          coin_name: string
          coin_symbol: string
          created_at: string | null
          id: string
          is_active: boolean | null
          min_stake_amount: number
          updated_at: string | null
        }
        Insert: {
          category?: string
          coin_name: string
          coin_symbol: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          min_stake_amount?: number
          updated_at?: string | null
        }
        Update: {
          category?: string
          coin_name?: string
          coin_symbol?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          min_stake_amount?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      time_contract_configs: {
        Row: {
          created_at: string | null
          duration_minutes: number
          duration_unit: string
          duration_value: number
          id: string
          is_active: boolean | null
          loss_type: string | null
          max_amount: number | null
          min_amount: number
          profit_rate: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          duration_minutes: number
          duration_unit?: string
          duration_value?: number
          id?: string
          is_active?: boolean | null
          loss_type?: string | null
          max_amount?: number | null
          min_amount?: number
          profit_rate: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          duration_minutes?: number
          duration_unit?: string
          duration_value?: number
          id?: string
          is_active?: boolean | null
          loss_type?: string | null
          max_amount?: number | null
          min_amount?: number
          profit_rate?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      trade_orders: {
        Row: {
          amount: number
          created_at: string
          error_message: string | null
          exchange: string
          exchange_order_id: string | null
          filled: number | null
          id: string
          order_type: string
          price: number | null
          side: string
          status: string
          strategy_id: string | null
          symbol: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          error_message?: string | null
          exchange: string
          exchange_order_id?: string | null
          filled?: number | null
          id?: string
          order_type: string
          price?: number | null
          side: string
          status: string
          strategy_id?: string | null
          symbol: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          error_message?: string | null
          exchange?: string
          exchange_order_id?: string | null
          filled?: number | null
          id?: string
          order_type?: string
          price?: number | null
          side?: string
          status?: string
          strategy_id?: string | null
          symbol?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_orders_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "strategies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_announcement_reads: {
        Row: {
          announcement_id: string
          id: string
          read_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          id?: string
          read_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "user_announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_announcements: {
        Row: {
          content: string
          created_at: string
          id: string
          is_active: boolean | null
          target_type: string
          target_user_ids: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          target_type?: string
          target_user_ids?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          target_type?: string
          target_user_ids?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_balance_snapshots: {
        Row: {
          created_at: string
          id: string
          snapshot_type: string
          total_usd_value: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          snapshot_type?: string
          total_usd_value?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          snapshot_type?: string
          total_usd_value?: number
          user_id?: string
        }
        Relationships: []
      }
      user_balances: {
        Row: {
          account_type: string
          available: number
          created_at: string
          currency: string
          frozen: number
          id: string
          total: number | null
          updated_at: string
          usd_value: number
          user_id: string
        }
        Insert: {
          account_type?: string
          available?: number
          created_at?: string
          currency: string
          frozen?: number
          id?: string
          total?: number | null
          updated_at?: string
          usd_value?: number
          user_id: string
        }
        Update: {
          account_type?: string
          available?: number
          created_at?: string
          currency?: string
          frozen?: number
          id?: string
          total?: number | null
          updated_at?: string
          usd_value?: number
          user_id?: string
        }
        Relationships: []
      }
      user_feedback: {
        Row: {
          admin_reply: string | null
          category: string
          created_at: string
          email: string
          id: string
          message: string
          name: string
          replied_at: string | null
          replied_by: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_reply?: string | null
          category?: string
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          replied_at?: string | null
          replied_by?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_reply?: string | null
          category?: string
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          replied_at?: string | null
          replied_by?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_mining_rentals: {
        Row: {
          amount: number
          created_at: string
          daily_profit: number
          end_date: string
          id: string
          last_profit_date: string | null
          product_id: string
          start_date: string
          status: string
          total_earned: number
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          daily_profit?: number
          end_date: string
          id?: string
          last_profit_date?: string | null
          product_id: string
          start_date?: string
          status?: string
          total_earned?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          daily_profit?: number
          end_date?: string
          id?: string
          last_profit_date?: string | null
          product_id?: string
          start_date?: string
          status?: string
          total_earned?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_mining_rentals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "mining_products"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_transfers: {
        Row: {
          amount: number
          created_at: string
          currency: string
          from_account: string
          id: string
          status: string | null
          to_account: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency: string
          from_account: string
          id?: string
          status?: string | null
          to_account: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          from_account?: string
          id?: string
          status?: string | null
          to_account?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_withdrawal_addresses: {
        Row: {
          address: string
          coin_name: string
          coin_symbol: string
          created_at: string
          id: string
          is_default: boolean | null
          label: string | null
          network: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          coin_name: string
          coin_symbol: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          label?: string | null
          network: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          coin_name?: string
          coin_symbol?: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          label?: string | null
          network?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wallet_nonces: {
        Row: {
          address: string
          created_at: string | null
          expires_at: string
          id: string
          nonce: string
          used: boolean | null
        }
        Insert: {
          address: string
          created_at?: string | null
          expires_at: string
          id?: string
          nonce: string
          used?: boolean | null
        }
        Update: {
          address?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          nonce?: string
          used?: boolean | null
        }
        Relationships: []
      }
      withdraw_records: {
        Row: {
          amount: number
          coin_symbol: string
          created_at: string
          fee: number
          id: string
          network: string
          reject_reason: string | null
          status: string
          to_address: string
          tx_hash: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          coin_symbol: string
          created_at?: string
          fee?: number
          id?: string
          network: string
          reject_reason?: string | null
          status?: string
          to_address: string
          tx_hash?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          coin_symbol?: string
          created_at?: string
          fee?: number
          id?: string
          network?: string
          reject_reason?: string | null
          status?: string
          to_address?: string
          tx_hash?: string | null
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
      check_user_kyc_status: {
        Args: { p_user_id: string }
        Returns: {
          has_advanced_kyc: boolean
          has_basic_kyc: boolean
          kyc_status: string
          trading_limit: number
          withdrawal_limit: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hash_password: { Args: { _password: string }; Returns: string }
      is_api_key_encrypted: { Args: { key_id: string }; Returns: boolean }
      mark_messages_as_read: {
        Args: { _conversation_id: string; _reader_type: string }
        Returns: undefined
      }
      update_admin_password: {
        Args: { _admin_id: string; _new_password: string }
        Returns: undefined
      }
      verify_admin_password: {
        Args: { _password: string; _username: string }
        Returns: {
          admin_id: string
          admin_username: string
        }[]
      }
      verify_agent_password: {
        Args: { _password: string; _username: string }
        Returns: {
          agent_display_name: string
          agent_id: string
          agent_username: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "trader" | "viewer"
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
      app_role: ["admin", "trader", "viewer"],
    },
  },
} as const
