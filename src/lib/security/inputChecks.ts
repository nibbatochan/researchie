// Small checks for values a client sends and other people's screens later show. Free of app imports so they can be
// unit-tested on their own.

/** A plain record id: letters, digits, "_" and "-", up to 100 characters. Used before an id is stored. */
export function isPlainId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(value);
}

/** The address when it is a web (http or https) address, else undefined. Stops "javascript:", "data:" and "file:" links. */
export function httpUrlOnly(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 4000) return undefined;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? value.trim() : undefined;
  } catch {
    return undefined;
  }
}
