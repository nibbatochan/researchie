// Researchie Chrome Extension Background Service Worker

const CANDIDATE_ORIGINS = [
  'http://localhost:3001',
  'http://localhost:3000',
  'http://localhost:3002',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3000',
];

let cachedWorkingOrigin = null;

async function getWorkingApiBase() {
  if (cachedWorkingOrigin) {
    try {
      const ping = await fetch(`${cachedWorkingOrigin}/api/projects`, { signal: AbortSignal.timeout(1200) });
      if (ping.ok) return `${cachedWorkingOrigin}/api`;
    } catch {}
  }

  for (const origin of CANDIDATE_ORIGINS) {
    try {
      const ping = await fetch(`${origin}/api/projects`, { signal: AbortSignal.timeout(1200) });
      if (ping.ok) {
        cachedWorkingOrigin = origin;
        await chrome.storage.local.set({ apiBaseUrl: `${origin}/api`, apiOrigin: origin });
        return `${origin}/api`;
      }
    } catch {}
  }

  const storage = await chrome.storage.local.get(['apiBaseUrl']);
  return storage.apiBaseUrl || 'http://localhost:3001/api';
}

chrome.runtime.onInstalled.addListener(async () => {
  chrome.contextMenus.create({
    id: 'researchie-save-selection',
    title: 'Save selection to Researchie (Alt+S)',
    contexts: ['selection'],
  });

  chrome.contextMenus.create({
    id: 'researchie-pick-block',
    title: 'Inspect & save DOM block (Alt+B)',
    contexts: ['page'],
  });

  chrome.contextMenus.create({
    id: 'researchie-crop-image',
    title: 'Crop screen region (Alt+C)',
    contexts: ['page'],
  });

  chrome.contextMenus.create({
    id: 'researchie-save-page',
    title: 'Save page link to Researchie',
    contexts: ['page', 'link'],
  });

  if (chrome.sidePanel && typeof chrome.sidePanel.setPanelBehavior === 'function') {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});
  }

  // Sync projects from active backend only if activeProjectId is not set
  try {
    const storage = await chrome.storage.local.get(['activeProjectId']);
    const apiBase = await getWorkingApiBase();
    const res = await fetch(`${apiBase}/projects`);
    if (res.ok) {
      const json = await res.json();
      if (json.data && json.data.length > 0) {
        if (!storage.activeProjectId) {
          const first = json.data[0];
          await chrome.storage.local.set({
            activeProjectId: first.id,
            activeProjectTitle: first.title,
            activeProjectDesc: first.description || '',
            activeProjectColor: first.color_badge || first.color || '#325FEC',
            extensionEnabled: true,
          });
          return;
        } else {
          const match = json.data.find((p) => p.id === storage.activeProjectId);
          if (match) {
            await chrome.storage.local.set({
              activeProjectTitle: match.title,
              activeProjectDesc: match.description || '',
              activeProjectColor: match.color_badge || match.color || '#325FEC',
            });
            return;
          }
        }
      }
    }
  } catch {}

  chrome.storage.local.get(['activeProjectId', 'extensionEnabled'], (result) => {
    if (!result.activeProjectId) {
      chrome.storage.local.set({
        activeProjectId: 'proj-ai-main',
        activeProjectTitle: 'Artificial Intelligence & RAG',
        activeProjectDesc: 'Core research umbrella covering vector retrieval architectures, multimodal synthesis, and knowledge graph augmentation.',
        activeProjectColor: '#325FEC',
        extensionEnabled: true,
      });
    }
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab || !tab.id) return;

  if (info.menuItemId === 'researchie-save-selection' && info.selectionText) {
    chrome.tabs.sendMessage(tab.id, {
      action: 'SAVE_SELECTION_TRIGGERED',
      selectionText: info.selectionText,
    });
  } else if (info.menuItemId === 'researchie-pick-block') {
    chrome.tabs.sendMessage(tab.id, { action: 'TRIGGER_BLOCK_PICKER' });
  } else if (info.menuItemId === 'researchie-crop-image') {
    chrome.tabs.sendMessage(tab.id, { action: 'TRIGGER_IMAGE_CROPPER' });
  } else if (info.menuItemId === 'researchie-save-page') {
    const targetUrl = info.linkUrl || tab.url || '';
    const title = tab.title || 'Saved Web Link';

    const payload = {
      type: 'link',
      title: title,
      content: {
        targetUrl: targetUrl,
        description: `Saved from ${new URL(targetUrl).hostname}`,
      },
      metadata: {
        sourceUrl: targetUrl,
        pageTitle: title,
        domainFavicon: `https://www.google.com/s2/favicons?domain=${new URL(targetUrl).hostname}&sz=64`,
      },
    };

    saveAtomToPlatform(payload);
  }
});

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (!tab || !tab.id || tab.url?.startsWith('chrome://') || tab.url?.startsWith('edge://')) return;

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js', 'blockPicker.js', 'cropper.js', 'qnaDrawer.js'],
    });
  } catch {}

  if (command === 'save-selection') {
    chrome.tabs.sendMessage(tab.id, { action: 'SAVE_SELECTION_TRIGGERED' });
  } else if (command === 'pick-block') {
    chrome.tabs.sendMessage(tab.id, { action: 'TRIGGER_BLOCK_PICKER' });
  } else if (command === 'select-image') {
    chrome.tabs.sendMessage(tab.id, { action: 'TRIGGER_IMAGE_SELECTOR' });
  } else if (command === 'crop-image') {
    chrome.tabs.sendMessage(tab.id, { action: 'TRIGGER_IMAGE_CROPPER' });
  } else if (command === 'open-sidebar') {
    chrome.tabs.sendMessage(tab.id, { action: 'TRIGGER_QNA_DRAWER' });
  }
});

async function saveAtomToPlatform(atomPayload) {
  try {
    const apiBase = await getWorkingApiBase();
    const storage = await chrome.storage.local.get(['activeProjectId', 'activeProjectTitle']);
    let projectId = atomPayload.projectId || storage.activeProjectId;

    if (!projectId) {
      try {
        const projRes = await fetch(`${apiBase}/projects`);
        if (projRes.ok) {
          const projJson = await projRes.json();
          if (projJson.data && projJson.data.length > 0) {
            projectId = projJson.data[0].id;
            await chrome.storage.local.set({
              activeProjectId: projJson.data[0].id,
              activeProjectTitle: projJson.data[0].title,
              activeProjectDesc: projJson.data[0].description || '',
              activeProjectColor: projJson.data[0].color_badge || projJson.data[0].color || '#325FEC',
            });
          }
        }
      } catch {}
    }

    if (!projectId) {
      projectId = 'proj-ai-main';
    }

    const completePayload = {
      ...atomPayload,
      projectId: projectId,
    };

    const res = await fetch(`${apiBase}/atoms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(completePayload),
    });

    if (!res.ok) throw new Error(`Server status: ${res.status}`);

    const data = await res.json();
    
    // Update last push time
    await chrome.storage.local.set({ lastPushTime: new Date().toISOString() });

    return { 
      success: true, 
      data: data.data,
      projectTitle: storage.activeProjectTitle || 'Active Project' 
    };
  } catch (error) {
    const { offlineQueue = [] } = await chrome.storage.local.get(['offlineQueue']);
    offlineQueue.push({
      ...atomPayload,
      queuedAt: new Date().toISOString(),
    });
    await chrome.storage.local.set({ 
      offlineQueue,
      lastPushTime: new Date().toISOString() 
    });

    return { success: false, queued: true };
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'SAVE_ATOM') {
    saveAtomToPlatform(message.payload).then((res) => sendResponse(res));
    return true;
  }
  if (message.action === 'DELETE_ATOM') {
    // Undo on the clip toast. The page scripts cannot reach the app themselves: they hard-coded
    // port 3000 and a web page's CORS rules apply to them. The background knows the real address.
    (async () => {
      try {
        const apiBase = await getWorkingApiBase();
        const res = await fetch(`${apiBase}/atoms?id=${encodeURIComponent(message.atomId)}`, { method: 'DELETE' });
        sendResponse({ success: res.ok });
      } catch (err) {
        sendResponse({ success: false, error: String((err && err.message) || err) });
      }
    })();
    return true;
  }
  if (message.action === 'AI_SUMMARIZE') {
    (async () => {
      try {
        const apiBase = await getWorkingApiBase();
        const res = await fetch(`${apiBase}/ai/summarize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message.payload || {}),
        });
        if (res.ok) {
          const json = await res.json();
          sendResponse(json);
        } else {
          sendResponse({ success: false, error: `HTTP ${res.status}` });
        }
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }
  if (message.action === 'AI_QNA') {
    (async () => {
      try {
        const apiBase = await getWorkingApiBase();
        const res = await fetch(`${apiBase}/ai/qna`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message.payload || {}),
        });
        if (res.ok) {
          const json = await res.json();
          sendResponse(json);
        } else {
          sendResponse({ success: false, error: `HTTP ${res.status}` });
        }
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }
  if (message.action === 'OPEN_SIDEPANEL_REQUEST') {
    if (chrome.sidePanel && typeof chrome.sidePanel.open === 'function') {
      const windowId = sender.tab?.windowId;
      const tabId = sender.tab?.id;
      if (windowId) {
        chrome.sidePanel.open({ windowId }).catch(() => {
          if (tabId) chrome.sidePanel.open({ tabId }).catch(() => {});
        });
      } else if (tabId) {
        chrome.sidePanel.open({ tabId }).catch(() => {});
      }
    }
    return true;
  }
  if (message.action === 'GET_WORKSPACE_STATE') {
    chrome.storage.local.get(
      ['activeProjectId', 'activeProjectTitle', 'activeProjectDesc', 'activeProjectColor', 'extensionEnabled', 'lastPushTime', 'apiBaseUrl'],
      (data) => sendResponse(data)
    );
    return true;
  }
  if (message.action === 'CAPTURE_SCREEN_AREA') {
    const windowId = sender.tab?.windowId || null;
    chrome.tabs.captureVisibleTab(windowId, { format: 'png' }, async (fullDataUrl) => {
      if (!fullDataUrl) {
        sendResponse({ success: false, error: 'Failed to capture tab' });
        return;
      }

      let finalImageUrl = fullDataUrl;
      const b = message.bounds;
      const dpr = b?.devicePixelRatio || 1;

      try {
        if (b && b.width > 10 && b.height > 10 && typeof OffscreenCanvas !== 'undefined') {
          const resBlob = await fetch(fullDataUrl).then((r) => r.blob());
          const imageBitmap = await createImageBitmap(resBlob);

          const cropX = Math.round(b.x * dpr);
          const cropY = Math.round(b.y * dpr);
          const cropW = Math.round(b.width * dpr);
          const cropH = Math.round(b.height * dpr);

          const offscreen = new OffscreenCanvas(cropW, cropH);
          const ctx = offscreen.getContext('2d');
          ctx.drawImage(imageBitmap, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

          const croppedBlob = await offscreen.convertToBlob({ type: 'image/png' });
          const arrayBuffer = await croppedBlob.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          const len = bytes.byteLength;
          for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          finalImageUrl = `data:image/png;base64,${btoa(binary)}`;
        }
      } catch (err) {
        console.warn('Canvas cropping fallback:', err);
      }

      const userTag = message.tag ? message.tag.replace(/^#/, '').trim() : '';
      const customTitle = message.title?.trim() || (userTag ? `${userTag}` : `Screen Crop (${Math.round(b?.width || 0)}×${Math.round(b?.height || 0)}px)`);

      let hostname = 'localhost';
      try {
        if (sender.tab?.url) hostname = new URL(sender.tab.url).hostname;
      } catch {}

      const storage = await chrome.storage.local.get(['activeProjectId']);

      const payload = {
        projectId: message.projectId || storage.activeProjectId || 'proj-ai-main',
        type: 'image',
        title: customTitle,
        content: {
          imageUrl: finalImageUrl,
          description: `Captured ${Math.round(b?.width || 0)}×${Math.round(b?.height || 0)} region from ${sender.tab?.title || 'page'}`,
        },
        metadata: {
          sourceUrl: sender.tab?.url || '',
          pageTitle: sender.tab?.title || 'Web Source',
          domainFavicon: `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`,
        },
        tags: message.tags || (userTag ? [userTag] : ['screenshot']),
      };

      saveAtomToPlatform(payload).then((res) => sendResponse(res));
    });
    return true;
  }
});
