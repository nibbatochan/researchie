import { NextResponse } from 'next/server';
import { unavailableInTesterMode } from '@/lib/auth/server';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

// projectId names a file on disk and is passed to a script, so it is limited to the characters real project ids use.
const PROJECT_ID = /^[A-Za-z0-9_-]{1,100}$/;
const DEFAULT_PROJECT = 'proj-rag-production-systems';

function runGraphBuilder(projectId: string) {
  return execFileAsync('python', ['scripts/cognee_graph_builder.py', projectId], { timeout: 120_000 });
}

function badProjectId() {
  return NextResponse.json({ success: false, error: 'Invalid projectId' }, { status: 400 });
}

export async function GET(request: Request) {
  const blocked = unavailableInTesterMode('The knowledge graph');
  if (blocked) return blocked;
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || DEFAULT_PROJECT;
    if (!PROJECT_ID.test(projectId)) return badProjectId();

    const graphFile = path.join(process.cwd(), `.cognee-graph-${projectId}.json`);

    if (fs.existsSync(graphFile)) {
      try {
        const raw = fs.readFileSync(graphFile, 'utf-8');
        const data = JSON.parse(raw);
        return NextResponse.json({
          success: true,
          source: 'cognee_cache',
          data,
        });
      } catch (err) {
        console.warn('Error reading graph cache:', err);
      }
    }

    // Run graph builder script if not yet generated
    try {
      await runGraphBuilder(projectId);
      if (fs.existsSync(graphFile)) {
        const raw = fs.readFileSync(graphFile, 'utf-8');
        const data = JSON.parse(raw);
        return NextResponse.json({
          success: true,
          source: 'cognee_computed',
          data,
        });
      }
    } catch (err) {
      console.warn('Error executing graph builder:', err);
    }

    return NextResponse.json({
      success: true,
      data: {
        projectId,
        links: [],
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve knowledge graph' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const blocked = unavailableInTesterMode('The knowledge graph');
  if (blocked) return blocked;
  try {
    const body = await request.json();
    const projectId = body.projectId || DEFAULT_PROJECT;
    if (typeof projectId !== 'string' || !PROJECT_ID.test(projectId)) return badProjectId();

    try {
      await runGraphBuilder(projectId);
      const graphFile = path.join(process.cwd(), `.cognee-graph-${projectId}.json`);
      if (fs.existsSync(graphFile)) {
        const raw = fs.readFileSync(graphFile, 'utf-8');
        const data = JSON.parse(raw);
        return NextResponse.json({
          success: true,
          message: 'Knowledge graph computed successfully with Cognee',
          data,
        });
      }
    } catch (err: any) {
      console.warn('Cognee graph builder error:', err?.message);
    }

    return NextResponse.json({
      success: true,
      data: {
        projectId,
        links: [],
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to build knowledge graph' },
      { status: 500 }
    );
  }
}
