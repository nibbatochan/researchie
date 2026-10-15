// The email addresses used to sign in on this browser, so "Switch account" can offer them (S-44). Only the
// address is kept: never a password, a token or a session. Switching still signs out and asks for the
// password. Kept free of browser globals (it takes the storage as an argument) so it can be unit-tested.

export const KNOWN_ACCOUNTS_KEY = 'researchie.knownAccounts';
const MAX_ACCOUNTS = 6;

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const clean = (email: unknown): string => (typeof email === 'string' ? email.trim().toLowerCase() : '');
const looksLikeEmail = (email: string) => email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/** The remembered addresses, most recently used first. Never throws. */
export function listAccounts(storage: StorageLike | null | undefined): string[] {
  try {
    const raw = storage?.getItem(KNOWN_ACCOUNTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const item of parsed) {
      const email = clean(item);
      if (looksLikeEmail(email) && !seen.has(email)) {
        seen.add(email);
        out.push(email);
      }
    }
    return out.slice(0, MAX_ACCOUNTS);
  } catch {
    return [];
  }
}

function save(storage: StorageLike | null | undefined, emails: string[]) {
  try {
    storage?.setItem(KNOWN_ACCOUNTS_KEY, JSON.stringify(emails.slice(0, MAX_ACCOUNTS)));
  } catch {
    // Storage full or blocked: the list is a convenience, so carry on without it.
  }
}

/** Remember an address (moves it to the front). Anything that is not an email is ignored. */
export function rememberAccount(storage: StorageLike | null | undefined, email: unknown): string[] {
  const next = clean(email);
  const current = listAccounts(storage);
  if (!looksLikeEmail(next)) return current;
  const updated = [next, ...current.filter((e) => e !== next)];
  save(storage, updated);
  return updated.slice(0, MAX_ACCOUNTS);
}

/** Forget an address. */
export function forgetAccount(storage: StorageLike | null | undefined, email: unknown): string[] {
  const gone = clean(email);
  const updated = listAccounts(storage).filter((e) => e !== gone);
  save(storage, updated);
  return updated;
}

/** The sign-in page address for switching to an account. A bad address just opens the plain page. */
export function switchUrl(email: unknown): string {
  const addr = clean(email);
  return looksLikeEmail(addr) ? `/login?email=${encodeURIComponent(addr)}` : '/login';
}
