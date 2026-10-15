// Popup -> "Connect account". The web app makes a token for you (Settings -> Account); paste it here with the
// server address. The token is checked before it is saved, kept in chrome.storage.local, and sent by auth.js
// as a bearer header to that server only.
(function () {
  const $ = (id) => document.getElementById(id);
  const statusEl = $('connect-status');
  const serverEl = $('connect-server');
  const tokenEl = $('connect-token');
  const msgEl = $('connect-msg');
  const detailsEl = $('connect-details');
  if (!statusEl || !serverEl || !tokenEl) return;

  function cleanServer(raw) {
    let url;
    try {
      url = new URL(String(raw || '').trim());
    } catch (e) {
      return null;
    }
    const local = ['localhost', '127.0.0.1'].includes(url.hostname);
    if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) return null;
    return url.origin;
  }

  function say(text, isError) {
    msgEl.textContent = text;
    msgEl.className = 'connect-msg ' + (isError ? 'error' : 'ok');
  }

  async function render() {
    const stored = await chrome.storage.local.get(['serverUrl', 'authToken']);
    if (stored.serverUrl && stored.authToken) {
      statusEl.textContent = 'Connected to ' + new URL(stored.serverUrl).host;
      statusEl.className = 'connect-status connected';
      serverEl.value = stored.serverUrl;
    } else {
      statusEl.textContent = 'Local mode (not connected)';
      statusEl.className = 'connect-status';
    }
    tokenEl.value = '';
  }

  $('connect-save').addEventListener('click', async () => {
    const server = cleanServer(serverEl.value);
    const token = tokenEl.value.trim();
    if (!server) return say('Enter the site address, for example https://your-site.vercel.app', true);
    if (!token.startsWith('rst_') || token.length < 20) return say('That does not look like a token. Create one in the web app under Settings, Account.', true);

    say('Checking…', false);
    try {
      // The projects list needs a valid token, so a 200 proves the pair works.
      const res = await fetch(server + '/api/projects', { headers: { Authorization: 'Bearer ' + token } });
      if (res.status === 401) return say('The server did not accept that token. Create a new one and try again.', true);
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
      await render();
      say('Connected. New clips go to your account.', false);
    } catch (e) {
      say('Could not reach that address. Check it and your connection.', true);
    }
  });

  $('connect-clear').addEventListener('click', async () => {
    await chrome.storage.local.remove(['serverUrl', 'authToken', 'activeProjectId', 'activeProjectTitle', 'activeProjectDesc', 'activeProjectColor', 'activeParentTitle']);
    await render();
    say('Disconnected. Clips waiting to sync stay in the queue.', false);
  });

  render().then(async () => {
    const stored = await chrome.storage.local.get(['authToken']);
    if (!stored.authToken && detailsEl) detailsEl.open = false;
  });
})();
