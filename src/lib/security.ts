/**
 * Security and Input Validation helpers
 */

export const MAX_CUT_NAME_LENGTH = 60;
export const MAX_CUT_DESCRIPTION_LENGTH = 500;
export const MAX_CUT_AUTHOR_LENGTH = 30;

/**
 * Extracts a YouTube Video ID from any standard YouTube URL,
 * including youtube.com, youtu.be, /shorts/, /embed/, and /live/.
 */
export function extractYouTubeVideoId(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();

  // Match:
  // - youtu.be/<id>
  // - youtube.com/watch?v=<id>
  // - youtube.com/embed/<id>
  // - youtube.com/shorts/<id>
  // - youtube.com/live/<id>
  const match = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([a-zA-Z0-9_-]{11})/i
  );
  if (match && match[1]) {
    return match[1];
  }
  return null;
}

/**
 * Safely extracts the YouTube video ID and returns a sanitized embed URL.
 * Supports standard watch URLs, short links, and YouTube Shorts.
 * Returns null if the URL is not a valid YouTube URL.
 */
export function parseYouTubeEmbedUrl(url: string | null | undefined): string | null {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) return null;

  return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&rel=0`;
}

/**
 * Safely extracts Streamable video code and returns a sanitized embed URL.
 * Supports https://streamable.com/xyz and https://streamable.com/e/xyz.
 */
export function parseStreamableEmbedUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  const match = trimmed.match(/(?:streamable\.com\/(?:e\/)?)([a-zA-Z0-9]+)/i);
  if (match && match[1]) {
    return `https://streamable.com/e/${match[1]}?autoplay=1&muted=1&loop=1`;
  }
  return null;
}

/**
 * Validates that a video URL is safe and playable:
 * - Direct Base64 data URLs: data:video/mp4;base64,... etc.
 * - Local blob URLs: blob:...
 * - YouTube links (Standard, Shorts, Embeds)
 * - Streamable links
 * - Direct .mp4, .webm, .mov, .ogg files over https://
 * - Known video CDN hosts (Discord, Medal, Imgur, Cloudinary, Supabase)
 * Prevents XSS, javascript: URI execution, and arbitrary external redirects.
 */
export function isValidVideoUrl(urlStr: string | null | undefined): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  const trimmed = urlStr.trim();

  // 1. Base64 data URLs for client-uploaded video files
  if (trimmed.startsWith('data:video/')) {
    return true;
  }

  // 2. Local blob URLs (temporary preview in browser session)
  if (trimmed.startsWith('blob:')) {
    return true;
  }

  // 3. Must be https://
  if (!trimmed.startsWith('https://')) {
    return false;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') return false;

    // Check YouTube
    if (extractYouTubeVideoId(trimmed)) {
      return true;
    }

    // Check Streamable
    if (parseStreamableEmbedUrl(trimmed)) {
      return true;
    }

    // Check direct video file extensions
    const pathname = parsed.pathname.toLowerCase();
    const isVideoFile =
      pathname.endsWith('.mp4') ||
      pathname.endsWith('.webm') ||
      pathname.endsWith('.mov') ||
      pathname.endsWith('.ogg') ||
      pathname.endsWith('.m4v');

    if (isVideoFile) {
      return true;
    }

    // Check trusted video CDN hosts
    const hostname = parsed.hostname.toLowerCase();
    const isTrustedVideoHost =
      hostname.includes('discordapp.') ||
      hostname.includes('discord.') ||
      hostname.includes('medal.tv') ||
      hostname.includes('imgur.com') ||
      hostname.includes('cloudinary.com') ||
      hostname.includes('supabase.co');

    if (isTrustedVideoHost) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}
