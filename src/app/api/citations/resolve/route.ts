import { NextResponse } from 'next/server';
import { createResolver, LOOKUP_CAP, LookupBudget } from '@/lib/citations/lookup.ts';
import { normalizeDoi } from '@/lib/citations/identify.ts';

// Resolves a clip's identifiers into a citation record (Decision 7).
// Keys and contact details stay on the server: CROSSREF_MAILTO, NCBI_TOOL,
// NCBI_EMAIL, NCBI_API_KEY. Without NCBI_* the PubMed lookups still run,
// at the unkeyed rate.

const resolver = createResolver({
  fetcher: (url, init) => fetch(url, init),
  crossrefMailto: process.env.CROSSREF_MAILTO,
  ncbi: process.env.NCBI_EMAIL
    ? { tool: process.env.NCBI_TOOL ?? 'researchie', email: process.env.NCBI_EMAIL, apiKey: process.env.NCBI_API_KEY }
    : undefined,
});

export async function POST(request: Request) {
  let body: { doi?: unknown; pmid?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be JSON.' }, { status: 400 });
  }

  const doi = typeof body.doi === 'string' ? normalizeDoi(body.doi) : undefined;
  const pmid = typeof body.pmid === 'string' && /^\d+$/.test(body.pmid.trim()) ? body.pmid.trim() : undefined;
  if (!doi && !pmid) {
    return NextResponse.json({ error: 'Provide a DOI or a numeric PMID.' }, { status: 400 });
  }

  const budget = new LookupBudget(LOOKUP_CAP);
  const outcome = await resolver.resolveIdentifiers({ doi, pmid }, budget);
  return NextResponse.json({
    record: outcome.record,
    reason: outcome.reason ?? null,
    lookupsUsed: budget.used,
    lookupCap: budget.cap,
  });
}
