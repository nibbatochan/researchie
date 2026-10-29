// Researchie In-Situ AI Research Sidebar & Full Workspace Host (Alt+P)
// Seamlessly embeds the full Researchie Workspace (Feed, Projects, Timeline, Page AI, Capture Hub)
(function () {
  if (window.__RESEARCHIE_SIDEBAR_INJECTED__) return;
  window.__RESEARCHIE_SIDEBAR_INJECTED__ = true;

  let drawerHost = null;
  let drawerIframe = null;
  let isOpen = false;
  let lastToggleTime = 0;

  function initDrawer() {
    if (drawerHost) return;

    drawerHost = document.createElement('div');
    drawerHost.id = 'researchie-sidebar-host';
    drawerHost.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      right: 0 !important;
      width: 450px !important;
      max-width: 96vw !important;
      height: 100vh !important;
      z-index: 2147483647 !important;
      transform: translateX(100%) !important;
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
      box-shadow: -10px 0 35px rgba(0, 0, 0, 0.7) !important;
      pointer-events: auto !important;
      margin: 0 !important;
      padding: 0 !important;
      display: block !important;
      overflow: hidden !important;
      background: #09090B !important;
    `;

    drawerIframe = document.createElement('iframe');
    drawerIframe.id = 'researchie-sidebar-iframe';
    drawerIframe.src = chrome.runtime.getURL('sidepanel.html');
    drawerIframe.style.cssText = `
      width: 100% !important;
      height: 100% !important;
      border: none !important;
      background: #09090B !important;
      display: block !important;
      color-scheme: dark !important;
    `;
    drawerIframe.allow = 'clipboard-read; clipboard-write';

    drawerHost.appendChild(drawerIframe);
    const targetParent = document.body || document.documentElement;
    targetParent.appendChild(drawerHost);
  }

  function openDrawer() {
    initDrawer();
    const targetParent = document.body || document.documentElement;
    if (!drawerHost.parentNode || drawerHost.parentNode !== targetParent) {
      targetParent.appendChild(drawerHost);
    }
    isOpen = true;
    drawerHost.style.setProperty('display', 'block', 'important');
    drawerHost.style.setProperty('visibility', 'visible', 'important');
    void drawerHost.offsetHeight;
    drawerHost.style.setProperty('transform', 'translateX(0)', 'important');
  }

  function closeDrawer() {
    if (!isOpen) return;
    isOpen = false;
    if (drawerHost) {
      drawerHost.style.setProperty('transform', 'translateX(100%)', 'important');
    }
  }

  function toggleDrawer() {
    const now = Date.now();
    if (now - lastToggleTime < 200) return;
    lastToggleTime = now;

    if (isOpen) {
      closeDrawer();
    } else {
      openDrawer();
    }
  }

  window.__RESEARCHIE_TOGGLE_DRAWER__ = toggleDrawer;
  window.__RESEARCHIE_OPEN_DRAWER__ = openDrawer;

  // Listen for messages from the embedded iframe (e.g. close, trigger capture)
  window.addEventListener('message', (event) => {
    if (!event.data) return;
    // Only our own side panel iframe may drive the page; any other frame or script on the page is ignored.
    if (!drawerIframe || event.source !== drawerIframe.contentWindow) return;
    if (event.origin !== new URL(chrome.runtime.getURL('')).origin) return;

    if (event.data.action === 'RESEARCHIE_CLOSE_DRAWER') {
      closeDrawer();
    } else if (event.data.action === 'RESEARCHIE_TRIGGER_CAPTURE') {
      const mode = event.data.mode;
      if (mode === 'text') {
        window.dispatchEvent(new CustomEvent('RESEARCHIE_TRIGGER_TEXT_CAPTURE'));
      } else if (mode === 'block') {
        if (typeof window.__RESEARCHIE_START_BLOCK_PICKER__ === 'function') {
          window.__RESEARCHIE_START_BLOCK_PICKER__();
        } else {
          window.dispatchEvent(new CustomEvent('RESEARCHIE_TRIGGER_BLOCK_PICKER'));
        }
      } else if (mode === 'crop') {
        if (typeof window.__RESEARCHIE_START_CROPPER__ === 'function') {
          window.__RESEARCHIE_START_CROPPER__();
        } else {
          window.dispatchEvent(new CustomEvent('RESEARCHIE_TRIGGER_CROPPER'));
        }
      }
    }
  });

  // Listen for runtime extension messages (e.g. Alt+P command or action click)
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === 'TRIGGER_QNA_DRAWER' || message.action === 'TOGGLE_SIDEBAR') {
        toggleDrawer();
      }
    });
  }

  // Listen for in-page custom events
  window.addEventListener('RESEARCHIE_TRIGGER_QNA_DRAWER', () => {
    toggleDrawer();
  });

  // Global key listener on host page
  window.addEventListener(
    'keydown',
    (e) => {
      if ((e.altKey || e.metaKey) && ((e.key || '').toLowerCase() === 'p' || e.code === 'KeyP')) {
        e.preventDefault();
        e.stopPropagation();
        toggleDrawer();
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        closeDrawer();
      }
    },
    true
  );
})();
