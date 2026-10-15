// Pinning an atom keeps it at the top of the feed, like a pinned chat. The pin is stored in the atom's
// existing metadata JSON as metadata.pinnedAt (an ISO time), so no database change is needed.
// Present means pinned. The newest pin sits first.

interface Pinnable {
  metadata?: { pinnedAt?: string } | null;
}

export function isPinned(atom: Pinnable): boolean {
  return typeof atom.metadata?.pinnedAt === 'string' && atom.metadata.pinnedAt.length > 0;
}

/** Returns metadata with the pin set or cleared. Everything else in metadata is kept. */
export function withPinned<M extends object>(metadata: M | undefined | null, pinned: boolean, now: Date = new Date()): M & { pinnedAt?: string } {
  const next = { ...(metadata ?? ({} as M)) } as M & { pinnedAt?: string };
  if (pinned) next.pinnedAt = now.toISOString();
  else delete next.pinnedAt;
  return next;
}

/** Pinned atoms first (newest pin first), then the rest in their given order. */
export function sortPinnedFirst<A extends Pinnable>(atoms: A[]): A[] {
  const pinned = atoms
    .filter(isPinned)
    .sort((a, b) => (b.metadata!.pinnedAt as string).localeCompare(a.metadata!.pinnedAt as string));
  return [...pinned, ...atoms.filter((a) => !isPinned(a))];
}

export async function savePinned(atomId: string, pinned: boolean): Promise<void> {
  const res = await fetch('/api/atoms', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: atomId, pinned }),
  });
  if (!res.ok) throw new Error('Could not save the pin.');
}
