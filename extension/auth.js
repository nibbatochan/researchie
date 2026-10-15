// Shared by the background worker, the popup and the side panel.
//
// When a server address and a token are saved (popup -> Connect), every request to that server carries the
// token as a bearer header. The token lives in chrome.storage.local, which web pages and the page scripts
// of this extension cannot read; only the worker, popup and side panel can. Requests to any other address
// are left alone.
(function () {
  const root = typeof self !== 'undefined' ? self : window;
  if (root.__RESEARCHIE_AUTH_PATCHED__) return;
  root.__RESEARCHIE_AUTH_PATCHED__ = true;

  const originalFetch = root.fetch.bind(root);

  function sameOrigin(a, b) {
    try {
      return new URL(a).origin === new URL(b).origin;
    } catch (e) {
      return false;
    }
  }

  root.fetch = async function (input, init) {
    try {
      const stored = await chrome.storage.local.get(['authToken', 'serverUrl']);
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      if (stored.authToken && stored.serverUrl && sameOrigin(url, stored.serverUrl)) {
        const headers = new Headers((init && init.headers) || (typeof input !== 'string' && input && input.headers) || {});
        if (!headers.has('Authorization')) headers.set('Authorization', 'Bearer ' + stored.authToken);
        init = Object.assign({}, init, { headers: headers });
      }
    } catch (e) {
      // Storage unavailable: send the request as it is.
    }
    return originalFetch(input, init);
  };
})();
