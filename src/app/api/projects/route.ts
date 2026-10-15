import { NextResponse } from 'next/server';
import { authorize } from '@/lib/auth/server';
import { store, STORE_SOURCE } from '@/lib/data/store';

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

export async function GET(request: Request) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;
  const data = await store.listProjects(auth.user.id);
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
