import test from 'node:test';
import assert from 'node:assert/strict';
import { getTemplate } from '../src/lib/paper/templates.ts';
import { defaultMeta } from '../src/lib/paper/docModel.ts';
import { paperToMarkdown } from '../src/lib/paper/markdown.ts';

// A meta with no title, abstract or keywords, so only the body is written.
const bare = () => defaultMeta(getTemplate('imrad'), '');
const doc = (...content) => ({ type: 'doc', content });
const sec = (title, ...blocks) => ({ type: 'section', attrs: { id: title }, content: [{ type: 'sectionHeading', content: [{ type: 'text', text: title }] }, ...blocks] });
const p = (...inline) => ({ type: 'paragraph', content: inline });
const t = (text, ...marks) => (marks.length ? { type: 'text', text, marks } : { type: 'text', text });
const cite = (keys, locator = null) => ({ type: 'citation', attrs: { keys, locator } });
const author = (name) => ({ id: name, name, affiliationIds: [], orcid: '', email: '', corresponding: false });

test('title, authors, abstract and keywords come first, and hide flags drop them', () => {
  const meta = defaultMeta(getTemplate('imrad'), 'My title');
  meta.front.authors = [author('Jane Lee'), author('Raj Patel')];
  meta.front.abstract = { text: 'Short summary.' };
  meta.front.keywords = ['sleep', 'memory'];
  assert.equal(paperToMarkdown(doc(), meta), '# My title\n\nJane Lee, Raj Patel\n\n## Abstract\n\nShort summary.\n\n**Keywords:** sleep, memory\n');

  const structured = defaultMeta(getTemplate('imrad'), 'T');
  structured.front.abstract = { parts: [{ label: 'Background', text: 'Why.' }, { label: 'Results', text: 'What.' }] };
  structured.front.authors = [author('Jane Lee')];
  structured.hide = { authors: true, keywords: true };
  assert.equal(paperToMarkdown(doc(), structured), '# T\n\n## Abstract\n\n**Background.** Why.\n\n**Results.** What.\n');

  structured.hide = { title: true, abstract: true, authors: true };
  assert.equal(paperToMarkdown(doc(), structured), '');
});

test('section headings are level 2, heading levels 2 and 3 become ### and ####', () => {
  const pm = doc(sec('Methods', { type: 'heading', attrs: { level: 2 }, content: [t('Sub')] }, { type: 'heading', attrs: { level: 3 }, content: [t('Subsub')] }, p(t('Body.'))));
  assert.equal(paperToMarkdown(pm, bare()), '## Methods\n\n### Sub\n\n#### Subsub\n\nBody.\n');
});

test('bold, italic, link, sub and superscript marks are written; other marks are ignored', () => {
  const pm = doc(p(
    t('Plain '),
    t('bold', { type: 'bold' }),
    t(' '),
    t('it', { type: 'italic' }),
    t(' '),
    t('see', { type: 'link', attrs: { href: 'https://x.org' } }),
    t(' H'),
    t('2', { type: 'subscript' }),
    t('O x'),
    t('2', { type: 'superscript' }),
    t(' under', { type: 'underline' }),
    t('!', { type: 'textStyle', attrs: { color: 'red' } }),
  ));
  assert.equal(paperToMarkdown(pm, bare()), 'Plain **bold** *it* [see](https://x.org) H<sub>2</sub>O x<sup>2</sup> under!\n');
});

test('a citation with a locator and one with two keys', () => {
  const meta = bare();
  meta.cites = { Lee2020: 'c1', Abe2018: 'c2', Kim2021: 'manual:m1' };
  const pm = doc(p(t('A claim '), cite(['Lee2020'], 'p. 14'), t(' and more '), cite(['Abe2018', 'Kim2021']), t('.')));
  assert.equal(
    paperToMarkdown(pm, meta),
    'A claim [@Lee2020, p. 14] and more [@Abe2018; @Kim2021].\n\n## References\n\n- [@Lee2020]: c1\n- [@Abe2018]: c2\n- [@Kim2021]: manual:m1\n',
  );
});

test('a quote gets its key and page after the text; no key means no marker', () => {
  const meta = bare();
  meta.cites = { Lee2020: 'c1' };
  const pm = doc(
    { type: 'quote', attrs: { clipId: 'c1', page: '14' }, content: [t('The sky is blue.')] },
    { type: 'quote', attrs: { clipId: 'c1', page: null }, content: [t('Still blue.')] },
    { type: 'quote', attrs: { clipId: 'zz', page: '3' }, content: [t('Orphan.')] },
  );
  assert.equal(
    paperToMarkdown(pm, meta),
    '> The sky is blue. [@Lee2020, p. 14]\n\n> Still blue. [@Lee2020]\n\n> Orphan.\n\n## References\n\n- [@Lee2020]: c1\n',
  );
});

test('bullet and numbered lists, with a nested list', () => {
  const li = (...blocks) => ({ type: 'listItem', content: blocks });
  const pm = doc(
    { type: 'bulletList', content: [li(p(t('outer')), { type: 'bulletList', content: [li(p(t('inner')))] }), li(p(t('two')))] },
    { type: 'orderedList', content: [li(p(t('first'))), li(p(t('second')))] },
  );
  assert.equal(paperToMarkdown(pm, bare()), '- outer\n  - inner\n- two\n\n1. first\n2. second\n');
});

test('a table figure becomes a pipe table with its caption underneath', () => {
  const cell = (type, text) => ({ type, content: [p(t(text))] });
  const pm = doc({
    type: 'tableFigure',
    attrs: { clipId: 'c5', caption: 'Baseline' },
    content: [{
      type: 'table',
      content: [
        { type: 'tableRow', content: [cell('tableHeader', 'Group'), cell('tableHeader', 'n')] },
        { type: 'tableRow', content: [cell('tableCell', 'A'), cell('tableCell', '12')] },
      ],
    }],
  });
  assert.equal(paperToMarkdown(pm, bare()), '| Group | n |\n| --- | --- |\n| A | 12 |\n\n*Table: Baseline*\n');
});

test('a figure becomes an image that points at its clip', () => {
  const pm = doc({ type: 'figure', attrs: { clipId: 'c9', caption: 'Chart of results' } });
  assert.equal(paperToMarkdown(pm, bare()), '![Chart of results](clip:c9)\n');
});

test('a page break is a horizontal rule', () => {
  assert.equal(paperToMarkdown(doc(p(t('a')), { type: 'pageBreak' }, p(t('b'))), bare()), 'a\n\n---\n\nb\n');
});

test('columns are written one after another', () => {
  const pm = doc({
    type: 'columns',
    content: [
      { type: 'column', content: [p(t('left one')), p(t('left two'))] },
      { type: 'column', content: [p(t('right'))] },
    ],
  });
  assert.equal(paperToMarkdown(pm, bare()), 'left one\n\nleft two\n\nright\n');
});

test('an unknown node renders its content, and clip notes and the Unplaced bin are skipped', () => {
  const pm = doc(
    { type: 'weird', content: [p(t('kept'))] },
    { type: 'mystery' },
    { type: 'clipNote', attrs: { clipId: 'x' } },
    { type: 'unplaced', content: [p(t('hidden'))] },
  );
  assert.equal(paperToMarkdown(pm, bare()), 'kept\n');
});

test('references list the keys in order of first use, skip the Unplaced bin, and can be hidden', () => {
  const meta = bare();
  meta.cites = { Lee2020: 'c1', Abe2018: 'c2', Kim2021: 'manual:m1', Old1999: 'c1' };
  const pm = doc(
    p(cite(['Abe2018'])),
    { type: 'quote', attrs: { clipId: 'c1', page: null }, content: [t('The sky is blue.')] },
    p(cite(['Kim2021', 'Abe2018'])),
    { type: 'unplaced', content: [p(cite(['Gone']))] },
  );
  assert.equal(
    paperToMarkdown(pm, meta),
    '[@Abe2018]\n\n> The sky is blue. [@Lee2020]\n\n[@Kim2021; @Abe2018]\n\n## References\n\n- [@Abe2018]: c2\n- [@Lee2020]: c1\n- [@Kim2021]: manual:m1\n',
  );
  meta.hide = { references: true };
  assert.ok(!paperToMarkdown(pm, meta).includes('References'));
});
