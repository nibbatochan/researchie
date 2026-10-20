// Saving the paper outline. It is stored as one JSON string per project under a preference key, so it follows
// the account on the tester site and stays in the browser in local mode (see src/lib/prefs/prefsContext.tsx).
// Each person has their own outline of a project: a collaborator never changes it.
// The whole settings object an account can hold is capped at 256 KB (src/app/api/settings/route.ts), shared
// with every other preference, so one outline is kept well under that.

import { parseOutline, type PaperOutline } from './outline.ts';

export const MAX_OUTLINE_BYTES = 60 * 1024;

export function outlineKey(projectId: string): string {
  return `researchie.paperOutline.${projectId}`;
}

export const STYLE_PREF_KEY = 'researchie.inTextStyle';

export type SerializeResult = { ok: true; json: string } | { ok: false; reason: string };

/** The JSON to save, or the reason it can not be saved. The outline is never cut down silently. */
export function serializeOutline(outline: PaperOutline): SerializeResult {
  const json = JSON.stringify(outline);
  const bytes = new TextEncoder().encode(json).length;
  if (bytes > MAX_OUTLINE_BYTES) {
    return { ok: false, reason: `This outline is ${Math.round(bytes / 1024)} KB, over the ${MAX_OUTLINE_BYTES / 1024} KB that can be saved with your account. Clear an old draft or remove clips you no longer need.` };
  }
  return { ok: true, json };
}

/** Reads a saved outline. A missing or damaged value gives undefined, so the user starts a fresh one. */
export function readOutline(raw: string | null | undefined): PaperOutline | undefined {
  if (!raw) return undefined;
  try {
    return parseOutline(JSON.parse(raw));
  } catch {
    return undefined;
  }
}
