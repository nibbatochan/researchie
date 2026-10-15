import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getLocalProjects, getLocalAtoms, updateLocalAtom, createLocalProject, deleteLocalProject } from '@/lib/data/researchStore';
import { authorize, AUTH_REQUIRED } from '@/lib/auth/server';
import { cloud } from '@/lib/data/cloudStore';

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
  if (AUTH_REQUIRED) {
    const data = await cloud.listProjects(auth.user.id);
    return NextResponse.json({ success: true, source: 'supabase', data });
  }
  try {
    // Try querying Supabase
    const { data, error } = await supabaseAdmin
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false });

    if (!error && data && data.length > 0) {
      const local = getLocalProjects();
      const dbProjects = data.map((p) => ({
        id: p.id,
        userId: p.user_id,
        parentId: p.parent_id || p.parentId || null,
        folderIcon: p.folder_icon || p.folderIcon,
        title: p.title,
        description: p.description,
        color: p.color,
        tags: p.tags || [],
        atomCount: p.atom_count || 0,
        lastAccessedAt: p.last_accessed_at || p.lastAccessedAt || p.updated_at,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      }));

      // Merge local initial projects that are not yet in Supabase
      const missingLocal = local.filter((lp) => !dbProjects.some((dp) => dp.id === lp.id));
      const combined = [...missingLocal, ...dbProjects];

      return NextResponse.json({
        success: true,
        source: 'supabase_merged',
        data: combined,
      });
    }

    // Fallback to local store
    const local = getLocalProjects();
    return NextResponse.json({
      success: true,
      source: 'local_store',
      data: local,
    });
  } catch {
    const local = getLocalProjects();
    return NextResponse.json({
      success: true,
      source: 'local_store',
      data: local,
    });
  }
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

    if (AUTH_REQUIRED) {
      const created = await cloud.createProject(auth.user.id, payload);
      if (!created) return NextResponse.json({ success: false, error: 'Could not create the project.' }, { status: 400 });
      return NextResponse.json({ success: true, source: 'supabase', data: created }, { status: 201 });
    }

    // Try inserting into Supabase
    try {
      const { data, error } = await supabaseAdmin
        .from('projects')
        .insert({
          title: payload.title,
          description: payload.description,
          color: payload.color,
          tags: payload.tags,
          atom_count: 0,
        })
        .select()
        .single();

      if (!error && data) {
        return NextResponse.json(
          {
            success: true,
            source: 'supabase',
            data: {
              id: data.id,
              userId: data.user_id,
              title: data.title,
              description: data.description,
              color: data.color,
              tags: data.tags,
              atomCount: data.atom_count,
              createdAt: data.created_at,
              updatedAt: data.updated_at,
            },
          },
          { status: 201 }
        );
      }
    } catch {
      // Ignore and fallback to local
    }

    // Fallback to local store
    const local = createLocalProject(payload);
    return NextResponse.json(
      {
        success: true,
        source: 'local_store',
        data: local,
      },
      { status: 201 }
    );
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
    if (AUTH_REQUIRED) {
      if (moveTo && !(await cloud.ownsProject(auth.user.id, moveTo))) {
        return NextResponse.json({ success: false, error: 'The project to keep the clips in was not found' }, { status: 400 });
      }
      const removed = await cloud.deleteProject(auth.user.id, id, moveTo);
      if (!removed) return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
      return NextResponse.json({ success: true, message: 'Project and associated atoms deleted successfully' });
    }

    if (moveTo) {
      // Keep the clips: move them out of this project and its sub-projects before anything is deleted.
      const doomed = new Set([id, ...getLocalProjects().filter((p) => p.parentId === id).map((p) => p.id)]);
      if (doomed.has(moveTo)) {
        return NextResponse.json({ success: false, error: 'Choose a project outside the one being deleted' }, { status: 400 });
      }
      for (const atom of getLocalAtoms().filter((a) => doomed.has(a.projectId))) {
        updateLocalAtom(atom.id, { projectId: moveTo } as any);
      }
      try {
        await supabaseAdmin.from('atoms').update({ project_id: moveTo }).in('project_id', Array.from(doomed));
      } catch {}
    }

    // Try Supabase delete
    try {
      await supabaseAdmin.from('atoms').delete().eq('project_id', id);
      await supabaseAdmin.from('projects').delete().eq('id', id);
    } catch {}

    deleteLocalProject(id);

    return NextResponse.json({
      success: true,
      message: 'Project and associated atoms deleted successfully',
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}
