import { test } from '@playwright/test';

// Some PDF reader tests save a clip by hand ("Add highlight manually") to test the clips list. Without
// cleanup every run leaves another copy of the same clip in the Artificial Intelligence & RAG project.
//
// Call this once inside a test.describe. It remembers when the describe started and, when it ends,
// deletes the clips saved from the reader (source /reader?doc=doc-just-enough-research...) since then.
// Clips from before that moment, such as ones you saved yourself, are never touched.
const PROJECT_ID = 'proj-ai-main';
const READER_SOURCE = '/reader?doc=doc-just-enough-research';

export function removeReaderClipsSavedByTheseTests() {
  let startedAt = 0;

  test.beforeAll(() => {
    startedAt = Date.now() - 1000;
  });

  test.afterAll(async ({ request }) => {
    // Debug switch: KEEP_TEST_CLIPS=1 leaves the clips in place so you can look at what a run saved.
    if (process.env.KEEP_TEST_CLIPS) return;
    const res = await request.get(`/api/atoms?projectId=${PROJECT_ID}`);
    if (!res.ok()) return;
    const atoms: any[] = (await res.json()).data ?? [];
    for (const atom of atoms) {
      const savedAt = new Date(atom.capturedAt ?? atom.created_at ?? 0).getTime();
      const fromReader = String(atom.metadata?.sourceUrl ?? '').startsWith(READER_SOURCE);
      if (fromReader && savedAt >= startedAt) {
        await request.delete(`/api/atoms?id=${encodeURIComponent(atom.id)}`);
      }
    }
  });
}
