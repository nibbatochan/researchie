// A fetch that stays on the public internet. isPublicHttpUrl() only reads the URL text, so on its own it misses a
// public address that redirects inward and a hostname whose DNS record points at a private address. This checks
// every hop: the URL text, then the addresses the host resolves to, and follows redirects by hand.
//
// One gap remains: the name is resolved here and again by fetch(), so a record that changes between the two
// (DNS rebinding) is not caught. Closing it needs a pinned-IP agent; the checks here stop the common cases.

import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { isPublicHttpUrl } from './publicUrl.ts';

const MAX_REDIRECTS = 4;

/** True when the address is loopback, private, link-local, multicast, reserved or an IPv4 address in IPv6 clothes. */
export function isPrivateAddress(address: string): boolean {
  const ip = address.toLowerCase().replace(/^\[|\]$/g, '');
  const family = isIP(ip);
  if (family === 4) {
    const [a, b, c] = ip.split('.').map(Number);
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0 && c === 0) ||
      (a === 198 && (b === 18 || b === 19))
    );
  }
  if (family === 6) {
    const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    // ::ffff:7f00:1 form
    const hex = ip.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (hex) {
      const hi = parseInt(hex[1], 16);
      const lo = parseInt(hex[2], 16);
      return isPrivateAddress(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
    }
    return ip === '::' || ip === '::1' || /^f[cd]/.test(ip) || /^fe[89ab]/.test(ip) || ip.startsWith('ff') || ip.startsWith('64:ff9b:') || ip.startsWith('2001:db8');
  }
  return true; // not an address we understand
}

async function resolvesPublic(rawUrl: string): Promise<boolean> {
  if (!isPublicHttpUrl(rawUrl)) return false;
  const host = new URL(rawUrl).hostname.replace(/^\[|\]$/g, '');
  if (isIP(host)) return !isPrivateAddress(host);
  try {
    const records = await lookup(host, { all: true });
    return records.length > 0 && records.every((r) => !isPrivateAddress(r.address));
  } catch {
    return false;
  }
}

/** fetch() for a URL a user supplied. Throws when any hop is not a public http(s) address. */
export async function fetchPublic(rawUrl: string, init: RequestInit = {}): Promise<Response> {
  let url = rawUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!(await resolvesPublic(url))) throw new Error('That address is not a public web page.');
    const res = await fetch(url, { ...init, redirect: 'manual' });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location) return res;
      url = new URL(location, url).toString();
      continue;
    }
    return res;
  }
  throw new Error('Too many redirects.');
}
