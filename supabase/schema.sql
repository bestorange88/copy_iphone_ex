-- Database Schema Export
-- Generated: 2025-10-06
-- This file contains the complete database schema structure

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('admin', 'trader', 'viewer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Tables are created through migrations
-- See supabase/migrations/ directory for table creation scripts

-- This file serves as documentation of the database structure
-- All structural changes should be made through migrations

-- For seeding data, see supabase/seed.sql
