// What a person may do in a project (S-54). Pure functions, no database, so the rules can be tested on their own.
//   owner   everything, including deleting the project and changing who has access
//   editor  add, change and delete clips and documents
//   viewer  read only
export type Role = 'owner' | 'editor' | 'viewer';
export type SharedRole = 'editor' | 'viewer';

const RANK: Record<Role, number> = { viewer: 1, editor: 2, owner: 3 };

export const isSharedRole = (value: unknown): value is SharedRole => value === 'editor' || value === 'viewer';

/** The strongest of several roles (a person who is in a project and its parent), or null when there are none. */
export function strongest(roles: Array<Role | null | undefined | string>): Role | null {
  let best: Role | null = null;
  for (const r of roles) {
    if (r !== 'owner' && r !== 'editor' && r !== 'viewer') continue;
    if (!best || RANK[r] > RANK[best]) best = r;
  }
  return best;
}

/** Any role at all may read. */
export const canRead = (role: Role | null): boolean => role !== null;
/** Add, change and delete clips and documents. */
export const canWrite = (role: Role | null): boolean => role === 'owner' || role === 'editor';
/** Delete the project, change sharing, add or remove people. */
export const canManage = (role: Role | null): boolean => role === 'owner';

/** Lower-case, trimmed address, or '' when it does not look like an email. */
export function cleanEmail(input: unknown): string {
  if (typeof input !== 'string') return '';
  const email = input.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}
