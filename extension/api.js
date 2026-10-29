// Shared by the background worker, the popup and the side panel: where the Researchie server is.
// Only the address saved by Connect (popup) is used. Nothing is guessed. The old code tried local ports one by one
// (up to a second each, and six seconds when no local copy ran), and a local copy could answer first, so clips went
// to the wrong server. Without a saved address the request fails at once with needsConnect, and the UI says so.
async function getServerOrigin() {
  const saved = await chrome.storage.local.get(['serverUrl']);
  return saved.serverUrl ? saved.serverUrl.replace(/\/+$/, '') : null;
}

async function getWorkingApiBase() {
  const origin = await getServerOrigin();
  if (!origin) {
    const err = new Error('Not connected to Researchie. Open the extension popup and press Connect.');
    err.status = 401;
    err.needsConnect = true;
    throw err;
  }
  return origin + '/api';
}
