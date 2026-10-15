import { NextResponse } from 'next/server';
import { authorize, AUTH_REQUIRED } from '@/lib/auth/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// A signed-in user's settings and small preferences (citation style, panel width, canvas layout...). They live
// in the user_settings table, not in the browser, so they follow the account to any device.
//   settings = { app: {...}, prefs: { key: "value" } }
// Secrets never come here: the Notion token stays in memory, the AI key has its own encrypted route.

const NO_STORE = { 'Cache-Control': 'no-store' };
const MAX_BYTES = 256 * 1024;
const PREF_KEY = /^[A-Za-z0-9_.:-]{1,120}$/;

function off() {
  return NextResponse.json({ success: false, error: 'Settings sync needs accounts, which are off in this mode.', code: 'AUTH_DISABLED' }, { status: 404, headers: NO_STORE });
}

// The app's settings are saved as one JSON string under this key. Whatever the browser sends, the Notion
// token and any old Groq key are blanked before they are stored.
const APP_SETTINGS_KEY = 'researchie_app_settings_v1';

function withoutSecrets(json: string): string {
  try {
    const parsed = JSON.parse(json);
    if (isPlainObject(parsed)) {
      if (isPlainObject(parsed.notion)) parsed.notion = { ...parsed.notion, integrationToken: '' };
      if (isPlainObject(parsed.ai)) {
        const { customGroqApiKey: _drop, ...rest } = parsed.ai as Record<string, unknown>;
        parsed.ai = rest;
      }
      return JSON.stringify(parsed);
    }
  } catch {
    // not JSON: stored as the text it is
  }
  return json;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

async function read(userId: string): Promise<{ app: Record<string, unknown>; prefs: Record<string, string> }> {
  const { data } = await supabaseAdmin.from('user_settings').select('settings').eq('user_id', userId).maybeSingle();
  const s = isPlainObject(data?.settings) ? (data!.settings as Record<string, unknown>) : {};
  return {
    app: isPlainObject(s.app) ? (s.app as Record<string, unknown>) : {},
    prefs: isPlainObject(s.prefs) ? (s.prefs as Record<string, string>) : {},
  };
}

export async function GET(request: Request) {
  if (!AUTH_REQUIRED) return off();
  const auth = await authorize(request, { allowToken: false });
  if (auth.response) return auth.response;
  return NextResponse.json({ success: true, data: await read(auth.user.id) }, { headers: NO_STORE });
}

// { app?: {...}, prefs?: { key: "value" | null } }. app replaces the app settings; prefs are merged per key (null removes).
export async function PUT(request: Request) {
  if (!AUTH_REQUIRED) return off();
  const auth = await authorize(request, { allowToken: false });
  if (auth.response) return auth.response;
  try {
    const body = await request.json().catch(() => null);
    if (!isPlainObject(body)) return NextResponse.json({ success: false, error: 'Send an object.' }, { status: 400, headers: NO_STORE });

    const current = await read(auth.user.id);
    let app = current.app;
    const prefs = { ...current.prefs };

    if (body.app !== undefined) {
      if (!isPlainObject(body.app)) return NextResponse.json({ success: false, error: 'app must be an object.' }, { status: 400, headers: NO_STORE });
      app = { ...body.app };
      // Secrets are never stored here.
      if (isPlainObject(app.notion)) app.notion = { ...app.notion, integrationToken: '' };
      if (isPlainObject(app.ai)) {
        const { customGroqApiKey: _drop, ...rest } = app.ai as Record<string, unknown>;
        app.ai = rest;
      }
    }
    if (body.prefs !== undefined) {
      if (!isPlainObject(body.prefs)) return NextResponse.json({ success: false, error: 'prefs must be an object.' }, { status: 400, headers: NO_STORE });
      for (const [k, v] of Object.entries(body.prefs)) {
        if (!PREF_KEY.test(k)) return NextResponse.json({ success: false, error: 'A preference name has characters it should not.' }, { status: 400, headers: NO_STORE });
        if (v === null) delete prefs[k];
        else if (typeof v === 'string') prefs[k] = k === APP_SETTINGS_KEY ? withoutSecrets(v) : v;
        else return NextResponse.json({ success: false, error: 'Preference values are text.' }, { status: 400, headers: NO_STORE });
      }
    }

    const settings = { app, prefs };
    if (Buffer.byteLength(JSON.stringify(settings), 'utf8') > MAX_BYTES) {
      return NextResponse.json({ success: false, error: 'Settings are too large to save.' }, { status: 413, headers: NO_STORE });
    }
    const { error } = await supabaseAdmin
      .from('user_settings')
      .upsert({ user_id: auth.user.id, settings, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (error) return NextResponse.json({ success: false, error: 'Could not save settings.' }, { status: 500, headers: NO_STORE });
    return NextResponse.json({ success: true, data: settings }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ success: false, error: 'Could not save settings.' }, { status: 500, headers: NO_STORE });
  }
}
