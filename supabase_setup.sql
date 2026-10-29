-- ==============================================================================
-- AI VIDEO CAPTION GENERATOR - SUPABASE DATABASE SCHEMA
-- ==============================================================================
-- Generated for Supabase PostgreSQL with Supabase Auth integration.
-- Safe to run in Supabase SQL Editor (idempotent, dependency-safe).
--
-- This script configures:
-- 1. UUID extensions
-- 2. Public users profile table synchronized with auth.users
-- 3. Core tables: projects, caption_segments, caption_words, exports
-- 4. Foreign keys with CASCADE deletion
-- 5. Performance indexes
-- 6. Updated-at auto-touch triggers
-- 7. Auth user creation sync trigger
-- 8. Row Level Security (RLS) policies isolating each user's data
--
-- Note on Templates & Fonts:
-- As verified from the codebase, templates are defined in frontend code
-- (frontend/lib/templates) and backend configuration (backend/app/api/templates.py).
-- Fonts are bundled directly as TTF files in backend/fonts and via Google Fonts in
-- frontend/lib/fonts/fontRegistry.ts. They are NOT queried from the database,
-- so no unnecessary tables are created for them.
--
-- Note on Storage:
-- Video files are stored as temporary files on disk during processing and rendering.
-- No binary video data is stored in PostgreSQL.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 2. HELPER FUNCTIONS & TRIGGERS
-- ------------------------------------------------------------------------------

-- Function to automatically set updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. USERS (PROFILE TABLE TIED TO Supabase auth.users)
-- ------------------------------------------------------------------------------
-- Extends Supabase Auth with a public profile table.
-- Automatically populated whenever a user signs up via auth.users trigger.
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Trigger for public.users updated_at
DROP TRIGGER IF EXISTS trigger_users_updated_at ON public.users;
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Function to synchronize new users from auth.users into public.users
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.users (id, email, created_at, updated_at)
    VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        COALESCE(NEW.created_at, CURRENT_TIMESTAMP),
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- Trigger on auth.users for automatic profile synchronization
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_auth_user();

-- Backfill any existing users from auth.users if they already signed up
INSERT INTO public.users (id, email, created_at, updated_at)
SELECT id, COALESCE(email, ''), COALESCE(created_at, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 4. PROJECTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    language VARCHAR(20) NOT NULL CHECK (language IN ('en', 'hi', 'te', 'te_en', 'te_roman')),
    status VARCHAR(50) DEFAULT 'uploaded' NOT NULL CHECK (status IN (
        'uploaded',
        'processing',
        'extracting_audio',
        'transcribing',
        'generating_captions',
        'ready',
        'rendering',
        'completed',
        'failed'
    )),
    duration FLOAT,
    filename VARCHAR(500),
    file_size BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);

DROP TRIGGER IF EXISTS trigger_projects_updated_at ON public.projects;
CREATE TRIGGER trigger_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 5. CAPTION SEGMENTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.caption_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    start_time FLOAT NOT NULL CHECK (start_time >= 0),
    end_time FLOAT NOT NULL CHECK (end_time >= 0),
    style_data JSONB DEFAULT '{}'::jsonb NOT NULL,
    position_data JSONB DEFAULT '{"vertical": "bottom", "horizontal": "center"}'::jsonb NOT NULL,
    animation_data JSONB DEFAULT '{}'::jsonb NOT NULL,
    highlight_data JSONB DEFAULT '{}'::jsonb NOT NULL,
    source_language VARCHAR(20),
    target_language VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT valid_segment_time_range CHECK (end_time >= start_time)
);

CREATE INDEX IF NOT EXISTS idx_caption_segments_project_id ON public.caption_segments(project_id);
CREATE INDEX IF NOT EXISTS idx_caption_segments_start_time ON public.caption_segments(project_id, start_time);

DROP TRIGGER IF EXISTS trigger_caption_segments_updated_at ON public.caption_segments;
CREATE TRIGGER trigger_caption_segments_updated_at
    BEFORE UPDATE ON public.caption_segments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 6. CAPTION WORDS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.caption_words (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    segment_id UUID NOT NULL REFERENCES public.caption_segments(id) ON DELETE CASCADE,
    word VARCHAR(500) NOT NULL,
    start_time FLOAT NOT NULL CHECK (start_time >= 0),
    end_time FLOAT NOT NULL CHECK (end_time >= 0),
    highlighted BOOLEAN DEFAULT FALSE NOT NULL,
    highlight_color VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT valid_word_time_range CHECK (end_time >= start_time)
);

CREATE INDEX IF NOT EXISTS idx_caption_words_segment_id ON public.caption_words(segment_id);
CREATE INDEX IF NOT EXISTS idx_caption_words_timing ON public.caption_words(segment_id, start_time);

-- ------------------------------------------------------------------------------
-- 7. EXPORTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending' NOT NULL CHECK (status IN (
        'pending',
        'processing',
        'completed',
        'failed'
    )),
    output_format VARCHAR(20) DEFAULT 'mp4' NOT NULL,
    resolution VARCHAR(20) DEFAULT '1080p' NOT NULL,
    download_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_exports_project_id ON public.exports(project_id);
CREATE INDEX IF NOT EXISTS idx_exports_status ON public.exports(status);

-- ------------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

-- Enable Row Level Security on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caption_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caption_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exports ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 8.1 USERS POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE
    USING (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- 8.2 PROJECTS POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
CREATE POLICY "Users can view own projects" ON public.projects
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own projects" ON public.projects;
CREATE POLICY "Users can create own projects" ON public.projects
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
CREATE POLICY "Users can update own projects" ON public.projects
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;
CREATE POLICY "Users can delete own projects" ON public.projects
    FOR DELETE
    USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 8.3 CAPTION SEGMENTS POLICIES (Scoped through parent project ownership)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own caption segments" ON public.caption_segments;
CREATE POLICY "Users can view own caption segments" ON public.caption_segments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = caption_segments.project_id
              AND projects.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can create own caption segments" ON public.caption_segments;
CREATE POLICY "Users can create own caption segments" ON public.caption_segments
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = caption_segments.project_id
              AND projects.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update own caption segments" ON public.caption_segments;
CREATE POLICY "Users can update own caption segments" ON public.caption_segments
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = caption_segments.project_id
              AND projects.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = caption_segments.project_id
              AND projects.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete own caption segments" ON public.caption_segments;
CREATE POLICY "Users can delete own caption segments" ON public.caption_segments
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = caption_segments.project_id
              AND projects.user_id = auth.uid()
        )
    );

-- ------------------------------------------------------------------------------
-- 8.4 CAPTION WORDS POLICIES (Scoped through segment and project ownership)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own caption words" ON public.caption_words;
CREATE POLICY "Users can view own caption words" ON public.caption_words
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.caption_segments s
            JOIN public.projects p ON p.id = s.project_id
            WHERE s.id = caption_words.segment_id
              AND p.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can create own caption words" ON public.caption_words;
CREATE POLICY "Users can create own caption words" ON public.caption_words
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.caption_segments s
            JOIN public.projects p ON p.id = s.project_id
            WHERE s.id = caption_words.segment_id
              AND p.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update own caption words" ON public.caption_words;
CREATE POLICY "Users can update own caption words" ON public.caption_words
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.caption_segments s
            JOIN public.projects p ON p.id = s.project_id
            WHERE s.id = caption_words.segment_id
              AND p.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.caption_segments s
            JOIN public.projects p ON p.id = s.project_id
            WHERE s.id = caption_words.segment_id
              AND p.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete own caption words" ON public.caption_words;
CREATE POLICY "Users can delete own caption words" ON public.caption_words
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.caption_segments s
            JOIN public.projects p ON p.id = s.project_id
            WHERE s.id = caption_words.segment_id
              AND p.user_id = auth.uid()
        )
    );

-- ------------------------------------------------------------------------------
-- 8.5 EXPORTS POLICIES (Scoped through parent project ownership)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own exports" ON public.exports;
CREATE POLICY "Users can view own exports" ON public.exports
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = exports.project_id
              AND projects.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can create own exports" ON public.exports;
CREATE POLICY "Users can create own exports" ON public.exports
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = exports.project_id
              AND projects.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update own exports" ON public.exports;
CREATE POLICY "Users can update own exports" ON public.exports
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = exports.project_id
              AND projects.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = exports.project_id
              AND projects.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete own exports" ON public.exports;
CREATE POLICY "Users can delete own exports" ON public.exports
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = exports.project_id
              AND projects.user_id = auth.uid()
        )
    );

-- ==============================================================================
-- 9. DOCUMENTATION COMMENTS
-- ==============================================================================
COMMENT ON TABLE public.users IS 'Public profile table linked 1-to-1 with Supabase auth.users';
COMMENT ON TABLE public.projects IS 'Video projects created by authenticated users';
COMMENT ON TABLE public.caption_segments IS 'Caption segments with time boundaries and formatting metadata';
COMMENT ON TABLE public.caption_words IS 'Word-level timing and highlight records belonging to a caption segment';
COMMENT ON TABLE public.exports IS 'Video export render jobs tracking status, format, and download URL';
