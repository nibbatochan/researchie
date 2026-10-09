import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || 'proj-rag-production-systems';

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
      await execAsync(`python scripts/cognee_graph_builder.py "${projectId}"`);
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
  try {
    const body = await request.json();
    const projectId = body.projectId || 'proj-rag-production-systems';

    try {
      await execAsync(`python scripts/cognee_graph_builder.py "${projectId}"`);
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
