import { NextResponse } from 'next/server';
import { authorize, AUTH_REQUIRED } from '@/lib/auth/server';
import { store } from '@/lib/data/store';

export async function GET(
  request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await context.params;

    // Sharing between accounts is not built yet, so only the owner can open a project's page. (With accounts
    // off, the one local user owns everything.)
    const auth = await authorize(request);
    if (auth.response) return auth.response;
    const project = (await store.listProjects(auth.user.id)).find((p) => p.id === projectId);
    if (!project) {
      return NextResponse.json({ success: false, error: 'Research stream not found or is private' }, { status: 404 });
    }
    const atoms = await store.listAtoms(auth.user.id, projectId);
    return NextResponse.json({ success: true, data: { project, atoms } });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to load shared stream' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    if (AUTH_REQUIRED) {
      return NextResponse.json({ success: false, error: 'Sharing is not available yet.', code: 'UNAVAILABLE' }, { status: 501 });
    }
    const { projectId } = await context.params;
    const body = await request.json();

    // Body can update sharing settings or add collaborator
    return NextResponse.json({
      success: true,
      message: 'Sharing settings updated',
      data: body,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
