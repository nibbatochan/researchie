import { NextResponse } from 'next/server';
import { LOOKUP_CAP, LookupBudget } from '@/lib/citations/lookup.ts';
import { normalizeDoi } from '@/lib/citations/identify.ts';
import { citationResolver } from '@/lib/citations/server.ts';

// Resolves a clip's identifiers into a citation record (Decision 7).

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
  const outcome = await citationResolver.resolveIdentifiers({ doi, pmid }, budget);
  return NextResponse.json({
    record: outcome.record,
    reason: outcome.reason ?? null,
    lookupsUsed: budget.used,
    lookupCap: budget.cap,
  });
}
