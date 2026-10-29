-- AI Video Captioning Database Schema
-- PostgreSQL via Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    language VARCHAR(10) NOT NULL CHECK (language IN ('en', 'hi', 'te')),
    status VARCHAR(50) DEFAULT 'uploaded' CHECK (status IN (
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster user project queries
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);

-- Caption Segments Table
CREATE TABLE IF NOT EXISTS caption_segments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    start_time FLOAT NOT NULL CHECK (start_time >= 0),
    end_time FLOAT NOT NULL CHECK (end_time >= 0),
    style_data JSONB DEFAULT '{}'::jsonb,
    position_data JSONB DEFAULT '{"vertical": "bottom", "horizontal": "center"}'::jsonb,
    animation_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_time_range CHECK (end_time >= start_time)
);

-- Index for project caption queries
CREATE INDEX idx_caption_segments_project_id ON caption_segments(project_id);

-- Caption Words Table
CREATE TABLE IF NOT EXISTS caption_words (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    segment_id UUID NOT NULL REFERENCES caption_segments(id) ON DELETE CASCADE,
    word VARCHAR(500) NOT NULL,
    start_time FLOAT NOT NULL CHECK (start_time >= 0),
    end_time FLOAT NOT NULL CHECK (end_time >= 0),
    highlighted BOOLEAN DEFAULT FALSE,
    highlight_color VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_word_time_range CHECK (end_time >= start_time)
);

-- Index for segment word queries
CREATE INDEX idx_caption_words_segment_id ON caption_words(segment_id);

-- Templates Table
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    configuration_json JSONB NOT NULL,
    preview_image VARCHAR(500),
    supported_languages JSONB DEFAULT '["en", "hi", "te"]'::jsonb,
    is_free BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for template category queries
CREATE INDEX idx_templates_category ON templates(category);

-- Fonts Table
CREATE TABLE IF NOT EXISTS fonts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    font_family VARCHAR(255) NOT NULL,
    font_file VARCHAR(500),
    supported_languages JSONB DEFAULT '["en"]'::jsonb,
    category VARCHAR(100) DEFAULT 'sans-serif'
);

-- Exports Table
CREATE TABLE IF NOT EXISTS exports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    output_format VARCHAR(20) DEFAULT 'mp4',
    resolution VARCHAR(20) DEFAULT '1080p',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Index for export queries
CREATE INDEX idx_exports_project_id ON exports(project_id);
CREATE INDEX idx_exports_status ON exports(status);

-- Row Level Security Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE caption_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE caption_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (email = current_user);

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (email = current_user);

-- Projects policies
CREATE POLICY "Users can view own projects" ON projects
    FOR SELECT USING (user_id IN (
        SELECT id FROM users WHERE email = current_user
    ));

CREATE POLICY "Users can create projects" ON projects
    FOR INSERT WITH CHECK (user_id IN (
        SELECT id FROM users WHERE email = current_user
    ));

CREATE POLICY "Users can update own projects" ON projects
    FOR UPDATE USING (user_id IN (
        SELECT id FROM users WHERE email = current_user
    ));

CREATE POLICY "Users can delete own projects" ON projects
    FOR DELETE USING (user_id IN (
        SELECT id FROM users WHERE email = current_user
    ));

-- Caption Segments policies
CREATE POLICY "Users can view own caption segments" ON caption_segments
    FOR SELECT USING (project_id IN (
        SELECT id FROM projects WHERE user_id IN (
            SELECT id FROM users WHERE email = current_user
        )
    ));

CREATE POLICY "Users can create caption segments" ON caption_segments
    FOR INSERT WITH CHECK (project_id IN (
        SELECT id FROM projects WHERE user_id IN (
            SELECT id FROM users WHERE email = current_user
        )
    ));

CREATE POLICY "Users can update own caption segments" ON caption_segments
    FOR UPDATE USING (project_id IN (
        SELECT id FROM projects WHERE user_id IN (
            SELECT id FROM users WHERE email = current_user
        )
    ));

CREATE POLICY "Users can delete own caption segments" ON caption_segments
    FOR DELETE USING (project_id IN (
        SELECT id FROM projects WHERE user_id IN (
            SELECT id FROM users WHERE email = current_user
        )
    ));

-- Caption Words policies
CREATE POLICY "Users can view own caption words" ON caption_words
    FOR SELECT USING (segment_id IN (
        SELECT id FROM caption_segments WHERE project_id IN (
            SELECT id FROM projects WHERE user_id IN (
                SELECT id FROM users WHERE email = current_user
            )
        )
    ));

CREATE POLICY "Users can create caption words" ON caption_words
    FOR INSERT WITH CHECK (segment_id IN (
        SELECT id FROM caption_segments WHERE project_id IN (
            SELECT id FROM projects WHERE user_id IN (
                SELECT id FROM users WHERE email = current_user
            )
        )
    ));

CREATE POLICY "Users can update own caption words" ON caption_words
    FOR UPDATE USING (segment_id IN (
        SELECT id FROM caption_segments WHERE project_id IN (
            SELECT id FROM projects WHERE user_id IN (
                SELECT id FROM users WHERE email = current_user
            )
        )
    ));

CREATE POLICY "Users can delete own caption words" ON caption_words
    FOR DELETE USING (segment_id IN (
        SELECT id FROM caption_segments WHERE project_id IN (
            SELECT id FROM projects WHERE user_id IN (
                SELECT id FROM users WHERE email = current_user
            )
        )
    ));

-- Exports policies
CREATE POLICY "Users can view own exports" ON exports
    FOR SELECT USING (project_id IN (
        SELECT id FROM projects WHERE user_id IN (
            SELECT id FROM users WHERE email = current_user
        )
    ));

CREATE POLICY "Users can create exports" ON exports
    FOR INSERT WITH CHECK (project_id IN (
        SELECT id FROM projects WHERE user_id IN (
            SELECT id FROM users WHERE email = current_user
        )
    ));

-- Templates and Fonts are readable by all authenticated users
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE fonts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Templates are readable by all" ON templates
    FOR SELECT USING (TRUE);

CREATE POLICY "Fonts are readable by all" ON fonts
    FOR SELECT USING (TRUE);

-- Functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updating updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_caption_segments_updated_at
    BEFORE UPDATE ON caption_segments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Seed Data: Insert default fonts
INSERT INTO fonts (name, font_family, supported_languages, category) VALUES
('Inter', 'Inter', '["en"]', 'sans-serif'),
('Roboto', 'Roboto', '["en"]', 'sans-serif'),
('Arial', 'Arial', '["en"]', 'sans-serif'),
('Noto Sans Telugu', 'Noto Sans Telugu', '["te"]', 'sans-serif'),
('Noto Sans Devanagari', 'Noto Sans Devanagari', '["hi"]', 'sans-serif'),
('Georgia', 'Georgia', '["en"]', 'serif'),
('Montserrat', 'Montserrat', '["en"]', 'sans-serif');

-- Comments for documentation
COMMENT ON TABLE users IS 'User accounts for the application';
COMMENT ON TABLE projects IS 'Video projects with transcription and language settings';
COMMENT ON TABLE caption_segments IS 'Caption segments with word-level timing and styling';
COMMENT ON TABLE caption_words IS 'Individual words with precise timestamps for word-by-word caption';
COMMENT ON TABLE templates IS 'Pre-defined caption style templates';
COMMENT ON TABLE fonts IS 'Font registry with language support information';
COMMENT ON TABLE exports IS 'Video export jobs tracking status and download links';
