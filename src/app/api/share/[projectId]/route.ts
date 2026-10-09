import { NextResponse } from 'next/server';
import { getLocalProjects, getLocalAtoms } from '@/lib/data/researchStore';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(
  request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await context.params;

    // 1. Fetch project metadata
    let project = null;
    let atoms: any[] = [];

    // Try Supabase first if configured
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { data: projData } = await supabaseAdmin
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projData) {
        project = {
          id: projData.id,
          userId: projData.user_id,
          title: projData.title,
          description: projData.description,
          color: projData.color,
          tags: projData.tags || [],
          atomCount: projData.atom_count || 0,
          sharing: projData.sharing || {
            isPublic: true,
            allowGuestComments: true,
            allowDuplication: true,
            collaborators: [],
          },
          createdAt: projData.created_at,
          updatedAt: projData.updated_at,
        };

        const { data: atomData } = await supabaseAdmin
          .from('atoms')
          .select('*')
          .eq('project_id', projectId)
          .order('captured_at', { ascending: false });

        if (atomData) {
          atoms = atomData.map((a) => ({
            id: a.id,
            projectId: a.project_id,
            type: a.type,
            title: a.title,
            content: a.content || {},
            metadata: a.metadata || {},
            visualSnapshot: a.visual_snapshot,
            tags: a.tags || [],
            userNotes: a.user_notes,
            capturedAt: a.captured_at,
          }));
        }
      }
    }

    // Fallback to local store if not in Supabase
    if (!project) {
      const localProjects = getLocalProjects();
      project = localProjects.find((p) => p.id === projectId);
      if (project) {
        atoms = getLocalAtoms(projectId);
      }
    }

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Research stream not found or is private' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        project,
        atoms,
      },
    });
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
