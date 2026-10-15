// Turns a saved link into an official embed URL when it points at a single video (or a YouTube playlist).
// The saved URL is never changed: this runs at render time, so citations keep pointing at the original page.

export type VideoProvider = 'youtube' | 'vimeo' | 'dailymotion' | 'loom';

export interface VideoEmbed {
  provider: VideoProvider;
  id: string;
  embedUrl: string;
  /** Start time in seconds, when the link carried one. */
  start?: number;
}

const YT_ID = /^[A-Za-z0-9_-]{11}$/;
const LIST_ID = /^[A-Za-z0-9_-]{10,60}$/;
const NUM_ID = /^\d{5,12}$/;
const SHORT_ID = /^[A-Za-z0-9]{5,12}$/;
const LOOM_ID = /^[a-f0-9]{32}$/i;

/** "1h2m3s", "90s", "90" or "1:30" to seconds. Returns undefined when it is not a time. */
export function parseTimestamp(raw: string | null | undefined): number | undefined {
  if (!raw) return undefined;
  const v = raw.trim().toLowerCase();
  if (/^\d+$/.test(v)) return Number(v) || undefined;
  const hms = v.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (hms && (hms[1] || hms[2] || hms[3])) {
    const total = Number(hms[1] || 0) * 3600 + Number(hms[2] || 0) * 60 + Number(hms[3] || 0);
    return total || undefined;
  }
  const clock = v.match(/^(?:(\d+):)?(\d{1,2}):(\d{2})$/);
  if (clock) {
    const total = Number(clock[1] || 0) * 3600 + Number(clock[2]) * 60 + Number(clock[3]);
    return total || undefined;
  }
  return undefined;
}

function hashParams(url: URL): URLSearchParams {
  return new URLSearchParams(url.hash.replace(/^#/, '').replace(/^!/, ''));
}

function youtube(url: URL, host: string): VideoEmbed | null {
  const parts = url.pathname.split('/').filter(Boolean);
  let id = '';
  if (host === 'youtu.be') id = parts[0] || '';
  else if (['embed', 'shorts', 'live', 'v'].includes(parts[0])) id = parts[1] || '';
  else if (parts[0] === 'watch') id = url.searchParams.get('v') || '';
  else if (parts[0] === 'playlist') id = '';
  else return null; // channel, home, results and other non-video pages stay plain links

  const list = url.searchParams.get('list') || '';
  const start = parseTimestamp(url.searchParams.get('t') || url.searchParams.get('start') || hashParams(url).get('t'));
  const params = new URLSearchParams({ rel: '0', enablejsapi: '1' });
  if (start) params.set('start', String(start));

  if (id) {
    if (!YT_ID.test(id)) return null;
    if (LIST_ID.test(list)) params.set('list', list);
    return { provider: 'youtube', id, start, embedUrl: `https://www.youtube-nocookie.com/embed/${id}?${params}` };
  }
  if (parts[0] === 'playlist' || (parts.length === 0 && list)) {
    if (!LIST_ID.test(list)) return null;
    params.set('list', list);
    return { provider: 'youtube', id: list, embedUrl: `https://www.youtube-nocookie.com/embed/videoseries?${params}` };
  }
  return null;
}

function vimeo(url: URL, host: string): VideoEmbed | null {
  const parts = url.pathname.split('/').filter(Boolean);
  let id = '';
  let hash = '';
  if (host === 'player.vimeo.com') {
    if (parts[0] !== 'video') return null;
    id = parts[1] || '';
    hash = url.searchParams.get('h') || '';
  } else {
    // vimeo.com/ID, vimeo.com/ID/HASH (unlisted), vimeo.com/channels/x/ID. Showcases and album pages are not single videos.
    const last = parts.filter((p) => NUM_ID.test(p));
    if (parts.length === 0 || ['album', 'showcase', 'groups', 'user', 'categories'].includes(parts[0])) return null;
    id = last[0] || '';
    const at = parts.indexOf(id);
    if (at >= 0 && /^[a-f0-9]{8,16}$/i.test(parts[at + 1] || '')) hash = parts[at + 1];
    if (!hash) hash = url.searchParams.get('h') || '';
  }
  if (!NUM_ID.test(id)) return null;
  const start = parseTimestamp(hashParams(url).get('t'));
  const params = new URLSearchParams({ dnt: '1' });
  if (/^[a-f0-9]{8,16}$/i.test(hash)) params.set('h', hash);
  const embedUrl = `https://player.vimeo.com/video/${id}?${params}${start ? `#t=${start}s` : ''}`;
  return { provider: 'vimeo', id, start, embedUrl };
}

function dailymotion(url: URL, host: string): VideoEmbed | null {
  const parts = url.pathname.split('/').filter(Boolean);
  const raw = host === 'dai.ly' ? parts[0] || '' : parts[0] === 'video' ? parts[1] || '' : '';
  const id = raw.split('_')[0]; // dailymotion.com/video/x8abc_title-slug
  if (!SHORT_ID.test(id)) return null;
  const start = parseTimestamp(url.searchParams.get('start'));
  const params = new URLSearchParams({ video: id });
  if (start) params.set('start', String(start));
  return { provider: 'dailymotion', id, start, embedUrl: `https://geo.dailymotion.com/player.html?${params}` };
}

function loom(url: URL): VideoEmbed | null {
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts[0] !== 'share' && parts[0] !== 'embed') return null;
  const id = parts[1] || '';
  if (!LOOM_ID.test(id)) return null;
  const start = parseTimestamp(url.searchParams.get('t'));
  return { provider: 'loom', id, start, embedUrl: `https://www.loom.com/embed/${id}${start ? `?t=${start}` : ''}` };
}

/** The embed for a video link, or null when the URL is not a video we can embed. Never throws. */
export function getVideoEmbed(raw: string | null | undefined): VideoEmbed | null {
  if (!raw || typeof raw !== 'string') return null;
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const host = url.hostname.toLowerCase().replace(/^(www|m|music)\./, '');
  if (host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'youtu.be') return youtube(url, host);
  if (host === 'vimeo.com' || host === 'player.vimeo.com') return vimeo(url, host);
  if (host === 'dailymotion.com' || host === 'dai.ly') return dailymotion(url, host);
  if (host === 'loom.com') return loom(url);
  return null;
}
