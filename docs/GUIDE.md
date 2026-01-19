# Ration Content Curation System

A complete toolkit for curating healthy social media content at scale.

## What's Included

| Component | Purpose |
|-----------|---------|
| **Metadata Extraction API** | Supabase Edge Function that resolves any TikTok/Instagram/YouTube URL to get creator, title, thumbnail |
| **Database Schema** | PostgreSQL tables for videos, creators, categories, and community submissions |
| **Web Dashboard** | Browser-based tool for bulk curation, discovery, and library management |

---

## Quick Start

### Step 1: Set Up Supabase

1. **Create a Supabase project** at [supabase.com](https://supabase.com)
2. **Note your credentials:**
   - Project URL: `https://xxxxx.supabase.co`
   - Anon Key: Found in Settings → API → `anon` key

### Step 2: Create Database Tables

1. Go to your Supabase dashboard
2. Click **SQL Editor** in the sidebar
3. Copy the contents of `schema.sql`
4. Paste and click **Run**

This creates:
- `videos` table (your content library)
- `creators` table (for profile-based re-entry links)
- `categories` table (with defaults: Educational, Creative Arts, etc.)
- `submissions` table (for community submissions)
- Helper functions for random video selection

### Step 3: Deploy the Edge Function

#### Option A: Using Supabase CLI (Recommended)

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the function
supabase functions deploy extract-metadata
```

#### Option B: Using the Dashboard

1. Go to **Edge Functions** in your Supabase dashboard
2. Click **Create Function**
3. Name it `extract-metadata`
4. Copy the contents of `supabase-functions/extract-metadata/index.ts`
5. Deploy

### Step 4: Open the Web Dashboard

1. Open `web-dashboard/index.html` in your browser
   - Just double-click the file, or
   - Serve it locally: `npx serve web-dashboard`
   
2. Enter your Supabase credentials when prompted
3. Start curating!

---

## Using the Dashboard

### Tab 1: Curate (Bulk URL Processing)

This is your main workflow for adding content.

**How to use:**

1. Collect URLs from TikTok, Instagram, YouTube
2. Paste them into the text area (one per line)
3. Click **Fetch Metadata**
4. Review the results - creator and title are auto-extracted
5. Assign categories (individually or in bulk)
6. Add tags (optional but helpful for search)
7. Click **Save All to Database**

**Supported URL formats:**

```
# TikTok
https://www.tiktok.com/@username/video/7301234567890123456
https://vm.tiktok.com/ZMhXYZ123/  (shortened - auto-resolved)

# Instagram
https://www.instagram.com/reel/ABC123/
https://www.instagram.com/p/ABC123/
https://www.instagram.com/username/

# YouTube
https://www.youtube.com/watch?v=dQw4w9WgXcQ
https://youtu.be/dQw4w9WgXcQ  (shortened - auto-resolved)
https://www.youtube.com/shorts/ABC123
https://www.youtube.com/@channelname
```

### Tab 2: Discover (Find Content Outside Your Bubble)

For curating topics you don't personally follow.

**Methods:**

1. **Topic Search** - Enter a topic (e.g., "chess", "classical music", "marine biology") and search across platforms
2. **Reddit Discovery** - Search Reddit for "best [topic] TikTok accounts" threads
3. **Import Handles** - Paste a list of usernames to bulk-generate profile URLs
4. **Platform Search** - Direct links to each platform's search

**Workflow:**

1. Enter a topic you want to curate
2. Click **Search** - opens platform searches in new tabs
3. Browse results, copy good video URLs
4. Come back to Curate tab and paste them
5. Repeat for different topics

### Tab 3: Library (Manage Your Content)

View and manage your curated content.

**Features:**

- Search by creator, title, or tags
- Filter by platform and category
- See stats (total videos per platform)
- Delete videos that are no longer relevant

### Tab 4: Submissions (Community Moderation)

Review content submitted by users (once you enable this in your app).

**Workflow:**

1. User submits a URL through your app
2. It appears here in pending state
3. Click **Approve** to add to your library (goes to Curate tab)
4. Click **Reject** to remove

---

## Curation Strategies

### Building Your Initial Library

**Goal:** 1000+ videos across all categories and platforms

**Week 1-2: Your interests**
- Start with topics you know
- Use the Share Extension while browsing
- Aim for 100 videos in categories you understand

**Week 3-4: Expand outside your bubble**
1. Make a list of topics your users might like:
   - Chess, cooking, gardening, astronomy, history, music theory, etc.
2. For each topic:
   - Search Reddit for "best [topic] TikTok/YouTube accounts"
   - Search each platform directly
   - Import handles of recommended creators
   - Fetch their recent videos
3. Aim for 20-50 videos per topic

**Ongoing: Community contributions**
- Enable submissions in your app
- Review and approve quality content
- Track which categories need more content

### Quality Criteria

When curating, look for:

✅ **Good signs:**
- Educational or constructive tone
- Creator has consistent content
- Professional or semi-professional quality
- High engagement without rage-bait
- Teaches something or inspires

❌ **Red flags:**
- Outrage/drama content
- Misleading thumbnails/titles
- Low-effort reposts
- Controversial hot takes
- Parasocial manipulation

### Category Guidelines

| Category | What belongs here |
|----------|------------------|
| **Educational** | Science facts, history, how things work, explainers |
| **Creative Arts** | Art tutorials, music, film analysis, design |
| **Wellness** | Mental health, fitness, meditation, self-care |
| **Skills & Hobbies** | Cooking, DIY, crafts, languages, instruments |
| **Science & Tech** | Space, technology, engineering, programming |
| **Nature & Animals** | Wildlife, nature docs, pets, conservation |
| **Comedy** | Wholesome humor, clever jokes, satire |
| **Inspiration** | Motivational, success stories, feel-good |

---

## API Reference

### Extract Metadata Endpoint

```
POST https://YOUR_PROJECT.supabase.co/functions/v1/extract-metadata
```

**Headers:**
```
Authorization: Bearer YOUR_ANON_KEY
Content-Type: application/json
```

**Single URL:**
```json
{
  "url": "https://vm.tiktok.com/ZMhXYZ123/"
}
```

**Batch URLs:**
```json
{
  "urls": [
    "https://vm.tiktok.com/ZMhXYZ123/",
    "https://www.instagram.com/reel/ABC123/",
    "https://youtu.be/dQw4w9WgXcQ"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "platform": "tiktok",
  "creator": "@username",
  "creatorUrl": "https://www.tiktok.com/@username",
  "title": "Video title",
  "description": "Video description",
  "thumbnail": "https://...",
  "originalUrl": "https://vm.tiktok.com/...",
  "resolvedUrl": "https://www.tiktok.com/@username/video/123",
  "deepLink": "https://www.tiktok.com/@username/video/123",
  "videoId": "7301234567890123456"
}
```

### Database Queries

**Get random video for re-entry:**
```sql
SELECT * FROM get_random_video('tiktok', 'Educational', 1);
```

**Get videos by category:**
```sql
SELECT * FROM videos 
WHERE category = 'Educational' 
  AND platform = 'tiktok'
  AND status = 'active'
ORDER BY RANDOM()
LIMIT 10;
```

**Search videos:**
```sql
SELECT * FROM videos
WHERE status = 'active'
  AND (
    creator ILIKE '%search%'
    OR title ILIKE '%search%'
    OR 'search' = ANY(tags)
  );
```

---

## Connecting to Your iOS App

### Update your iOS app to fetch from Supabase:

```swift
// In your ContentLibrary or similar

import Foundation

struct SupabaseService {
    static let shared = SupabaseService()
    
    let baseURL = "https://YOUR_PROJECT.supabase.co"
    let apiKey = "YOUR_ANON_KEY"
    
    func getRandomVideo(platform: String, category: String?) async throws -> Video? {
        var urlString = "\(baseURL)/rest/v1/rpc/get_random_video"
        
        var request = URLRequest(url: URL(string: urlString)!)
        request.httpMethod = "POST"
        request.setValue(apiKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: Any?] = [
            "p_platform": platform,
            "p_category": category,
            "p_limit": 1
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, _) = try await URLSession.shared.data(for: request)
        let videos = try JSONDecoder().decode([Video].self, from: data)
        
        return videos.first
    }
}

struct Video: Codable {
    let id: String
    let platform: String
    let creator: String
    let title: String?
    let deepLink: String
    let category: String
    let tags: [String]?
    
    enum CodingKeys: String, CodingKey {
        case id, platform, creator, title, category, tags
        case deepLink = "deep_link"
    }
}
```

---

## Troubleshooting

### "oEmbed request failed"

The platform's oEmbed API might be rate-limited or the URL is invalid. The system will fall back to URL parsing.

### TikTok shortened URLs not resolving

Some `vm.tiktok.com` URLs require cookies to resolve. Try using the full URL instead.

### Instagram metadata missing

Instagram's oEmbed API is restrictive. You'll often only get the post ID, not creator info. Consider using the Import Handles feature for Instagram creators.

### Dashboard won't connect

1. Check your Supabase URL format: `https://xxxxx.supabase.co` (no trailing slash)
2. Make sure you're using the **anon** key, not the service key
3. Check that the Edge Function is deployed

---

## File Structure

```
ration-curator/
├── supabase-functions/
│   ├── extract-metadata/
│   │   └── index.ts          # Edge Function code
│   └── schema.sql            # Database schema
├── web-dashboard/
│   └── index.html            # Curation dashboard (single file)
└── docs/
    └── GUIDE.md              # This file
```

---

## Next Steps

1. ✅ Set up Supabase project
2. ✅ Run the database schema
3. ✅ Deploy the Edge Function
4. ✅ Open the dashboard and connect
5. 🔄 Start curating content
6. 🔄 Update your iOS app to fetch from Supabase
7. 🔄 Enable community submissions (optional)
