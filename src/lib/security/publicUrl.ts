// The server fetches pages a user clipped from (to rebuild context). That must never reach the server's own
// network: localhost, private ranges, link-local and cloud metadata addresses. This checks the URL text only;
// it does not resolve DNS, so it stops the obvious cases, not a hostile DNS record.

function isPrivateIPv4(host: string): boolean {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127)
  );
}

export function isPublicHttpUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  if (url.username || url.password) return false;
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return false;
  if (isPrivateIPv4(host)) return false;
  // IPv6: loopback, unique-local, link-local, and IPv4-mapped addresses.
  if (host.includes(':')) {
    if (host === '::1' || host === '::' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80') || host.startsWith('::ffff:')) return false;
  }
  // A bare integer or hex host (http://2130706433) is a loopback trick.
  if (/^\d+$/.test(host) || /^0x[0-9a-f]+$/i.test(host)) return false;
  return true;
}
