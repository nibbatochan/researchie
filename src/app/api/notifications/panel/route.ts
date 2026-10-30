import { NextResponse } from 'next/server';
import { authorize, AUTH_REQUIRED } from '@/lib/auth/server';
import { sharing } from '@/lib/data/sharingStore';
import { store } from '@/lib/data/store';

// What the notification box shows when it opens: the five clips most recently added to projects this person can see
// (from the web app or the extension alike), and the access requests waiting on projects they own. Browser sessions
// only, and accounts deployment only.
const NO_STORE = { 'Cache-Control': 'no-store' };

export async function GET(request: Request) {
  if (!AUTH_REQUIRED) return NextResponse.json({ success: true, local: true, activity: [], requests: [] }, { headers: NO_STORE });
  const auth = await authorize(request, { allowToken: false });
  if (auth.response) return auth.response;
  const [atoms, projects, requests] = await Promise.all([
    store.listAtoms(auth.user.id),
    store.listProjects(auth.user.id),
    sharing.pendingRequests(auth.user.id),
  ]);
  const titles = new Map(projects.map((p) => [p.id, p.title]));
  const activity = [...atoms]
    .sort((a, b) => (b.capturedAt ?? '').localeCompare(a.capturedAt ?? ''))
    .slice(0, 5)
    .map((a) => ({
      id: a.id,
      title: a.title || 'Untitled clip',
      projectId: a.projectId,
      projectTitle: titles.get(a.projectId) ?? '',
      capturedAt: a.capturedAt ?? null,
    }));
  return NextResponse.json({ success: true, activity, requests }, { headers: NO_STORE });
}
