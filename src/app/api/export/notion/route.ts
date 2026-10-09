import { NextRequest, NextResponse } from 'next/server';
import { formatProjectToNotionBlocks } from '@/lib/export/notion';
import { ResearchProject, ResearchAtom } from '@/lib/types/research';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { apiKey, parentPageId, project, atoms, isDatabase, incremental } = body as {
      apiKey: string;
      parentPageId: string;
      project: ResearchProject;
      atoms: ResearchAtom[];
      isDatabase?: boolean;
      incremental?: boolean;
    };

    if (!apiKey || !apiKey.trim()) {
      return NextResponse.json(
        { error: 'Notion API Integration Token is required.' },
        { status: 400 }
      );
    }

    if (!parentPageId || !parentPageId.trim()) {
      return NextResponse.json(
        { error: 'Parent Page or Database ID is required.' },
        { status: 400 }
      );
    }

    if (!project || !project.title) {
      return NextResponse.json(
        { error: 'Invalid project data provided.' },
        { status: 400 }
      );
    }

    // Clean Parent ID (remove dashes or extract from URL if user pasted full Notion URL)
    let cleanedParentId = parentPageId.trim();
    const urlMatch = cleanedParentId.match(/([a-f0-9]{32}|[a-f0-9-]{36})(?:\?.*)?$/i);
    if (urlMatch) {
      cleanedParentId = urlMatch[1].replace(/-/g, '');
    } else {
      cleanedParentId = cleanedParentId.replace(/-/g, '');
    }

    // Generate Notion blocks
    const allBlocks = formatProjectToNotionBlocks(project, atoms || []);

    const headers = {
      'Authorization': `Bearer ${apiKey.trim()}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    };

    // Incremental Append Mode with collision detection & deduplication:
    if (incremental) {
      let existingBlockText = '';
      try {
        const existingRes = await fetch(
          `https://api.notion.com/v1/blocks/${cleanedParentId}/children?page_size=100`,
          { headers }
        );
        if (existingRes.ok) {
          const existingData = await existingRes.json();
          if (Array.isArray(existingData.results)) {
            existingBlockText = JSON.stringify(existingData.results);
          }
        }
      } catch (fetchErr) {
        console.warn('Could not inspect existing Notion blocks for collision check:', fetchErr);
      }

      // Filter atoms to only append non-colliding new clips
      const newAtoms = (atoms || []).filter((atom) => {
        if (!existingBlockText) return true;
        // Check for atom ID marker or title match
        const atomIdMarker = atom.id;
        const textSnippet = (atom.content.rawText || atom.content.text || '').slice(0, 50);
        if (existingBlockText.includes(atomIdMarker)) return false;
        if (textSnippet && textSnippet.length > 20 && existingBlockText.includes(textSnippet)) return false;
        return true;
      });

      const skippedCount = (atoms || []).length - newAtoms.length;

      if (newAtoms.length === 0 && (atoms || []).length > 0) {
        return NextResponse.json({
          success: true,
          pageId: cleanedParentId,
          pageUrl: `https://notion.so/${cleanedParentId}`,
          blocksExported: 0,
          totalAtoms: atoms.length,
          appendedCount: 0,
          skippedCollisions: skippedCount,
          message: 'All research clips are already synced to this Notion page. Zero duplicates or collisions.',
          title: project.title,
          mode: 'incremental_append',
        });
      }

      const dateHeader = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
      const syncHeaderBlock = {
        object: 'block',
        type: 'callout',
        callout: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: `⚡ Researchie Incremental Sync (${dateHeader})\nAppended ${newAtoms.length} new research clips (${skippedCount} already synced clips skipped for collision prevention).`,
              },
              annotations: { bold: true },
            },
          ],
          icon: { type: 'emoji', emoji: '⚡' },
          color: 'blue_background',
        },
      };

      const blocksToAppend = [syncHeaderBlock, ...formatProjectToNotionBlocks(project, newAtoms)];
      for (let i = 0; i < blocksToAppend.length; i += 100) {
        const batch = blocksToAppend.slice(i, i + 100);
        const appendRes = await fetch(
          `https://api.notion.com/v1/blocks/${cleanedParentId}/children`,
          {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ children: batch }),
          }
        );
        if (!appendRes.ok) {
          const errData = await appendRes.json().catch(() => ({}));
          return NextResponse.json(
            { error: errData.message || `Notion API returned status ${appendRes.status}`, details: errData },
            { status: appendRes.status }
          );
        }
      }

      return NextResponse.json({
        success: true,
        pageId: cleanedParentId,
        pageUrl: `https://notion.so/${cleanedParentId}`,
        blocksExported: blocksToAppend.length,
        totalAtoms: atoms.length,
        appendedCount: newAtoms.length,
        skippedCollisions: skippedCount,
        title: project.title,
        mode: 'incremental_append',
      });
    }

    // Notion allows maximum 100 blocks in initial page creation
    const initialBlocks = allBlocks.slice(0, 100);
    const remainingBlocks = allBlocks.slice(100);

    // Construct Page Payload
    const pagePayload: any = {
      icon: {
        type: 'emoji',
        emoji: '🔬',
      },
      cover: {
        type: 'external',
        external: {
          url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
        },
      },
      children: initialBlocks,
    };

    if (isDatabase) {
      pagePayload.parent = { database_id: cleanedParentId };
      pagePayload.properties = {
        Name: {
          title: [
            {
              text: {
                content: project.title,
              },
            },
          ],
        },
      };
    } else {
      pagePayload.parent = { page_id: cleanedParentId };
      pagePayload.properties = {
        title: {
          title: [
            {
              text: {
                content: project.title,
              },
            },
          ],
        },
      };
    }

    // 1. Create the page
    const createRes = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers,
      body: JSON.stringify(pagePayload),
    });

    if (!createRes.ok) {
      const errData = await createRes.json().catch(() => ({}));
      return NextResponse.json(
        {
          error: errData.message || `Notion API returned status ${createRes.status}`,
          details: errData,
        },
        { status: createRes.status }
      );
    }

    const createdPage = await createRes.json();
    const createdPageId = createdPage.id;
    const pageUrl = createdPage.url || `https://notion.so/${createdPageId.replace(/-/g, '')}`;

    // 2. Append remaining blocks in batches of 100 if necessary
    if (remainingBlocks.length > 0) {
      for (let i = 0; i < remainingBlocks.length; i += 100) {
        const batch = remainingBlocks.slice(i, i + 100);
        const appendRes = await fetch(
          `https://api.notion.com/v1/blocks/${createdPageId}/children`,
          {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ children: batch }),
          }
        );

        if (!appendRes.ok) {
          console.warn('Failed to append subsequent block chunk to Notion page', await appendRes.text());
        }
      }
    }

    return NextResponse.json({
      success: true,
      pageId: createdPageId,
      pageUrl,
      blocksExported: allBlocks.length,
      title: project.title,
    });
  } catch (error: any) {
    console.error('Notion export handler error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error while syncing to Notion.' },
      { status: 500 }
    );
  }
}
