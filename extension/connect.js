// Popup -> the link icon next to the on/off switch. Paste the token from the web app (Profile, then Extension
// token) and press Connect. The token ends in the server's address, so nothing else is asked for: the address is
// read from it and shown before anything is sent. The token is checked with that server first, then kept in
// chrome.storage.local, and auth.js sends it as a bearer header to that server only.
(function () {
  const $ = (id) => document.getElementById(id);
  const toggle = $('connect-toggle');
  const panel = $('connect-panel');
  const dot = $('connect-dot');
  const statusEl = $('connect-status');
  const tokenEl = $('connect-token');
  const targetEl = $('connect-target');
  const msgEl = $('connect-msg');
  if (!toggle || !panel || !tokenEl) return;

  // The server address inside a token (".<address, base64url>" at the end), or null. https anywhere, or http
  // only for this computer: the extension never sends clips to a plain-http site elsewhere.
  function originFromToken(token) {
    if (!token || token.indexOf('rst_') !== 0) return null;
    const dot = token.lastIndexOf('.');
    if (dot < 0) return null;
    try {
      const b64 = token.slice(dot + 1).replace(/-/g, '+').replace(/_/g, '/');
      const bytes = Uint8Array.from(atob(b64 + '==='.slice((b64.length + 3) % 4)), (c) => c.charCodeAt(0));
      const decoded = new TextDecoder('utf-8').decode(bytes);
      const url = new URL(decoded);
      const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
      if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) return null;
      if (url.username || url.password || url.origin !== decoded) return null;
      return url.origin;
    } catch (e) {
      return null;
    }
  }

  function say(text, isError) {
    msgEl.textContent = text;
    msgEl.className = 'connect-msg ' + (isError ? 'error' : 'ok');
  }

  function showTarget() {
    const token = tokenEl.value.trim();
    if (!token) {
      targetEl.textContent = '';
      return;
    }
    const origin = originFromToken(token);
    targetEl.textContent = origin
      ? 'Connects to ' + new URL(origin).host
      : 'This token has no server address. Make a new one in the web app.';
    targetEl.className = 'connect-target' + (origin ? '' : ' error');
  }

  async function render() {
    const stored = await chrome.storage.local.get(['serverUrl', 'authToken']);
    const connected = Boolean(stored.serverUrl && stored.authToken);
    dot.className = 'conn-dot ' + (connected ? 'on' : 'off');
    toggle.title = connected ? 'Connected. Click to manage' : 'Not connected. Click to connect';
    statusEl.textContent = connected ? 'Connected to ' + new URL(stored.serverUrl).host : 'Not connected';
    statusEl.className = 'connect-status' + (connected ? ' connected' : '');
    tokenEl.value = '';
    targetEl.textContent = '';
  }

  function setOpen(open) {
    panel.classList.toggle('hidden', !open);
    toggle.setAttribute('aria-expanded', String(open));
    if (open) {
      msgEl.textContent = '';
      render().then(() => tokenEl.focus());
    }
  }

  toggle.addEventListener('click', () => setOpen(panel.classList.contains('hidden')));
  $('connect-close').addEventListener('click', () => setOpen(false));
  tokenEl.addEventListener('input', showTarget);
  tokenEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('connect-save').click();
  });

  $('connect-save').addEventListener('click', async () => {
    const token = tokenEl.value.trim();
    if (!token) return say('Paste the token first.', true);
    const server = originFromToken(token);
    if (!server) return say('This token has no server address. Make a new one in the web app.', true);

    say('Checking…', false);
    try {
      // The projects list needs a valid token, so a 200 proves the token and the server go together.
      const res = await fetch(server + '/api/projects', { headers: { Authorization: 'Bearer ' + token } });
      if (res.status === 401) return say('The server did not accept that token. Make a new one and try again.', true);
      if (!res.ok) return say('The server answered with an error (' + res.status + ').', true);
      const json = await res.json();
      const projects = json.data || [];
      const next = { serverUrl: server, authToken: token, apiBaseUrl: server + '/api', extensionEnabled: true };
      // Start in the first project of this account, never one that belonged to another.
      const first = projects.find((p) => !p.parentId) || projects[0];
      if (first) {
        next.activeProjectId = first.id;
        next.activeProjectTitle = first.title;
        next.activeProjectDesc = first.description || '';
        next.activeProjectColor = first.color || '#325FEC';
        next.activeParentTitle = '';
      }
      await chrome.storage.local.set(next);
      await chrome.storage.local.remove('connectPrompt');
      await render();
      say('Connected. Clips held while disconnected are being sent.', false);
    } catch (e) {
      say('Could not reach ' + new URL(server).host + '. Is it running?', true);
    }
  });

  $('connect-clear').addEventListener('click', async () => {
    await chrome.storage.local.remove(['serverUrl', 'authToken', 'activeProjectId', 'activeProjectTitle', 'activeProjectDesc', 'activeProjectColor', 'activeParentTitle']);
    await render();
    say('Disconnected. Clips you take now are held until you connect again.', false);
  });

  // The page's "Connect" button asks for this panel: open it straight away.
  chrome.storage.local.get(['connectPrompt']).then((stored) => {
    if (stored.connectPrompt) {
      chrome.storage.local.remove('connectPrompt');
      setOpen(true);
    }
  });
  render();
})();
