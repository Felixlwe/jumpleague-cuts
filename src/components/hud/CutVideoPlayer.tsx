'use client';

import React, { useState } from 'react';
import { Video, AlertCircle, ExternalLink } from 'lucide-react';
import { parseYouTubeEmbedUrl, parseStreamableEmbedUrl } from '@/lib/security';

interface CutVideoPlayerProps {
  videoUrl?: string | null;
  title?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  className?: string;
}

export const CutVideoPlayer: React.FC<CutVideoPlayerProps> = ({
  videoUrl,
  title = 'Cut Video',
  autoPlay = true,
  muted = true,
  loop = true,
  controls = true,
  className = '',
}) => {
  const [hasError, setHasError] = useState(false);

  // If no video URL is provided
  if (!videoUrl || !videoUrl.trim()) {
    return (
      <div
        className={`flex h-full w-full flex-col items-center justify-center gap-1.5 p-4 text-center bg-zinc-950 ${className}`}
      >
        <Video className="h-6 w-6 text-zinc-600" />
        <span className="text-xs text-zinc-500">Kein Video-Beweis hinterlegt</span>
      </div>
    );
  }

  const cleanUrl = videoUrl.trim();

  // 1. YouTube (Watch, Shorts, Embed, youtu.be)
  const ytEmbed = parseYouTubeEmbedUrl(cleanUrl);
  if (ytEmbed) {
    return (
      <iframe
        key={ytEmbed}
        src={ytEmbed}
        title={title}
        className={`h-full w-full border-0 ${className}`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  // 2. Streamable
  const streamableEmbed = parseStreamableEmbedUrl(cleanUrl);
  if (streamableEmbed) {
    return (
      <iframe
        key={streamableEmbed}
        src={streamableEmbed}
        title={title}
        className={`h-full w-full border-0 ${className}`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  // 3. Fallback error state if native video failed to load
  if (hasError) {
    return (
      <div
        className={`flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center bg-zinc-950 ${className}`}
      >
        <AlertCircle className="h-5 w-5 text-amber-400" />
        <span className="text-xs text-zinc-400">
          Video konnte nicht direkt im Player geladen werden.
        </span>
        {cleanUrl.startsWith('http') && (
          <a
            href={cleanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-cyan-300 hover:bg-white/20 transition"
          >
            <span>In neuem Tab ansehen</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    );
  }

  // 4. HTML5 Video: Base64 data URLs, blob URLs, direct mp4/webm files
  // Safe short key to prevent large base64 keys
  const videoKey = cleanUrl.slice(0, 48);

  return (
    <video
      key={videoKey}
      src={cleanUrl}
      autoPlay={autoPlay}
      loop={loop}
      muted={muted}
      controls={controls}
      playsInline
      preload="metadata"
      onError={() => setHasError(true)}
      className={`h-full w-full object-cover ${className}`}
    />
  );
};
