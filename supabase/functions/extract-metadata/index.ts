// Supabase Edge Function: extract-metadata
// Extracts creator name, title, thumbnail from TikTok, Instagram, and YouTube URLs

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VideoMetadata {
  success: boolean;
  platform: string;
  creator: string;
  creatorUrl: string;
  title: string;
  thumbnail: string;
  originalUrl: string;
  deepLink: string;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { url, urls } = await req.json();
    
    // Handle single URL or batch
    if (url) {
      const metadata = await extractMetadata(url);
      return new Response(JSON.stringify(metadata), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    if (urls && Array.isArray(urls)) {
      const results = await Promise.all(urls.map(extractMetadata));
      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    return new Response(
      JSON.stringify({ error: "Provide 'url' or 'urls' in request body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function extractMetadata(inputUrl: string): Promise<VideoMetadata> {
  const url = inputUrl.trim();
  
  try {
    // Detect platform
    const platform = detectPlatform(url);
    
    if (!platform) {
      return {
        success: false,
        platform: "unknown",
        creator: "",
        creatorUrl: "",
        title: "",
        thumbnail: "",
        originalUrl: url,
        deepLink: "",
        error: "Unsupported platform. Use TikTok, Instagram, or YouTube URLs.",
      };
    }
    
    // Extract metadata based on platform
    switch (platform) {
      case "tiktok":
        return await extractTikTokMetadata(url);
      case "instagram":
        return await extractInstagramMetadata(url);
      case "youtube":
        return await extractYouTubeMetadata(url);
      default:
        throw new Error("Unknown platform");
    }
    
  } catch (error) {
    return {
      success: false,
      platform: detectPlatform(url) || "unknown",
      creator: "",
      creatorUrl: "",
      title: "",
      thumbnail: "",
      originalUrl: url,
      deepLink: "",
      error: error.message,
    };
  }
}

function detectPlatform(url: string): string | null {
  const lower = url.toLowerCase();
  
  if (lower.includes("tiktok.com") || lower.includes("vm.tiktok")) {
    return "tiktok";
  }
  if (lower.includes("instagram.com")) {
    return "instagram";
  }
  if (lower.includes("youtube.com") || lower.includes("youtu.be")) {
    return "youtube";
  }
  
  return null;
}

// ============ TikTok ============

async function extractTikTokMetadata(url: string): Promise<VideoMetadata> {
  // First, resolve shortened URLs
  const resolvedUrl = await resolveRedirects(url);
  
  // Use TikTok's oEmbed API
  const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(resolvedUrl)}`;
  
  const response = await fetch(oembedUrl);
  
  if (!response.ok) {
    throw new Error(`TikTok oEmbed failed: ${response.status}`);
  }
  
  const data = await response.json();
  
  // Extract video ID from URL for deep link
  const videoId = extractTikTokVideoId(resolvedUrl);
  const username = data.author_unique_id || data.author_name || extractTikTokUsername(resolvedUrl);
  
  return {
    success: true,
    platform: "tiktok",
    creator: `@${username}`,
    creatorUrl: data.author_url || `https://www.tiktok.com/@${username}`,
    title: data.title || "",
    thumbnail: data.thumbnail_url || "",
    originalUrl: url,
    deepLink: videoId 
      ? `https://www.tiktok.com/@${username}/video/${videoId}`
      : `https://www.tiktok.com/@${username}`,
  };
}

function extractTikTokVideoId(url: string): string | null {
  // Match /video/1234567890
  const match = url.match(/\/video\/(\d+)/);
  return match ? match[1] : null;
}

function extractTikTokUsername(url: string): string {
  // Match /@username
  const match = url.match(/@([^\/\?]+)/);
  return match ? match[1] : "unknown";
}

// ============ Instagram ============

async function extractInstagramMetadata(url: string): Promise<VideoMetadata> {
  const resolvedUrl = await resolveRedirects(url);
  
  // Try oEmbed first (may have rate limits)
  try {
    const oembedUrl = `https://api.instagram.com/oembed?url=${encodeURIComponent(resolvedUrl)}`;
    const response = await fetch(oembedUrl);
    
    if (response.ok) {
      const data = await response.json();
      const username = data.author_name || extractInstagramUsername(resolvedUrl);
      
      return {
        success: true,
        platform: "instagram",
        creator: `@${username}`,
        creatorUrl: `https://www.instagram.com/${username}/`,
        title: data.title || "",
        thumbnail: data.thumbnail_url || "",
        originalUrl: url,
        deepLink: resolvedUrl,
      };
    }
  } catch (e) {
    // oEmbed failed, fall back to URL parsing
  }
  
  // Fallback: extract from URL structure
  const username = extractInstagramUsername(resolvedUrl);
  const postId = extractInstagramPostId(resolvedUrl);
  
  return {
    success: true,
    platform: "instagram",
    creator: `@${username}`,
    creatorUrl: `https://www.instagram.com/${username}/`,
    title: "",
    thumbnail: "",
    originalUrl: url,
    deepLink: postId 
      ? `https://www.instagram.com/reel/${postId}/`
      : `https://www.instagram.com/${username}/`,
  };
}

function extractInstagramUsername(url: string): string {
  const profileMatch = url.match(/instagram\.com\/([^\/\?]+)\/?$/);
  if (profileMatch && !["reel", "p", "stories"].includes(profileMatch[1])) {
    return profileMatch[1];
  }
  return "instagram_user";
}

function extractInstagramPostId(url: string): string | null {
  const match = url.match(/\/(reel|p)\/([^\/\?]+)/);
  return match ? match[2] : null;
}

// ============ YouTube ============

async function extractYouTubeMetadata(url: string): Promise<VideoMetadata> {
  const resolvedUrl = await resolveRedirects(url);
  
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(resolvedUrl)}&format=json`;
  
  const response = await fetch(oembedUrl);
  
  if (!response.ok) {
    throw new Error(`YouTube oEmbed failed: ${response.status}`);
  }
  
  const data = await response.json();
  
  const videoId = extractYouTubeVideoId(resolvedUrl);
  const channelName = data.author_name || "Unknown Channel";
  
  return {
    success: true,
    platform: "youtube",
    creator: channelName,
    creatorUrl: data.author_url || "",
    title: data.title || "",
    thumbnail: data.thumbnail_url || (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : ""),
    originalUrl: url,
    deepLink: videoId 
      ? `https://www.youtube.com/watch?v=${videoId}`
      : resolvedUrl,
  };
}

function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?]+)/,
    /youtube\.com\/embed\/([^?]+)/,
    /youtube\.com\/shorts\/([^?]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

// ============ Utilities ============

async function resolveRedirects(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
    });
    return response.url;
  } catch {
    try {
      const response = await fetch(url, { redirect: "follow" });
      return response.url;
    } catch {
      return url;
    }
  }
}
