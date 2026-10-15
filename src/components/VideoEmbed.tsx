'use client';

import React, { useEffect, useRef, useState } from 'react';
import { PlayCircle, LinkSimple, CaretDown, CaretUp, ArrowSquareOut } from '@phosphor-icons/react';
import { getVideoEmbed } from '@/lib/video/embed';
import { usePrefs } from '@/lib/prefs/prefsContext';

// Plays a saved video link inline. The saved URL stays the source; the embed URL is worked out here.
// Player or plain link is the reader's choice per clip (kept with the account). The player loads only
// when it scrolls near the screen, runs in a sandboxed iframe, and falls back to the plain link if the
// provider refuses to play it.

const LOAD_TIMEOUT_MS = 12000;
const prefKey = (atomId: string) => `researchie.video.${atomId}`;

type Mode = 'embed' | 'link';

interface Props {
  atomId: string;
  /** The original saved URL. */
  url: string | undefined;
  title?: string;
}

/** Renders nothing when the URL is not a video, so callers can place it without checking first. */
export const VideoEmbed: React.FC<Props> = ({ atomId, url, title }) => {
  const video = getVideoEmbed(url);
  const prefs = usePrefs();
  const [mode, setMode] = useState<Mode>('embed');
  const [collapsed, setCollapsed] = useState(false);
  const [near, setNear] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => setMode(prefs.get(prefKey(atomId)) === 'link' ? 'link' : 'embed'), [atomId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [video?.embedUrl]);

  const showPlayer = Boolean(video) && mode === 'embed' && !collapsed && !failed;

  // Lazy load: only mount the iframe once the box is close to the viewport.
  useEffect(() => {
    if (!showPlayer || near) return;
    const el = boxRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setNear(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [showPlayer, near]);

  // Give up on a player that never loads (blocked, offline).
  useEffect(() => {
    if (!showPlayer || !near || loaded) return;
    const t = setTimeout(() => setFailed(true), LOAD_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [showPlayer, near, loaded]);

  // YouTube reports private, removed and embedding-disabled videos with an onError message.
  useEffect(() => {
    if (!showPlayer || video?.provider !== 'youtube') return;
    const onMessage = (ev: MessageEvent) => {
      if (ev.source !== frameRef.current?.contentWindow) return;
      try {
        const data = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data;
        if (data?.event === 'onError') setFailed(true);
      } catch {
        // not a YouTube message
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [showPlayer, video?.provider]);

  if (!video) return null;

  const choose = (next: Mode) => {
    setMode(next);
    setFailed(false);
    prefs.set(prefKey(atomId), next);
  };

  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  const seg = (active: boolean) =>
    `inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium transition-colors ${
      active
        ? 'bg-[#325FEC] text-white'
        : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
    }`;

  return (
    <div className="mt-2" onClick={stop}>
      <div className="flex items-center gap-2">
        <div
          role="group"
          aria-label="Show video as"
          className="inline-flex overflow-hidden rounded-md border border-[#D9E1EC] dark:border-[#27272A]"
        >
          <button type="button" className={seg(mode === 'embed')} aria-pressed={mode === 'embed'} onClick={() => choose('embed')}>
            <PlayCircle size={13} /> Player
          </button>
          <button type="button" className={seg(mode === 'link')} aria-pressed={mode === 'link'} onClick={() => choose('link')}>
            <LinkSimple size={13} /> Link
          </button>
        </div>
        {mode === 'embed' && !failed && (
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-expanded={!collapsed}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200"
          >
            {collapsed ? <CaretDown size={12} /> : <CaretUp size={12} />}
            {collapsed ? 'Show player' : 'Minimize'}
          </button>
        )}
      </div>

      {mode === 'embed' && failed && (
        <p className="mt-2 text-[12px] text-slate-600 dark:text-zinc-400">
          This video can&apos;t play here (it may be private or have embedding turned off).{' '}
          <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#325FEC] dark:text-[#518FFF] hover:underline">
            Open the original <ArrowSquareOut size={12} />
          </a>
        </p>
      )}

      {showPlayer && (
        <div ref={boxRef} className="mt-2">
          <div className="relative w-full overflow-hidden rounded-lg bg-black" style={{ aspectRatio: '16 / 9' }}>
            {near && (
              <iframe
                ref={frameRef}
                src={video.embedUrl}
                title={title ? `Video: ${title}` : 'Embedded video'}
                loading="lazy"
                sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
                allow="fullscreen; picture-in-picture; encrypted-media"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                className="absolute inset-0 h-full w-full border-0"
                onLoad={() => {
                  setLoaded(true);
                  // Ask YouTube to send player events, so an error can be caught.
                  if (video.provider === 'youtube') {
                    frameRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'listening' }), 'https://www.youtube-nocookie.com');
                  }
                }}
                onError={() => setFailed(true)}
              />
            )}
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-zinc-400 hover:text-[#325FEC] dark:hover:text-[#518FFF]"
          >
            Not playing? Open the original <ArrowSquareOut size={11} />
          </a>
        </div>
      )}
    </div>
  );
};
