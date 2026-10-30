import { NextResponse } from 'next/server';
import { authorize, AUTH_REQUIRED } from '@/lib/auth/server';
import { store, STORE_SOURCE } from '@/lib/data/store';
import { sharing } from '@/lib/data/sharingStore';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// Invitations are looked for at most once a minute per person on a warm server, not on every project list.
const lastInviteCheck = new Map<string, number>();

export async function GET(request: Request) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;
  // Only a browser session knows the person's own address (an extension token does not carry it).
  if (AUTH_REQUIRED && auth.user.via === 'cookie' && auth.user.email && Date.now() - (lastInviteCheck.get(auth.user.id) ?? 0) > 60_000) {
    lastInviteCheck.set(auth.user.id, Date.now());
    try {
      await sharing.claimInvites(auth.user.id, auth.user.email);
    } catch {
      // an invitation that cannot be claimed now is tried again on the next load
    }
  }
  // The list and the waiting counts do not depend on each other, so they are read together.
  const wantsCounts = AUTH_REQUIRED && auth.user.via === 'cookie';
  const [listed, countsResult] = await Promise.all([
    store.listProjects(auth.user.id),
    wantsCounts ? sharing.pendingRequestCounts(auth.user.id).then((m) => ({ ok: true as const, m }), () => ({ ok: false as const })) : Promise.resolve(null),
  ]);
  let data = listed;
  // The owner sees how many people are waiting for access on each of their projects.
  if (countsResult && countsResult.ok) {
    try {
      const waiting = countsResult.m;
      if (waiting.size > 0) data = data.map((p) => (waiting.has(p.id) ? { ...p, pendingRequests: waiting.get(p.id) } : p));
    } catch {
      // the count is a convenience
    }
  }
  return NextResponse.json({ success: true, source: STORE_SOURCE, data });
}

export async function POST(request: Request) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;
  try {
    const body = await request.json();
    if (!body.title || !body.title.trim()) {
      return NextResponse.json(
        { success: false, error: 'Project title is required' },
        { status: 400 }
      );
    }

    const payload = {
      title: body.title.trim(),
      description: body.description?.trim() || '',
      color: body.color || body.color_badge || '#325FEC',
      tags: body.tags || [],
      parentId: body.parentId || null,
      folderIcon: body.folderIcon || undefined,
    };

    const created = await store.createProject(auth.user.id, payload);
    if (!created) return NextResponse.json({ success: false, error: 'Could not create the project.' }, { status: 400 });
    return NextResponse.json({ success: true, source: STORE_SOURCE, data: created }, { status: 201 });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to create project' },
      { status: 500 }
    );
  }
}

// Renames a project or changes its colour and avatar: PATCH /api/projects?id=...  (only the fields sent change)
export async function PATCH(request: Request) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'Project ID is required' }, { status: 400 });
    const body = await request.json();
    const patch: { title?: string; description?: string; color?: string; folderIcon?: string | null } = {};
    if (body.title !== undefined) {
      if (typeof body.title !== 'string' || !body.title.trim()) {
        return NextResponse.json({ success: false, error: 'Project title is required' }, { status: 400 });
      }
      patch.title = body.title.trim();
    }
    if (typeof body.description === 'string') patch.description = body.description.trim();
    if (typeof body.color === 'string') patch.color = body.color;
    if (body.folderIcon === null || typeof body.folderIcon === 'string') patch.folderIcon = body.folderIcon;
    const updated = await store.updateProject(auth.user.id, id, patch);
    if (!updated) return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    return NextResponse.json({ success: true, source: STORE_SOURCE, data: updated });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to update project' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // moveTo = keep the clips: they are moved to that project and the rest is deleted.
    const moveTo = searchParams.get('moveTo') || undefined;
    if (moveTo) {
      if (!(await store.ownsProject(auth.user.id, moveTo))) {
        return NextResponse.json({ success: false, error: 'The project to keep the clips in was not found' }, { status: 400 });
      }
      if ((await store.projectFamily(auth.user.id, id)).includes(moveTo)) {
        return NextResponse.json({ success: false, error: 'Choose a project outside the one being deleted' }, { status: 400 });
      }
    }
    const removed = await store.deleteProject(auth.user.id, id, moveTo);
    if (!removed) return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    return NextResponse.json({ success: true, message: 'Project and associated atoms deleted successfully' });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}
