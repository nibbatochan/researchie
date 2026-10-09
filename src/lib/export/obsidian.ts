import JSZip from 'jszip';
import { ResearchProject, ResearchAtom } from '../types/research';

/**
 * Sanitizes a string for use in wikilinks and filenames
 */
export function sanitizeWikilinkName(name: string): string {
  return name
    .replace(/[\\/:*?"<>|#^\[\]]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Formats a project into a single rich Obsidian-compatible Markdown document
 * with Obsidian Callouts, YAML Frontmatter, and [[wikilinks]].
 */
export function formatProjectToObsidianMarkdown(
  project: ResearchProject,
  atoms: ResearchAtom[]
): string {
  const dateStr = new Date().toISOString().split('T')[0];
  const formattedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let md = '';

  // 1. Obsidian YAML Frontmatter
  md += `---\n`;
  md += `title: "${project.title.replace(/"/g, '\\"')}"\n`;
  md += `type: research-project\n`;
  md += `created: ${dateStr}\n`;
  md += `updated: ${dateStr}\n`;
  md += `clips_count: ${atoms.length}\n`;
  if (project.tags && project.tags.length > 0) {
    md += `tags:\n${project.tags.map((t) => `  - ${t.replace(/^#/, '')}`).join('\n')}\n`;
  }
  
  // Extract unique sources for frontmatter
  const sourceMap = new Map<string, string>();
  atoms.forEach((atom) => {
    const title = atom.metadata?.pageTitle || atom.metadata?.documentName || atom.title;
    const url = atom.metadata?.sourceUrl || atom.metadata?.documentUrl || atom.content.targetUrl;
    if (url && title) {
      sourceMap.set(url, sanitizeWikilinkName(title));
    }
  });

  if (sourceMap.size > 0) {
    md += `sources:\n`;
    sourceMap.forEach((title) => {
      md += `  - "[[${title}]]"\n`;
    });
  }
  md += `---\n\n`;

  // 2. Document Title & Description Callout
  md += `# ${project.title}\n\n`;
  
  if (project.description) {
    md += `> [!abstract] Research Objective & Summary\n`;
    md += `> ${project.description.replace(/\n/g, '\n> ')}\n\n`;
  }

  md += `*Generated via **[[Researchie]]** on ${formattedDate} • Contains ${atoms.length} research clips*\n\n`;

  // 3. Quick Table of Contents / Wikilink Index
  md += `## 🧭 Table of Contents\n\n`;
  const categories = [
    { type: 'note', label: 'Syntheses & Notes', icon: '📝' },
    { type: 'quote', label: 'Quotes & Key Excerpts', icon: '💬' },
    { type: 'block', label: 'Web Blocks & Data Tables', icon: '🧩' },
    { type: 'image', label: 'Visual Captures & OCR', icon: '🖼️' },
    { type: 'link', label: 'Saved Links & Bookmarks', icon: '🔗' },
  ];

  categories.forEach((cat) => {
    const count = atoms.filter((a) => a.type === cat.type || (cat.type === 'quote' && a.type === 'text')).length;
    if (count > 0) {
      md += `- [[#${cat.icon} ${cat.label}|${cat.icon} ${cat.label} (${count})]]\n`;
    }
  });
  md += `\n---\n\n`;

  // 4. Notes & Syntheses
  const notes = atoms.filter((a) => a.type === 'note');
  if (notes.length > 0) {
    md += `## 📝 Syntheses & Notes\n\n`;
    notes.forEach((atom, idx) => {
      const title = atom.title || `Research Note ${idx + 1}`;
      md += `> [!note]+ ${title}\n`;
      const body = atom.content.markdownContent || atom.content.description || atom.content.rawText || '';
      md += `> ${body.replace(/\n/g, '\n> ')}\n`;
      
      if (atom.tags && atom.tags.length > 0) {
        md += `>\n> **Tags:** ${atom.tags.map((t) => `#${t.replace(/^#/, '')}`).join(' ')}\n`;
      }
      if (atom.metadata?.sourceUrl || atom.metadata?.pageTitle) {
        const sourceName = sanitizeWikilinkName(atom.metadata.pageTitle || 'Web Source');
        md += `> **Source:** [[${sourceName}]] ([Original Page](${atom.metadata.sourceUrl}))\n`;
      }
      md += `\n`;
    });
    md += `---\n\n`;
  }

  // 5. Quotes & Excerpts
  const quotes = atoms.filter((a) => a.type === 'quote' || a.type === 'text');
  if (quotes.length > 0) {
    md += `## 💬 Quotes & Key Excerpts\n\n`;
    quotes.forEach((atom, idx) => {
      const text = atom.content.rawText || atom.content.text || atom.content.description || '';
      const sourceTitle = atom.metadata?.pageTitle || atom.metadata?.documentName || atom.title || 'Source';
      const cleanSource = sanitizeWikilinkName(sourceTitle);
      const sourceUrl = atom.metadata?.sourceUrl || '';
      const fragment = atom.metadata?.scrollToTextFragment || atom.metadata?.textFragment || '';
      const deepLink = fragment ? (sourceUrl.includes('#:~:text=') ? sourceUrl : `${sourceUrl}${fragment}`) : sourceUrl;

      md += `> [!quote] ${atom.title || `Quote #${idx + 1}`}\n`;
      md += `> "${text.replace(/\n/g, '\n> ')}"\n`;
      md += `>\n`;
      md += `> — From [[${cleanSource}]]`;
      if (deepLink) {
        md += ` • [Jump to Text ↗](${deepLink})`;
      }
      if (atom.metadata?.pageNumber) {
        md += ` • *p. ${atom.metadata.pageNumber}*`;
      }
      md += `\n`;

      if (atom.tags && atom.tags.length > 0) {
        md += `> **Tags:** ${atom.tags.map((t) => `#${t.replace(/^#/, '')}`).join(' ')}\n`;
      }
      md += `\n`;
    });
    md += `---\n\n`;
  }

  // 6. DOM Blocks & Tables
  const blocks = atoms.filter((a) => a.type === 'block');
  if (blocks.length > 0) {
    md += `## 🧩 Web Blocks & Data Tables\n\n`;
    blocks.forEach((atom, idx) => {
      const title = atom.title || `DOM Block ${idx + 1}`;
      md += `> [!example] ${title}\n`;
      if (atom.content.rawText) {
        md += `> \`\`\`text\n`;
        atom.content.rawText.trim().split('\n').forEach((line) => {
          md += `> ${line}\n`;
        });
        md += `> \`\`\`\n`;
      }
      if (atom.metadata?.sourceUrl) {
        const sourceName = sanitizeWikilinkName(atom.metadata.pageTitle || 'Web Page');
        md += `>\n> **Source:** [[${sourceName}]] • [Inspect Source](${atom.metadata.sourceUrl})\n`;
      }
      md += `\n`;
    });
    md += `---\n\n`;
  }

  // 7. Visual Captures & Images
  const images = atoms.filter((a) => a.type === 'image');
  if (images.length > 0) {
    md += `## 🖼️ Visual Captures & OCR\n\n`;
    images.forEach((atom, idx) => {
      const title = atom.title || `Visual Capture ${idx + 1}`;
      const imgUrl = atom.content.imageUrl || atom.content.targetUrl || '';
      
      md += `> [!image] ${title}\n`;
      if (imgUrl) {
        md += `> ![](${imgUrl})\n`;
      }
      if (atom.content.description) {
        md += `>\n> *${atom.content.description}*\n`;
      }
      if (atom.content.ocrText) {
        md += `>\n> **Extracted OCR Text:**\n`;
        md += `> \`\`\`text\n`;
        atom.content.ocrText.trim().split('\n').forEach((line) => {
          md += `> ${line}\n`;
        });
        md += `> \`\`\`\n`;
      }
      if (atom.metadata?.sourceUrl) {
        const sourceName = sanitizeWikilinkName(atom.metadata.pageTitle || 'Web Link');
        md += `>\n> **Source:** [[${sourceName}]]\n`;
      }
      md += `\n`;
    });
    md += `---\n\n`;
  }

  // 8. Saved Links
  const links = atoms.filter((a) => a.type === 'link');
  if (links.length > 0) {
    md += `## 🔗 Saved Links & Bookmarks\n\n`;
    links.forEach((atom) => {
      const url = atom.content.targetUrl || atom.metadata?.sourceUrl || '';
      const title = atom.title || atom.metadata?.pageTitle || url;
      const cleanTitle = sanitizeWikilinkName(title);
      md += `- [[${cleanTitle}]] — [Open URL ↗](${url})\n`;
      if (atom.content.description) {
        md += `  > ${atom.content.description}\n`;
      }
    });
    md += `\n---\n\n`;
  }

  // 9. Sources Index & Backlinks
  md += `## 📚 Source References & Backlinks\n\n`;
  sourceMap.forEach((cleanTitle, url) => {
    md += `- [[${cleanTitle}]] — [${url}](${url})\n`;
  });
  md += `\n`;

  return md;
}

/**
 * Creates a complete multi-file Obsidian Vault as a ZIP archive
 */
export async function generateObsidianVaultZip(
  project: ResearchProject,
  atoms: ResearchAtom[]
): Promise<Blob> {
  const zip = new JSZip();
  const sanitizedProjectTitle = sanitizeWikilinkName(project.title);

  // 1. Add Master Index Note
  const indexContent = formatProjectToObsidianMarkdown(project, atoms);
  zip.file(`${sanitizedProjectTitle}.md`, indexContent);

  // 2. Folder: Clips/
  const clipsFolder = zip.folder('Clips');
  atoms.forEach((atom, idx) => {
    const rawTitle = atom.title || `${atom.type}-${idx + 1}`;
    const safeTitle = `${String(idx + 1).padStart(2, '0')} - ${sanitizeWikilinkName(rawTitle)}`;
    
    let clipMd = '';
    clipMd += `---\n`;
    clipMd += `title: "${safeTitle}"\n`;
    clipMd += `project: "[[${sanitizedProjectTitle}]]"\n`;
    clipMd += `researchie_atom_id: "${atom.id}"\n`;
    clipMd += `type: ${atom.type}\n`;
    clipMd += `date: ${new Date(atom.capturedAt || atom.created_at || Date.now()).toISOString().split('T')[0]}\n`;
    if (atom.tags && atom.tags.length > 0) {
      clipMd += `tags:\n${atom.tags.map((t) => `  - ${t.replace(/^#/, '')}`).join('\n')}\n`;
    }
    clipMd += `---\n\n`;

    clipMd += `# ${atom.title || safeTitle}\n\n`;
    clipMd += `*Part of research project [[${sanitizedProjectTitle}]]*\n\n`;

    if (atom.type === 'quote' || atom.type === 'text') {
      const text = atom.content.rawText || atom.content.text || atom.content.description || '';
      clipMd += `> [!quote]\n> "${text.replace(/\n/g, '\n> ')}"\n\n`;
    } else if (atom.type === 'note') {
      const body = atom.content.markdownContent || atom.content.description || atom.content.rawText || '';
      clipMd += `${body}\n\n`;
    } else if (atom.type === 'block') {
      if (atom.content.rawText) {
        clipMd += `\`\`\`text\n${atom.content.rawText.trim()}\n\`\`\`\n\n`;
      }
    } else if (atom.type === 'image') {
      if (atom.content.imageUrl) {
        clipMd += `![](${atom.content.imageUrl})\n\n`;
      }
      if (atom.content.ocrText) {
        clipMd += `### Extracted OCR\n\`\`\`text\n${atom.content.ocrText}\n\`\`\`\n\n`;
      }
    }

    if (atom.metadata?.sourceUrl) {
      const sourceTitle = sanitizeWikilinkName(atom.metadata.pageTitle || 'Source');
      clipMd += `## Source Details\n`;
      clipMd += `- **Source Document:** [[${sourceTitle}]]\n`;
      clipMd += `- **URL:** [${atom.metadata.sourceUrl}](${atom.metadata.sourceUrl})\n`;
      if (atom.metadata.pageNumber) {
        clipMd += `- **Page Number:** ${atom.metadata.pageNumber}\n`;
      }
    }

    if (clipsFolder) {
      clipsFolder.file(`${safeTitle}.md`, clipMd);
    }
  });

  // 3. Folder: Sources/
  const sourcesFolder = zip.folder('Sources');
  const sourceGroups = new Map<string, ResearchAtom[]>();

  atoms.forEach((atom) => {
    const sourceUrl = atom.metadata?.sourceUrl || atom.metadata?.documentUrl || atom.content.targetUrl;
    if (sourceUrl) {
      const existing = sourceGroups.get(sourceUrl) || [];
      existing.push(atom);
      sourceGroups.set(sourceUrl, existing);
    }
  });

  sourceGroups.forEach((sourceAtoms, url) => {
    const firstAtom = sourceAtoms[0];
    const sourceTitle = sanitizeWikilinkName(firstAtom.metadata?.pageTitle || firstAtom.metadata?.documentName || 'Web Source');
    
    let sourceMd = '';
    sourceMd += `---\n`;
    sourceMd += `title: "${sourceTitle}"\n`;
    sourceMd += `url: "${url}"\n`;
    sourceMd += `type: source-reference\n`;
    sourceMd += `extracted_clips: ${sourceAtoms.length}\n`;
    sourceMd += `---\n\n`;

    sourceMd += `# ${sourceTitle}\n\n`;
    sourceMd += `**Source URL:** [${url}](${url})\n\n`;
    sourceMd += `## Extracted Clips (${sourceAtoms.length})\n\n`;

    sourceAtoms.forEach((a, i) => {
      const clipTitle = sanitizeWikilinkName(a.title || `Clip ${i + 1}`);
      sourceMd += `- [[${clipTitle}]] (${a.type})\n`;
    });

    if (sourcesFolder) {
      sourcesFolder.file(`${sourceTitle}.md`, sourceMd);
    }
  });

  // 4. Pre-configured Obsidian App Settings
  const obsidianFolder = zip.folder('.obsidian');
  if (obsidianFolder) {
    obsidianFolder.file(
      'app.json',
      JSON.stringify(
        {
          useMarkdownLinks: false,
          showLineNumber: true,
          livePreview: true,
          foldHeading: true,
          foldIndent: true,
        },
        null,
        2
      )
    );
  }

  return await zip.generateAsync({ type: 'blob' });
}

/**
 * Builds an obsidian:// URI to create a note directly in Obsidian
 */
export function getObsidianUri(vaultName: string, fileName: string, content: string): string {
  const encodedVault = encodeURIComponent(vaultName || 'Research');
  const encodedFile = encodeURIComponent(sanitizeWikilinkName(fileName));
  const encodedContent = encodeURIComponent(content);
  return `obsidian://new?vault=${encodedVault}&name=${encodedFile}&content=${encodedContent}`;
}
