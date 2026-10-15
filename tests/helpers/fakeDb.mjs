// A tiny in-memory stand-in for the Supabase query builder: just the calls src/lib/data/cloud.ts makes.
// It enforces primary keys (error code 23505 on a duplicate), like Postgres does.

const PKEY = { projects: 'id', atoms: 'id', documents: 'id' };
// Tables whose id the database makes, and the column pairs that must be unique.
const GENERATED_ID = new Set(['project_members', 'project_invites', 'share_links', 'access_requests']);
const UNIQUE = { project_members: ['project_id', 'user_id'], project_invites: ['project_id', 'email'], access_requests: ['project_id', 'user_id'] };
let counter = 0;

export function makeFakeDb(seed = {}) {
  const tables = { projects: [], atoms: [], documents: [], ...seed };

  function from(table) {
    const rows = tables[table] ?? (tables[table] = []);
    const state = { op: 'select', filters: [], patch: null, row: null, single: false, maybe: false, order: null, opts: null };

    const run = () => {
      const match = (r) => state.filters.every((f) => (f.kind === 'eq' ? r[f.col] === f.val : f.vals.includes(r[f.col])));
      if (state.op === 'insert') {
        const pk = PKEY[table];
        if (pk && rows.some((r) => r[pk] === state.row[pk])) return { data: null, error: { code: '23505', message: 'duplicate key' } };
        const pair = UNIQUE[table];
        if (pair && rows.some((r) => pair.every((c) => r[c] === state.row[c]))) return { data: null, error: { code: '23505', message: 'duplicate key' } };
        const created = { captured_at: new Date().toISOString(), uploaded_at: new Date().toISOString(), ...(GENERATED_ID.has(table) ? { id: `gen-${++counter}` } : {}), ...state.row };
        rows.push(created);
        return finish([created]);
      }
      if (state.op === 'upsert') {
        const pk = PKEY[table];
        const existing = rows.find((r) => r[pk] === state.row[pk]);
        if (existing) return finish(state.opts?.ignoreDuplicates ? [] : [Object.assign(existing, state.row)]);
        rows.push({ ...state.row });
        return finish([rows[rows.length - 1]]);
      }
      const hit = rows.filter(match);
      if (state.op === 'update') {
        hit.forEach((r) => Object.assign(r, state.patch));
        return finish(hit);
      }
      if (state.op === 'delete') {
        for (const r of hit) rows.splice(rows.indexOf(r), 1);
        return finish(hit);
      }
      let out = hit;
      if (state.order) out = [...out].sort((a, b) => String(b[state.order] ?? '').localeCompare(String(a[state.order] ?? '')));
      return finish(out);
    };

    const finish = (out) => {
      const copy = out.map((r) => ({ ...r }));
      if (state.single) return copy.length ? { data: copy[0], error: null } : { data: null, error: { code: 'PGRST116', message: 'no rows' } };
      if (state.maybe) return { data: copy[0] ?? null, error: null };
      return { data: copy, error: null };
    };

    const b = {
      select: () => b,
      insert: (row) => ((state.op = 'insert'), (state.row = row), b),
      upsert: (row, opts) => ((state.op = 'upsert'), (state.row = row), (state.opts = opts), b),
      update: (patch) => ((state.op = 'update'), (state.patch = patch), b),
      delete: () => ((state.op = 'delete'), b),
      eq: (col, val) => (state.filters.push({ kind: 'eq', col, val }), b),
      in: (col, vals) => (state.filters.push({ kind: 'in', col, vals }), b),
      order: (col) => ((state.order = col), b),
      single: () => ((state.single = true), b),
      maybeSingle: () => ((state.maybe = true), b),
      then: (resolve, reject) => Promise.resolve(run()).then(resolve, reject),
    };
    return b;
  }

  return { from, tables };
}
