// Server-only resolver shared by the citation routes.
// Keys and contact details stay on the server: CROSSREF_MAILTO, NCBI_TOOL,
// NCBI_EMAIL, NCBI_API_KEY. Without NCBI_EMAIL, PubMed lookups still run, unkeyed.

import { createResolver } from './lookup.ts';

export const citationResolver = createResolver({
  fetcher: (url, init) => fetch(url, init),
  crossrefMailto: process.env.CROSSREF_MAILTO,
  ncbi: process.env.NCBI_EMAIL
    ? { tool: process.env.NCBI_TOOL ?? 'researchie', email: process.env.NCBI_EMAIL, apiKey: process.env.NCBI_API_KEY }
    : undefined,
});
