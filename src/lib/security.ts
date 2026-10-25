/**
 * Security and Input Validation helpers
 */

export const MAX_CUT_NAME_LENGTH = 60;
export const MAX_CUT_DESCRIPTION_LENGTH = 500;
export const MAX_CUT_AUTHOR_LENGTH = 30;

/**
 * Validates that a video URL is strictly an https:// link from YouTube or a direct .mp4/.webm video file.
 * Prevents XSS, javascript: URI execution, and arbitrary external redirects.
 */
export function isValidVideoUrl(urlStr: string | null | undefined): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  const trimmed = urlStr.trim();

  // Strict check: Must start with https:// (or blob: for local browser session files)
  if (!trimmed.startsWith('https://') && !trimmed.startsWith('blob:')) {
    return false;
  }

  // Allow local object URLs created during current session via URL.createObjectURL
  if (trimmed.startsWith('blob:')) {
    return true;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') return false;

    const hostname = parsed.hostname.toLowerCase();

    // 1. YouTube domains
    const isYouTube =
      hostname === 'youtube.com' ||
      hostname === 'www.youtube.com' ||
      hostname === 'm.youtube.com' ||
      hostname === 'youtu.be';

    if (isYouTube) {
      return true;
    }

    // 2. Direct .mp4 or .webm files
    const pathname = parsed.pathname.toLowerCase();
    if (pathname.endsWith('.mp4') || pathname.endsWith('.webm')) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Safely extracts the YouTube video ID and returns a sanitized embed URL.
 * Returns null if the URL is not a valid YouTube URL.
 */
export function parseYouTubeEmbedUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed.startsWith('https://')) return null;

  try {
    const parsed = new URL(trimmed);
    const hostname = parsed.hostname.toLowerCase();
    let videoId: string | null = null;

    if (hostname === 'youtu.be') {
      videoId = parsed.pathname.replace(/^\/+/, '').split('/')[0] || null;
    } else if (
      hostname === 'youtube.com' ||
      hostname === 'www.youtube.com' ||
      hostname === 'm.youtube.com'
    ) {
      if (parsed.pathname.startsWith('/embed/')) {
        videoId = parsed.pathname.replace('/embed/', '').split('/')[0] || null;
      } else {
        videoId = parsed.searchParams.get('v');
      }
    }

    // Ensure videoId only contains valid YouTube ID characters (alphanumeric, -, _)
    if (videoId && /^[a-zA-Z0-9_-]{6,15}$/.test(videoId)) {
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&rel=0`;
    }

    return null;
  } catch {
    return null;
  }
}
