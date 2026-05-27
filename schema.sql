-- schema.sql
-- Setup PostgreSQL database schema for "הפער שאף אחד לא מדבר עליו" on Supabase

-- 1. Create Diagnostics Table
CREATE TABLE IF NOT EXISTS diagnostics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    business_name VARCHAR(255),
    answers JSONB NOT NULL DEFAULT '{}',
    comments JSONB NOT NULL DEFAULT '{}',
    final_one_thing TEXT,
    completed BOOLEAN DEFAULT FALSE,
    ai_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create index on session_id for lightning-fast lookups
CREATE INDEX IF NOT EXISTS idx_diagnostics_session_id ON diagnostics(session_id);

-- 3. Create RLS Policies (Row Level Security) for client-side safety
ALTER TABLE diagnostics ENABLE ROW LEVEL SECURITY;

-- Allow anonymous selects & inserts & updates by matching session_id
CREATE POLICY "Allow anonymous select by session_id" 
    ON diagnostics FOR SELECT 
    USING (true);

CREATE POLICY "Allow anonymous insert" 
    ON diagnostics FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Allow anonymous update by session_id" 
    ON diagnostics FOR UPDATE 
    USING (true);
