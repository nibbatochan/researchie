import { ResearchProject, ResearchAtom } from '../types/research';

export interface ExportOptions {
  includeQuotes?: boolean;
  includeNotes?: boolean;
  includeImages?: boolean;
  includeBlocks?: boolean;
  includeLinks?: boolean;
  includeCitations?: boolean;
}

/**
 * Exports a project and its research atoms to Obsidian/Notion-compatible Markdown.
 */
export function formatProjectToMarkdown(
  project: ResearchProject,
  atoms: ResearchAtom[],
  options: ExportOptions = {
    includeQuotes: true,
    includeNotes: true,
    includeImages: true,
    includeBlocks: true,
    includeLinks: true,
    includeCitations: true,
  }
): string {
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let md = '';

  // YAML Frontmatter for Obsidian / Notion / Logseq
  md += `---\n`;
  md += `title: "${project.title.replace(/"/g, '\\"')}"\n`;
  md += `date: ${new Date().toISOString().split('T')[0]}\n`;
  md += `clips_count: ${atoms.length}\n`;
  if (project.tags && project.tags.length > 0) {
    md += `tags: [${project.tags.map((t) => `"${t}"`).join(', ')}]\n`;
  }
  md += `---\n\n`;

  // Project Header
  md += `# ${project.title}\n\n`;
  if (project.description) {
    md += `> ${project.description}\n\n`;
  }
  md += `*Exported from Researchie on ${dateStr} • ${atoms.length} research clips*\n\n`;
  md += `---\n\n`;

  // Filter atoms by category
  const quotes = atoms.filter((a) => a.type === 'quote' || a.type === 'text');
  const notes = atoms.filter((a) => a.type === 'note');
  const blocks = atoms.filter((a) => a.type === 'block');
  const images = atoms.filter((a) => a.type === 'image');
  const links = atoms.filter((a) => a.type === 'link');

  // 1. Research Notes & Syntheses
  if (options.includeNotes && notes.length > 0) {
    md += `## 📝 Notes & Syntheses\n\n`;
    notes.forEach((atom, idx) => {
      md += `### ${idx + 1}. ${atom.title || 'Research Note'}\n\n`;
      if (atom.content.markdownContent) {
        md += `${atom.content.markdownContent}\n\n`;
      } else if (atom.content.description) {
        md += `${atom.content.description}\n\n`;
      }
      if (atom.tags && atom.tags.length > 0) {
        md += `*Tags:* ${atom.tags.map((t) => `\`${t}\``).join(' ')}\n\n`;
      }
      if (atom.metadata?.sourceUrl) {
        md += `*Source:* [${atom.metadata.pageTitle || atom.metadata.sourceUrl}](${atom.metadata.sourceUrl})\n\n`;
      }
      md += `---\n\n`;
    });
  }

  // 2. Key Quotes & Excerpts
  if (options.includeQuotes && quotes.length > 0) {
    md += `## 💬 Quotes & Key Excerpts\n\n`;
    quotes.forEach((atom, idx) => {
      const text = atom.content.rawText || atom.content.text || atom.content.description || '';
      const sourceUrl = atom.metadata?.sourceUrl || '';
      const fragment = atom.metadata?.scrollToTextFragment || atom.metadata?.textFragment || '';
      const deepLink = fragment ? (sourceUrl.includes('#:~:text=') ? sourceUrl : `${sourceUrl}${fragment}`) : sourceUrl;
      const title = atom.metadata?.pageTitle || atom.title || 'Source';

      md += `> "${text}"\n\n`;
      if (deepLink) {
        md += `— [${title}](${deepLink})\n\n`;
      }
      if (atom.tags && atom.tags.length > 0) {
        md += `*Tags:* ${atom.tags.map((t) => `\`${t}\``).join(' ')}\n\n`;
      }
    });
    md += `---\n\n`;
  }

  // 3. Captured Web Blocks & Data Tables
  if (options.includeBlocks && blocks.length > 0) {
    md += `## 🧩 Captured Web Blocks & Tables\n\n`;
    blocks.forEach((atom, idx) => {
      md += `### ${idx + 1}. ${atom.title || 'Captured DOM Block'}\n\n`;
      if (atom.content.rawText) {
        md += `\`\`\`text\n${atom.content.rawText.trim()}\n\`\`\`\n\n`;
      }
      if (atom.metadata?.sourceUrl) {
        md += `*Source:* [${atom.metadata.pageTitle || atom.metadata.sourceUrl}](${atom.metadata.sourceUrl})\n\n`;
      }
      md += `---\n\n`;
    });
  }

  // 4. Visual References & Images
  if (options.includeImages && images.length > 0) {
    md += `## 🖼️ Visual Captures & Images\n\n`;
    images.forEach((atom, idx) => {
      const imgUrl = atom.content.imageUrl || atom.content.targetUrl || '';
      md += `### ${idx + 1}. ${atom.title || 'Captured Image'}\n\n`;
      if (imgUrl) {
        md += `![${atom.title || 'Image'}](${imgUrl})\n\n`;
      }
      if (atom.content.description) {
        md += `*${atom.content.description}*\n\n`;
      }
      if (atom.metadata?.sourceUrl) {
        md += `*Source:* [${atom.metadata.pageTitle || 'Web Link'}](${atom.metadata.sourceUrl})\n\n`;
      }
      md += `---\n\n`;
    });
  }

  // 5. Links & Bookmarks
  if (options.includeLinks && links.length > 0) {
    md += `## 🔗 Bookmarks & Links\n\n`;
    links.forEach((atom) => {
      const url = atom.content.targetUrl || atom.metadata?.sourceUrl || '';
      md += `- [${atom.title || url}](${url})\n`;
      if (atom.content.description) {
        md += `  - ${atom.content.description}\n`;
      }
    });
    md += `\n---\n\n`;
  }

  // 6. Complete Source Bibliography
  if (options.includeCitations) {
    md += `## 📚 Source Bibliography\n\n`;
    const uniqueSources = new Map<string, string>();
    atoms.forEach((atom) => {
      const url = atom.metadata?.sourceUrl || atom.content.targetUrl;
      const title = atom.metadata?.pageTitle || atom.title || url;
      if (url && !uniqueSources.has(url)) {
        uniqueSources.set(url, title || url);
      }
    });

    let i = 1;
    uniqueSources.forEach((title, url) => {
      let hostname = '';
      try {
        hostname = new URL(url).hostname;
      } catch {}
      md += `${i}. **${title}** (${hostname || 'Web Source'}). [${url}](${url})\n`;
      i++;
    });
    md += `\n`;
  }

  return md;
}

/**
 * Formats citations into APA, MLA, or Markdown list.
 */
export function formatBibliography(
  atoms: ResearchAtom[],
  format: 'markdown' | 'apa' | 'bibtex' = 'markdown'
): string {
  const uniqueSources = new Map<string, { title: string; url: string; date: string }>();
  atoms.forEach((atom) => {
    const url = atom.metadata?.sourceUrl || atom.content.targetUrl;
    const title = atom.metadata?.pageTitle || atom.title || 'Research Source';
    const date = atom.capturedAt || atom.created_at || new Date().toISOString();
    if (url && !uniqueSources.has(url)) {
      uniqueSources.set(url, { title, url, date });
    }
  });

  if (format === 'apa') {
    let apa = '';
    uniqueSources.forEach(({ title, url, date }) => {
      let hostname = 'Web';
      try {
        hostname = new URL(url).hostname;
      } catch {}
      const year = new Date(date).getFullYear();
      apa += `${hostname}. (${year}). ${title}. Retrieved from ${url}\n\n`;
    });
    return apa.trim();
  }

  if (format === 'bibtex') {
    let bib = '';
    let idx = 1;
    uniqueSources.forEach(({ title, url, date }) => {
      const year = new Date(date).getFullYear();
      const key = `source_${idx}_${year}`;
      bib += `@misc{${key},\n`;
      bib += `  title = {${title}},\n`;
      bib += `  url = {${url}},\n`;
      bib += `  year = {${year}},\n`;
      bib += `  note = {Accessed: ${new Date(date).toISOString().split('T')[0]}}\n`;
      bib += `}\n\n`;
      idx++;
    });
    return bib.trim();
  }

  // Default Markdown List
  let md = '';
  uniqueSources.forEach(({ title, url }) => {
    md += `- [${title}](${url})\n`;
  });
  return md.trim();
}

/**
 * Exports full project and atoms to portable JSON format.
 */
export function formatProjectToJson(project: ResearchProject, atoms: ResearchAtom[]): string {
  const payload = {
    version: 'researchie-v1',
    exportedAt: new Date().toISOString(),
    project: {
      id: project.id,
      title: project.title,
      description: project.description,
      color: project.color,
      tags: project.tags,
    },
    clipsCount: atoms.length,
    clips: atoms,
  };

  return JSON.stringify(payload, null, 2);
}
