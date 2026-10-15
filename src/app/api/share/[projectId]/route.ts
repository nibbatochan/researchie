import { NextResponse } from 'next/server';
import { authorize, getRequestUser, AUTH_REQUIRED } from '@/lib/auth/server';
import { store } from '@/lib/data/store';
import { sharing } from '@/lib/data/sharingStore';
import { LINK_PREFIX } from '@/lib/data/sharing';

export async function GET(
  request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await context.params;

    // A share link (S-54). A view link shows the project read-only to anyone. An edit link needs a sign-in; a
    // signed-in person who opens it becomes an editor and is sent to the app.
    if (projectId.startsWith(LINK_PREFIX)) {
      if (!AUTH_REQUIRED) return NextResponse.json({ success: false, error: 'Share links are used on the accounts deployment.' }, { status: 404 });
      const link = await sharing.resolveLink(projectId);
      if (!link) return NextResponse.json({ success: false, error: 'This link is turned off or does not exist.' }, { status: 404 });
      if (link.role === 'editor') {
        const user = await getRequestUser(request, { allowToken: false });
        if (!user) return NextResponse.json({ success: false, code: 'SIGN_IN_REQUIRED', error: 'Sign in to open this link.' }, { status: 401 });
        const joined = await sharing.joinViaLink(user.id, projectId);
        if (!joined) return NextResponse.json({ success: false, error: 'This link is turned off or does not exist.' }, { status: 404 });
        return NextResponse.json({ success: true, joined: true, projectId: joined });
      }
      const shared = await sharing.readByLink(projectId);
      if (!shared) return NextResponse.json({ success: false, error: 'This link is turned off or does not exist.' }, { status: 404 });
      return NextResponse.json({ success: true, data: { project: shared.project, atoms: shared.atoms }, linkRole: shared.role });
    }

    // Sharing between accounts is not built yet, so only the owner can open a project's page. (With accounts
    // off, the one local user owns everything.)
    const auth = await authorize(request);
    if (auth.response) return auth.response;
    const project = (await store.listProjects(auth.user.id)).find((p) => p.id === projectId);
    if (!project) {
      // The project exists but this person has no access: offer to ask for it (S-54).
      if (AUTH_REQUIRED) {
        const state = await sharing.accessState(auth.user.id, projectId);
        if (state.exists) {
          return NextResponse.json({ success: false, code: 'NO_ACCESS', request: state.request, error: 'You need access to open this project.' }, { status: 403 });
        }
      }
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
      // The only thing a visitor can do here is ask the owner for access.
      const auth = await authorize(request, { allowToken: false });
      if (auth.response) return auth.response;
      const ask = await request.json().catch(() => ({}));
      if (ask.action !== 'request-access') return NextResponse.json({ success: false, error: 'Unknown action.' }, { status: 400 });
      const { projectId: askedId } = await context.params;
      const r = await sharing.requestAccess(auth.user.id, askedId, ask.message);
      if (!r.ok) return NextResponse.json({ success: false, error: r.error, code: r.code }, { status: r.code === 'NOT_FOUND' ? 404 : 400 });
      return NextResponse.json({ success: true, already: r.already });
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
