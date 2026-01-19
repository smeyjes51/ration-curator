-- Ration Database Schema
-- Run this in your Supabase SQL Editor

-- ============ Categories Table ============
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT, -- SF Symbol name or emoji
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default categories
INSERT INTO categories (name, description, icon) VALUES
    ('Educational', 'Science, history, learning', 'book.fill'),
    ('Creative Arts', 'Art, music, film, design', 'paintbrush.fill'),
    ('Wellness', 'Mental health, fitness, meditation', 'heart.fill'),
    ('Skills & Hobbies', 'Cooking, DIY, crafts, gaming', 'hammer.fill'),
    ('News & Current Events', 'Journalism, analysis, commentary', 'newspaper.fill'),
    ('Nature & Animals', 'Wildlife, environment, pets', 'leaf.fill'),
    ('Technology', 'Tech reviews, coding, gadgets', 'desktopcomputer'),
    ('Comedy', 'Clean humor, satire, entertainment', 'face.smiling'),
    ('Sports', 'Athletics, fitness, outdoor activities', 'sportscourt'),
    ('Music', 'Musicians, tutorials, performances', 'music.note')
ON CONFLICT (name) DO NOTHING;

-- ============ Creators Table ============
CREATE TABLE IF NOT EXISTS creators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'instagram', 'youtube')),
    display_name TEXT,
    profile_url TEXT,
    follower_count INTEGER,
    verified BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(username, platform)
);

-- ============ Videos Table ============
CREATE TABLE IF NOT EXISTS videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Core fields
    platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'instagram', 'youtube')),
    creator_id UUID REFERENCES creators(id),
    creator_username TEXT NOT NULL,
    
    -- Content
    title TEXT,
    deep_link TEXT NOT NULL,
    thumbnail_url TEXT,
    
    -- Categorization
    category_id UUID REFERENCES categories(id),
    tags TEXT[] DEFAULT '{}',
    
    -- Metadata
    original_url TEXT,
    video_id TEXT, -- Platform-specific video ID
    
    -- Curation
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    quality_score INTEGER CHECK (quality_score BETWEEN 1 AND 5),
    curator_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicates
    UNIQUE(platform, deep_link)
);

-- ============ Indexes ============
CREATE INDEX IF NOT EXISTS idx_videos_platform ON videos(platform);
CREATE INDEX IF NOT EXISTS idx_videos_category ON videos(category_id);
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
CREATE INDEX IF NOT EXISTS idx_videos_tags ON videos USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_creators_platform ON creators(platform);

-- ============ Functions ============

-- Get random video for a platform and optional category
CREATE OR REPLACE FUNCTION get_random_video(
    p_platform TEXT,
    p_category TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    platform TEXT,
    creator_username TEXT,
    title TEXT,
    deep_link TEXT,
    thumbnail_url TEXT,
    category_name TEXT,
    tags TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.id,
        v.platform,
        v.creator_username,
        v.title,
        v.deep_link,
        v.thumbnail_url,
        c.name as category_name,
        v.tags
    FROM videos v
    LEFT JOIN categories c ON v.category_id = c.id
    WHERE v.platform = p_platform
      AND v.status = 'approved'
      AND (p_category IS NULL OR c.name = p_category)
    ORDER BY RANDOM()
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Get random videos (multiple)
CREATE OR REPLACE FUNCTION get_random_videos(
    p_platform TEXT,
    p_category TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    platform TEXT,
    creator_username TEXT,
    title TEXT,
    deep_link TEXT,
    thumbnail_url TEXT,
    category_name TEXT,
    tags TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.id,
        v.platform,
        v.creator_username,
        v.title,
        v.deep_link,
        v.thumbnail_url,
        c.name as category_name,
        v.tags
    FROM videos v
    LEFT JOIN categories c ON v.category_id = c.id
    WHERE v.platform = p_platform
      AND v.status = 'approved'
      AND (p_category IS NULL OR c.name = p_category)
    ORDER BY RANDOM()
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============ Row Level Security ============

-- Enable RLS
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Public read access for approved videos
CREATE POLICY "Public can read approved videos" ON videos
    FOR SELECT USING (status = 'approved');

-- Public read access for creators and categories
CREATE POLICY "Public can read creators" ON creators
    FOR SELECT USING (true);

CREATE POLICY "Public can read categories" ON categories
    FOR SELECT USING (true);

-- Authenticated users (you) can do everything
CREATE POLICY "Authenticated users full access to videos" ON videos
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users full access to creators" ON creators
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users full access to categories" ON categories
    FOR ALL USING (auth.role() = 'authenticated');

-- ============ Views ============

-- Convenient view for the app
CREATE OR REPLACE VIEW video_details AS
SELECT 
    v.id,
    v.platform,
    v.creator_username,
    v.title,
    v.deep_link,
    v.thumbnail_url,
    v.tags,
    v.status,
    v.quality_score,
    v.created_at,
    c.name as category,
    c.icon as category_icon,
    cr.display_name as creator_display_name,
    cr.verified as creator_verified
FROM videos v
LEFT JOIN categories c ON v.category_id = c.id
LEFT JOIN creators cr ON v.creator_id = cr.id;

-- Stats view
CREATE OR REPLACE VIEW curation_stats AS
SELECT 
    platform,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'approved') as approved,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected
FROM videos
GROUP BY platform;
