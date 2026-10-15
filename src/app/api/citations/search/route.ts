import { NextResponse } from 'next/server';
import { authorize } from '@/lib/auth/server';
import { LOOKUP_CAP, LookupBudget } from '@/lib/citations/lookup.ts';
import { citationResolver } from '@/lib/citations/server.ts';

// Finds possible matches for a title the user typed. The user picks one; nothing is saved here.
export async function POST(request: Request) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;
  let body: { query?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be JSON.' }, { status: 400 });
  }

  const query = typeof body.query === 'string' ? body.query.trim() : '';
  if (query.length < 5 || query.length > 300) {
    return NextResponse.json({ error: 'Enter a title of 5 to 300 characters.' }, { status: 400 });
  }

  const budget = new LookupBudget(LOOKUP_CAP);
  const outcome = await citationResolver.searchTitle(query, budget);
  return NextResponse.json({
    candidates: outcome.candidates,
    reason: outcome.reason ?? null,
    lookupsUsed: budget.used,
    lookupCap: budget.cap,
  });
}
