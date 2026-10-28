// Reads the page's own citation: DOI and PMID from its citation meta tags, or web facts when it has neither. Every send
// (clip, image, AI brief, AI question) carries it, so the saved item and the answer keep their source. Plain JS, no build.
(function () {
  if (window.__researchiePageCitation) return;

  // Bibliography tags (citation_reference) are skipped: they are secondary sources.
  // Matches src/lib/citations/identify.ts; plain JS here, so no import.
  function readPageIdentifiers() {
    const DOI_PATTERN = /10\.\d{4,9}\/[^\s"'<>]+/;
    const metas = Array.from(document.querySelectorAll('meta[name]'));
    const valueOf = (names) => {
      for (const meta of metas) {
        const name = (meta.getAttribute('name') || '').trim().toLowerCase();
        if (!names.includes(name)) continue;
        const content = (meta.getAttribute('content') || '').trim();
        if (content) return content;
      }
      return '';
    };

    let doi = '';
    for (const raw of [valueOf(['citation_doi']), valueOf(['dc.identifier', 'dc.identifier.doi'])]) {
      const match = raw.match(DOI_PATTERN);
      if (match) {
        doi = match[0].replace(/[.,;:]+$/, '');
        break;
      }
    }

    const pmid = valueOf(['citation_pmid']);
    return {
      doi: doi || undefined,
      pmid: /^\d+$/.test(pmid) ? pmid : undefined,
    };
  }

  // Page facts for a web-source citation. Used for every page; the DOI and PMID above win when the page has them.
  function readPageInfo() {
    const meta = (selector) => (document.querySelector(selector)?.getAttribute('content') || '').trim() || undefined;
    return {
      url: window.location.href,
      title: meta('meta[name="citation_title"]') || meta('meta[property="og:title"]') || document.title || undefined,
      siteName: meta('meta[property="og:site_name"]'),
      author: meta('meta[name="author"]') || meta('meta[property="article:author"]') || meta('meta[name="citation_author"]'),
      published: meta('meta[property="article:published_time"]') || meta('meta[name="date"]') || meta('meta[name="citation_publication_date"]'),
      updated: meta('meta[property="article:modified_time"]') || meta('meta[property="og:updated_time"]') || meta('meta[name="last-modified"]'),
    };
  }

  // One line of source text, as it is shown to the AI and in the answer: "Author. Title. Site. Date. doi:10…". No links: the URL stays in the saved metadata.
  function citationLine(identifiers, info) {
    const parts = [info.author, info.title, info.siteName, (info.published || '').slice(0, 10)];
    if (identifiers.doi) parts.push(`doi:${identifiers.doi}`);
    if (identifiers.pmid) parts.push(`PMID: ${identifiers.pmid}`);
    return parts.filter(Boolean).join('. ');
  }

  // The fields saved with an item (metadata).
  function citationMeta() {
    return { pageIdentifiers: readPageIdentifiers(), pageInfo: readPageInfo() };
  }

  // The same fields plus the source line that goes in front of text sent to the AI.
  function readPageCitation() {
    const meta = citationMeta();
    return { ...meta, line: citationLine(meta.pageIdentifiers, meta.pageInfo) };
  }

  window.__researchiePageCitation = { citationMeta, readPageCitation };
})();
