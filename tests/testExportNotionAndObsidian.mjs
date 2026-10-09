import assert from 'assert';
import { formatProjectToObsidianMarkdown, generateObsidianVaultZip, getObsidianUri } from '../src/lib/export/obsidian.js';
import { formatProjectToNotionBlocks, formatProjectToNotionMarkdown } from '../src/lib/export/notion.js';

console.log('🧪 Starting Direct Notion & Obsidian Sync Engine Test Suite...\n');

const mockProject = {
  id: 'proj-123',
  title: 'AI Research Assistant Architecture',
  description: 'Deep dive into grounding techniques, vector projections, and context windows for web clippers.',
  tags: ['ai', 'rag', 'architecture'],
  color: '#325FEC',
};

const mockAtoms = [
  {
    id: 'atom-1',
    projectId: 'proj-123',
    type: 'note',
    title: 'Context Window Constraints',
    content: {
      markdownContent: 'Retrieval Augmented Generation with 768-dim embeddings yields 94% recall for paragraph-level quotes.',
    },
    tags: ['embeddings', 'rag'],
    metadata: {
      sourceUrl: 'https://arxiv.org/abs/2305.18290',
      pageTitle: 'Dense Passage Retrieval Benchmark',
    },
  },
  {
    id: 'atom-2',
    projectId: 'proj-123',
    type: 'quote',
    title: 'Deep Link Quote',
    content: {
      rawText: 'W3C text fragments allow seamless jumping without brittle DOM CSS selectors.',
    },
    tags: ['standards'],
    metadata: {
      sourceUrl: 'https://wicg.github.io/scroll-to-text-fragment/',
      pageTitle: 'W3C Text Fragment Specification',
      scrollToTextFragment: '#:~:text=W3C,selectors',
      pageNumber: 4,
    },
  },
  {
    id: 'atom-3',
    projectId: 'proj-123',
    type: 'block',
    title: 'Pricing Comparison Table',
    content: {
      rawText: '| Tier | Price | Queries |\n| Pro | $12 | Unlimited |',
    },
    tags: ['pricing'],
    metadata: {
      sourceUrl: 'https://example.com/pricing',
      pageTitle: 'Competitor Pricing',
    },
  },
  {
    id: 'atom-4',
    projectId: 'proj-123',
    type: 'image',
    title: 'Architecture Diagram',
    content: {
      imageUrl: 'https://example.com/arch.png',
      description: 'System pipeline diagram',
      ocrText: 'Web Extension -> Ingestion Pipeline -> Vector Database',
    },
    tags: ['diagram'],
    metadata: {
      sourceUrl: 'https://example.com/architecture',
      pageTitle: 'System Whitepaper',
    },
  },
];

async function runTests() {
  // Test 1: Obsidian Single Note Generation
  console.log('1. Testing Obsidian Single Markdown Note Generation...');
  const obsidianMd = formatProjectToObsidianMarkdown(mockProject, mockAtoms);
  assert(obsidianMd.includes('---'), 'Obsidian markdown must contain YAML frontmatter');
  assert(obsidianMd.includes('title: "AI Research Assistant Architecture"'), 'Must include project title');
  assert(obsidianMd.includes('type: research-project'), 'Must include research-project type in frontmatter');
  assert(obsidianMd.includes('[[Dense Passage Retrieval Benchmark]]'), 'Must include wikilink to source');
  assert(obsidianMd.includes('> [!quote]'), 'Must include Obsidian Quote callout');
  assert(obsidianMd.includes('> [!note]+'), 'Must include Obsidian Note callout');
  assert(obsidianMd.includes('> [!abstract]'), 'Must include Obsidian Abstract callout');
  console.log('   ✅ Obsidian Single Markdown formatted with YAML frontmatter, Callouts, and [[wikilinks]].\n');

  // Test 2: Obsidian Multi-Note Vault (ZIP)
  console.log('2. Testing Obsidian Multi-File Vault ZIP Generation...');
  const zipBlob = await generateObsidianVaultZip(mockProject, mockAtoms);
  assert(zipBlob, 'Zip blob must be generated');
  assert(zipBlob.size > 0, 'Zip blob size must be greater than 0');
  console.log(`   ✅ Generated Obsidian Vault ZIP (Size: ${zipBlob.size} bytes).\n`);

  // Test 3: Obsidian URI protocol
  console.log('3. Testing Obsidian URI Protocol Link Generation...');
  const uri = getObsidianUri('MyVault', mockProject.title, 'Sample Content');
  assert(uri.startsWith('obsidian://new?vault=MyVault'), 'Must generate valid obsidian:// URI');
  assert(uri.includes('name=AI%20Research%20Assistant%20Architecture'), 'Must include properly encoded note title');
  console.log(`   ✅ Generated URI: ${uri.substring(0, 70)}...\n`);

  // Test 4: Notion Block Formatter
  console.log('4. Testing Notion API Blocks Formatter...');
  const notionBlocks = formatProjectToNotionBlocks(mockProject, mockAtoms);
  assert(Array.isArray(notionBlocks), 'Must return an array of blocks');
  assert(notionBlocks.length > 0, 'Must have Notion blocks');
  
  const calloutBlock = notionBlocks.find((b) => b.type === 'callout');
  assert(calloutBlock, 'Must contain callout block');
  assert(calloutBlock.callout.icon.emoji, 'Callout must have an icon emoji');

  const quoteBlock = notionBlocks.find((b) => b.type === 'quote');
  assert(quoteBlock, 'Must contain quote block');

  const codeBlock = notionBlocks.find((b) => b.type === 'code');
  assert(codeBlock, 'Must contain code block for DOM block/table');

  console.log(`   ✅ Generated ${notionBlocks.length} structured Notion API blocks.\n`);

  // Test 5: Notion Markdown format for 1-click paste
  console.log('5. Testing Notion Markdown Generator...');
  const notionMd = formatProjectToNotionMarkdown(mockProject, mockAtoms);
  assert(notionMd.includes('# AI Research Assistant Architecture'), 'Must contain header');
  assert(notionMd.includes('💡 **Context Window Constraints**'), 'Must contain note title');
  console.log('   ✅ Notion-optimized Markdown formatted for seamless copy-paste.\n');

  console.log('🎉 ALL NOTION & OBSIDIAN TESTS PASSED SUCCESSFULLY!\n');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
