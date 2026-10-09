/**
 * RESEARCHIE CHROME SIDE PANEL CONTROLLER
 * Capture Tools, Knowledge Feed, and Page AI (Summarize + Q&A)
 */

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
      const ping = await fetch(`${cachedWorkingOrigin}/api/projects`, { signal: AbortSignal.timeout(1000) });
      if (ping.ok) return `${cachedWorkingOrigin}/api`;
    } catch {}
  }

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    try {
      const storage = await chrome.storage.local.get(['apiBaseUrl', 'apiOrigin']);
      if (storage.apiBaseUrl) {
        const ping = await fetch(`${storage.apiBaseUrl}/projects`, { signal: AbortSignal.timeout(1000) });
        if (ping.ok) {
          cachedWorkingOrigin = storage.apiOrigin || storage.apiBaseUrl.replace(/\/api$/, '');
          return storage.apiBaseUrl;
        }
      }
    } catch {}
  }

  for (const origin of CANDIDATE_ORIGINS) {
    try {
      const ping = await fetch(`${origin}/api/projects`, { signal: AbortSignal.timeout(1000) });
      if (ping.ok) {
        cachedWorkingOrigin = origin;
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          await chrome.storage.local.set({ apiBaseUrl: `${origin}/api`, apiOrigin: origin });
        }
        return `${origin}/api`;
      }
    } catch {}
  }

  return 'http://localhost:3001/api';
}

// State
let activeProjectId = 'proj-ai-main';
let activeProjectTitle = 'Artificial Intelligence & RAG';
let activeProjectColor = '#325FEC';
let allAtoms = [];
let allProjects = [];
let activeTabInfo = {
  id: null,
  title: 'Reading page...',
  url: '',
  domain: '',
  mainContent: '',
  headings: [],
  keyParagraphs: [],
  wordCount: 0,
};
let currentNavTab = 'feed';
let selectedTypeFilter = 'all';
let searchQuery = '';
let isAiLoading = false;

// DOM Elements Cache
const elements = {
  syncIndicator: document.getElementById('sp-sync-indicator'),
  syncStatusText: document.getElementById('sp-sync-status-text'),
  btnShortcutsHelp: document.getElementById('sp-btn-shortcuts-help'),
  shortcutsModal: document.getElementById('sp-shortcuts-modal'),
  shortcutsClose: document.getElementById('sp-shortcuts-close'),
  btnOpenDash: document.getElementById('sp-btn-open-dash'),
  btnRefreshAll: document.getElementById('sp-btn-refresh-all'),
  btnClosePanel: document.getElementById('sp-btn-close-panel'),
  
  // Project Pod
  projectPill: document.getElementById('sp-project-pill'),
  projAvatar: document.getElementById('sp-proj-avatar'),
  projParentLabel: document.getElementById('sp-proj-parent-label'),
  projName: document.getElementById('sp-proj-name'),
  projectMenu: document.getElementById('sp-project-menu'),
  projectItems: document.getElementById('sp-project-items'),
  projectMenuClose: document.getElementById('sp-menu-close'),
  
  // Nav
  navTabBtns: document.querySelectorAll('.sp-tab-btn'),
  tabPanes: document.querySelectorAll('.sp-tab-pane'),
  atomsCountBadge: document.getElementById('sp-atoms-count-badge'),
  
  // Feed
  feedSearch: document.getElementById('sp-feed-search'),
  typeChips: document.querySelectorAll('.sp-chip'),
  atomStream: document.getElementById('sp-atom-stream'),
  
  // Page AI
  atFavicon: document.getElementById('sp-at-favicon'),
  atTitle: document.getElementById('sp-at-title'),
  atDomain: document.getElementById('sp-at-domain'),
  atWordsPill: document.getElementById('sp-at-words-pill'),
  atHeadingsPill: document.getElementById('sp-at-headings-pill'),
  btnRefreshTabCtx: document.getElementById('sp-btn-refresh-tab-ctx'),
  btnAiSummarizeTab: document.getElementById('sp-btn-ai-summarize-tab'),
  chatMessages: document.getElementById('sp-chat-messages'),
  chatInput: document.getElementById('sp-chat-input'),
  chatSendBtn: document.getElementById('sp-chat-send-btn'),
  
  // Capture
  capText: document.getElementById('sp-cap-text'),
  capBlock: document.getElementById('sp-cap-block'),
  capImage: document.getElementById('sp-cap-image'),
  capCrop: document.getElementById('sp-cap-crop'),
  capLink: document.getElementById('sp-cap-link'),
  capLinkSelect: document.getElementById('sp-cap-link-select'),
  bridgeStatus: document.getElementById('sp-bridge-status'),
  offlineQueueCount: document.getElementById('sp-offline-queue-count'),
  btnFlushOffline: document.getElementById('sp-btn-flush-offline'),
  
  // Toast
  toast: document.getElementById('sp-toast'),
  toastText: document.getElementById('sp-toast-text'),
};

// ==========================================================================
// INITIALIZATION
// ==========================================================================

document.addEventListener('DOMContentLoaded', async () => {
  setupNavigation();
  setupEventListeners();
  await loadWorkspaceState();
  await refreshActiveTabContext();
  await loadProjects();
  await loadProjectAtoms();
  checkBridgeConnection();
});

// Listen for tab switch / updates in browser
if (typeof chrome !== 'undefined' && chrome.tabs) {
  chrome.tabs.onActivated.addListener(() => {
    refreshActiveTabContext();
  });
  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'complete') {
      refreshActiveTabContext();
    }
  });
}

// Storage updates across extension
if (typeof chrome !== 'undefined' && chrome.storage) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      if (changes.activeProjectId) {
        activeProjectId = changes.activeProjectId.newValue;
        loadWorkspaceState().then(() => loadProjectAtoms());
      }
      if (changes.lastPushTime) {
        loadProjectAtoms();
      }
      if (changes.offlineQueue) {
        updateOfflineQueueCount(changes.offlineQueue.newValue);
      }
    }
  });
}

// ==========================================================================
// WORKSPACE & PROJECT STATE (SWAPPED HIERARCHY)
// ==========================================================================

async function loadWorkspaceState() {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const data = await chrome.storage.local.get([
        'activeProjectId',
        'activeProjectTitle',
        'activeProjectColor',
        'offlineQueue',
      ]);
      
      if (data.activeProjectId) activeProjectId = data.activeProjectId;
      if (data.activeProjectTitle) activeProjectTitle = data.activeProjectTitle;
      if (data.activeProjectColor) activeProjectColor = data.activeProjectColor;

      updateOfflineQueueCount(data.offlineQueue || []);
    }

    updateHeaderProjectPod();
  } catch (err) {
    console.warn('Could not read storage state:', err);
  }
}

function updateHeaderProjectPod() {
  const current = allProjects.find(p => p.id === activeProjectId);
  if (current) {
    activeProjectTitle = current.title;
    activeProjectColor = current.color_badge || current.color || '#325FEC';
    
    // Check if it's a subproject
    if (current.parentId) {
      const parent = allProjects.find(p => p.id === current.parentId);
      if (elements.projParentLabel) {
        elements.projParentLabel.textContent = parent ? `PARENT: ${parent.title.toUpperCase()}` : 'SUB-PROJECT';
      }
    } else {
      if (elements.projParentLabel) {
        elements.projParentLabel.textContent = 'WORKSPACE';
      }
    }
  }

  if (elements.projName) elements.projName.textContent = activeProjectTitle || 'Project';
  if (elements.projAvatar) {
    elements.projAvatar.style.backgroundColor = activeProjectColor || '#325FEC';
    elements.projAvatar.textContent = (activeProjectTitle || 'P').slice(0, 2).toUpperCase();
  }
}

async function loadProjects() {
  try {
    const apiBase = await getWorkingApiBase();
    const res = await fetch(`${apiBase}/projects`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        allProjects = data.data;
        
        // Match active project if possible
        const current = allProjects.find(p => p.id === activeProjectId);
        if (current) {
          activeProjectTitle = current.title;
          activeProjectColor = current.color_badge || current.color || '#325FEC';
        } else if (allProjects.length > 0 && !activeProjectId) {
          activeProjectId = allProjects[0].id;
          activeProjectTitle = allProjects[0].title;
          activeProjectColor = allProjects[0].color_badge || allProjects[0].color || '#325FEC';
        }
        
        updateHeaderProjectPod();
        renderProjectMenuItems();
        return;
      }
    }
  } catch (err) {
    console.warn('Projects API unreachable, using cached defaults:', err);
  }

  // Fallback defaults
  allProjects = [
    {
      id: 'proj-ai-main',
      title: 'Artificial Intelligence & RAG',
      color: '#325FEC',
      description: 'Core research umbrella covering vector retrieval architectures, multimodal synthesis, and knowledge graph augmentation.',
    },
    {
      id: 'proj-rag-arch-2026',
      parentId: 'proj-ai-main',
      title: 'Neural Information Retrieval & Adaptive RAG',
      color: '#518FFF',
      description: 'Hierarchical chunking, hybrid BM25 + dense embedding reranking, and self-reflective query expansion.',
    },
    {
      id: 'proj-ai-graph-rag',
      parentId: 'proj-ai-main',
      title: 'Graph RAG & Knowledge Graphs',
      color: '#518FFF',
      description: 'Investigating Cognee entity extraction, hierarchical knowledge graphs, and hybrid graph-vector reranking.',
    },
  ];
  updateHeaderProjectPod();
  renderProjectMenuItems();
}

function renderProjectMenuItems() {
  if (!elements.projectItems) return;
  if (!Array.isArray(allProjects) || allProjects.length === 0) {
    elements.projectItems.innerHTML = '<div style="padding: 12px; color: #71717A; font-size: 11px;">No projects found</div>';
    return;
  }

  // Separate parent projects and subprojects
  const parentProjects = allProjects.filter(p => !p.parentId);
  const subprojectMap = new Map();
  allProjects.forEach(p => {
    if (p.parentId) {
      if (!subprojectMap.has(p.parentId)) {
        subprojectMap.set(p.parentId, []);
      }
      subprojectMap.get(p.parentId).push(p);
    }
  });

  let html = '';
  parentProjects.forEach(parent => {
    const isParentSelected = parent.id === activeProjectId;
    const color = parent.color || parent.color_badge || '#325FEC';
    const initials = (parent.title || 'P').slice(0, 2).toUpperCase();
    const children = subprojectMap.get(parent.id) || [];

    // Parent Project header item (compact secondary label)
    html += `
      <div class="sp-project-item ${isParentSelected ? 'active' : ''}" data-id="${parent.id}" data-title="${escapeHtml(parent.title)}" data-color="${color}" data-parent-id="">
        <span class="sp-proj-avatar" style="background-color: ${color};">${initials}</span>
        <div class="sp-proj-info">
          <div class="sp-item-parent-badge">📁 MAIN WORKSPACE</div>
          <div class="sp-item-title parent-title">${escapeHtml(parent.title)}</div>
          <div class="sp-item-desc">${escapeHtml(parent.description || '')}</div>
        </div>
      </div>
    `;

    // Subprojects (Prominent, Bold, Larger)
    children.forEach(sub => {
      const isSubSelected = sub.id === activeProjectId;
      const subColor = sub.color || sub.color_badge || color;
      html += `
        <div class="sp-project-item subproject ${isSubSelected ? 'active' : ''}" data-id="${sub.id}" data-title="${escapeHtml(sub.title)}" data-color="${subColor}" data-parent-id="${parent.id}">
          <div class="sp-sub-indicator">↳</div>
          <div class="sp-proj-info">
            <div class="sp-item-title sub-title">${escapeHtml(sub.title)}</div>
            <div class="sp-item-desc">${escapeHtml(sub.description || '')}</div>
          </div>
          ${isSubSelected ? '<span class="sp-check-mark">✓</span>' : ''}
        </div>
      `;
    });
  });

  // Any orphaned subprojects
  const renderedIds = new Set([...parentProjects.map(p => p.id), ...Array.from(subprojectMap.values()).flat().map(p => p.id)]);
  const orphans = allProjects.filter(p => !renderedIds.has(p.id));
  orphans.forEach(p => {
    const isSelected = p.id === activeProjectId;
    const color = p.color || p.color_badge || '#325FEC';
    html += `
      <div class="sp-project-item ${isSelected ? 'active' : ''}" data-id="${p.id}" data-title="${escapeHtml(p.title)}" data-color="${color}">
        <span class="sp-proj-avatar" style="background-color: ${color};">${(p.title || 'P').slice(0, 2).toUpperCase()}</span>
        <div class="sp-proj-info">
          <div class="sp-item-title sub-title">${escapeHtml(p.title)}</div>
          <div class="sp-item-desc">${escapeHtml(p.description || '')}</div>
        </div>
      </div>
    `;
  });

  elements.projectItems.innerHTML = html;

  elements.projectItems.querySelectorAll('.sp-project-item').forEach((item) => {
    item.addEventListener('click', async () => {
      const id = item.dataset.id;
      const title = item.dataset.title;
      const color = item.dataset.color;

      activeProjectId = id;
      activeProjectTitle = title;
      activeProjectColor = color;

      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({
          activeProjectId: id,
          activeProjectTitle: title,
          activeProjectColor: color,
        });
      }

      updateHeaderProjectPod();
      if (elements.projectMenu) elements.projectMenu.classList.add('hidden');

      renderProjectMenuItems();
      loadProjectAtoms();
      showToast(`Active: ${title}`);
    });
  });
}

// ==========================================================================
// ACTIVE TAB CONTENT EXTRACTION
// ==========================================================================

async function refreshActiveTabContext() {
  try {
    if (typeof chrome === 'undefined' || !chrome.tabs) return;

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) return;

    activeTabInfo.id = tab.id;
    activeTabInfo.title = tab.title || 'Untitled page';
    activeTabInfo.url = tab.url || '';

    try {
      const hostname = new URL(tab.url).hostname;
      activeTabInfo.domain = hostname;
      if (elements.atDomain) elements.atDomain.textContent = hostname;
      if (elements.atFavicon) elements.atFavicon.src = tab.favIconUrl || `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
    } catch {
      if (elements.atDomain) elements.atDomain.textContent = 'local / page';
    }

    if (elements.atTitle) elements.atTitle.textContent = activeTabInfo.title;

    // Inject scripts if needed and extract page content
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js'],
      });
    } catch {}

    chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_PAGE_CONTENT' }, (response) => {
      if (chrome.runtime.lastError || !response || !response.data) {
        activeTabInfo.mainContent = '';
        if (elements.atWordsPill) elements.atWordsPill.textContent = 'page ready';
        if (elements.atHeadingsPill) elements.atHeadingsPill.textContent = '0 sections';
        return;
      }

      const data = response.data;
      activeTabInfo.title = data.title || activeTabInfo.title;
      activeTabInfo.mainContent = data.mainContent || '';
      activeTabInfo.headings = data.headings || [];
      activeTabInfo.keyParagraphs = data.keyParagraphs || [];
      activeTabInfo.wordCount = data.wordCount || (data.mainContent ? data.mainContent.split(/\s+/).length : 0);

      if (elements.atTitle) elements.atTitle.textContent = activeTabInfo.title;
      if (elements.atWordsPill) elements.atWordsPill.textContent = `${activeTabInfo.wordCount.toLocaleString()} words`;
      if (elements.atHeadingsPill) elements.atHeadingsPill.textContent = `${activeTabInfo.headings.length} sections`;
    });
  } catch (err) {
    console.warn('Could not inspect page:', err);
  }
}

// ==========================================================================
// FEED & NOTES STREAM (QUICK NOTE REMOVED)
// ==========================================================================

async function loadProjectAtoms() {
  if (elements.atomStream) {
    elements.atomStream.innerHTML = `
      <div class="sp-feed-loading">
        <div class="sp-spinner"></div>
        <span>Loading notes...</span>
      </div>
    `;
  }

  try {
    const apiBase = await getWorkingApiBase();
    const res = await fetch(`${apiBase}/atoms?projectId=${encodeURIComponent(activeProjectId)}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        allAtoms = json.data;
        if (elements.atomsCountBadge) elements.atomsCountBadge.textContent = allAtoms.length;
        renderFilteredAtoms();
        return;
      }
    }
  } catch (err) {
    console.warn('Fetch atoms error:', err);
  }

  if (elements.atomStream) {
    elements.atomStream.innerHTML = `
      <div class="sp-feed-empty">
        <p>No captured clips in this workspace yet.</p>
        <p style="font-size: 10.5px; color: var(--text-muted); margin-top: 4px;">
          Highlight text on any website and press <strong>Alt+S</strong> or click Capture tools.
        </p>
      </div>
    `;
  }
}

function renderFilteredAtoms() {
  if (!elements.atomStream) return;

  let filtered = allAtoms;

  if (selectedTypeFilter !== 'all') {
    filtered = filtered.filter(a => a.type === selectedTypeFilter);
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(a => {
      const t = (a.title || '').toLowerCase();
      const txt = (a.content?.text || a.content?.rawText || a.content?.description || '').toLowerCase();
      const ocr = (a.content?.ocrText || '').toLowerCase();
      const tags = (a.tags || []).join(' ').toLowerCase();
      return t.includes(q) || txt.includes(q) || tags.includes(q) || ocr.includes(q);
    });
  }

  if (filtered.length === 0) {
    elements.atomStream.innerHTML = `
      <div class="sp-feed-empty">
        <p>No notes matching current filter.</p>
      </div>
    `;
    return;
  }

  let html = '';
  filtered.forEach((atom) => {
    const type = atom.type || 'note';
    const title = atom.title || 'Untitled note';
    const text = atom.content?.text || atom.content?.rawText || atom.content?.description || '';
    const ocrText = atom.content?.ocrText || '';
    const imgUrl = atom.content?.imageUrl;
    const blockHtml = atom.content?.html;
    const time = atom.created_at ? new Date(atom.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    const sourceUrl = atom.metadata?.sourceUrl || atom.sourceUrl || '';
    const tags = Array.isArray(atom.tags) ? atom.tags : [];

    let bodyContent = '';
    if (type === 'image' && imgUrl) {
      bodyContent = `
        <img src="${escapeHtml(imgUrl)}" class="sp-card-preview-img" alt="Capture preview" />
        ${ocrText ? `<div class="sp-card-text" style="font-family: var(--font-mono); font-size: 11px; margin-top: 4px;"><span style="color: #34D399; font-weight: bold;">OCR:</span> "${escapeHtml(ocrText.slice(0, 160))}"</div>` : ''}
      `;
    } else if (type === 'block' && blockHtml) {
      bodyContent = `<pre class="sp-card-block-code"><code>${escapeHtml(blockHtml.slice(0, 300))}</code></pre>`;
    } else if (text) {
      bodyContent = `<div class="sp-card-text">"${escapeHtml(text.slice(0, 350))}${text.length > 350 ? '...' : ''}"</div>`;
    }

    const tagsHtml = tags.map(t => `<span class="sp-tag-pill">${escapeHtml(t.replace(/^#+/, ''))}</span>`).join(' ');

    let jumpAction = '';
    if (sourceUrl) {
      let targetJumpUrl = sourceUrl;
      if (text) {
        const clean = text.replace(/["'“”«»]/g, '').replace(/\s+/g, ' ').trim();
        const words = clean.split(' ').slice(0, 6).join(' ');
        if (words) {
          const [baseUrl] = sourceUrl.split('#');
          targetJumpUrl = `${baseUrl}#:~:text=${encodeURIComponent(words)}`;
        }
      }
      jumpAction = `<a href="${escapeHtml(targetJumpUrl)}" target="_blank" class="sp-jump-btn" title="Open source in context">Jump ↗</a>`;
    }

    html += `
      <div class="sp-card" data-id="${atom.id}">
        <div class="sp-card-header">
          <span class="sp-card-type-badge badge-${type}">${type}</span>
          <span class="sp-card-time">${time}</span>
        </div>
        <div class="sp-card-title">${escapeHtml(title)}</div>
        ${bodyContent}
        <div class="sp-card-footer">
          <div class="sp-card-tags">${tagsHtml}</div>
          <div class="sp-card-actions">
            ${jumpAction}
            <button class="sp-del-btn" data-id="${atom.id}" title="Delete clip">✕</button>
          </div>
        </div>
      </div>
    `;
  });

  elements.atomStream.innerHTML = html;

  // Delete button listeners
  elements.atomStream.querySelectorAll('.sp-del-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      if (!id) return;
      try {
        const apiBase = await getWorkingApiBase();
        await fetch(`${apiBase}/atoms?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
        showToast('Note deleted');
        loadProjectAtoms();
      } catch {
        showToast('Failed to delete');
      }
    });
  });
}

// ==========================================================================
// PAGE AI (SUMMARIZE + Q&A) WITH DIRECT "SAVE TO PROJECT"
// ==========================================================================

async function handleSummarizePage() {
  if (isAiLoading) return;
  isAiLoading = true;
  appendLoadingBubble();

  try {
    const pageContext = activeTabInfo.mainContent || activeTabInfo.title;

    // Background messaging fallback
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      const bgResp = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'AI_SUMMARIZE_PAGE',
          payload: {
            pageText: pageContext,
            title: activeTabInfo.title,
            url: activeTabInfo.url,
          }
        }, resolve);
      });

      if (bgResp && bgResp.success && bgResp.data) {
        removeLoadingBubble();
        isAiLoading = false;
        const d = bgResp.data;
        let responseMd = `### ${d.title || activeTabInfo.title}\n\n${d.executiveSummary || d.summary || ''}\n\n`;
        if (Array.isArray(d.keyTakeaways) && d.keyTakeaways.length > 0) {
          responseMd += `**Key Points:**\n` + d.keyTakeaways.map(t => `- ${t}`).join('\n') + '\n\n';
        }
        appendChatMessage('assistant', responseMd, d.citations || []);
        return;
      }
    }

    const apiBase = await getWorkingApiBase();
    const res = await fetch(`${apiBase}/ai/page-summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pageText: pageContext,
        title: activeTabInfo.title,
        url: activeTabInfo.url,
      }),
    });

    removeLoadingBubble();
    isAiLoading = false;

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        let responseMd = `### ${d.title || activeTabInfo.title}\n\n${d.executiveSummary || d.summary || ''}\n\n`;
        if (Array.isArray(d.keyTakeaways) && d.keyTakeaways.length > 0) {
          responseMd += `**Key Points:**\n` + d.keyTakeaways.map(t => `- ${t}`).join('\n') + '\n\n';
        }
        appendChatMessage('assistant', responseMd, d.citations || []);
        return;
      }
    }
  } catch (err) {
    console.warn('Summarize error:', err);
  }

  removeLoadingBubble();
  isAiLoading = false;
  appendChatMessage('assistant', `**Summary for ${activeTabInfo.title}:**\n- Page contains about ${activeTabInfo.wordCount} words across ${activeTabInfo.headings.length} sections.\n- Key sections cover: ${activeTabInfo.headings.slice(0, 3).join(', ') || activeTabInfo.title}.`);
}

async function sendUserChatMessage() {
  if (!elements.chatInput) return;
  const query = elements.chatInput.value.trim();
  if (!query || isAiLoading) return;

  elements.chatInput.value = '';
  appendChatMessage('user', query);
  appendLoadingBubble();
  isAiLoading = true;

  try {
    const pageContext = activeTabInfo.mainContent || activeTabInfo.title;

    // Try background message proxy first
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      const bgResp = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'AI_QNA',
          payload: {
            question: query,
            pageText: pageContext,
            context: pageContext,
          }
        }, resolve);
      });

      if (bgResp && bgResp.success && bgResp.data) {
        removeLoadingBubble();
        isAiLoading = false;
        const d = bgResp.data;
        let answer = d.answer || d.directAnswer || d.executiveSummary || d.summary || (typeof d === 'string' ? d : 'Here is the response:');
        if (Array.isArray(d.evidenceBullets) && d.evidenceBullets.length > 0) {
          answer += '\n\n' + d.evidenceBullets.map(b => `- ${b}`).join('\n');
        }
        appendChatMessage('assistant', answer, d.citations || []);
        return;
      }
    }

    const apiBase = await getWorkingApiBase();
    const res = await fetch(`${apiBase}/ai/qna`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: query,
        pageText: pageContext,
        context: pageContext,
      }),
    });

    removeLoadingBubble();
    isAiLoading = false;

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        let answer = d.answer || d.directAnswer || d.executiveSummary || d.summary || (typeof d === 'string' ? d : 'Here is the response:');
        if (Array.isArray(d.evidenceBullets) && d.evidenceBullets.length > 0) {
          answer += '\n\n' + d.evidenceBullets.map(b => `- ${b}`).join('\n');
        }
        appendChatMessage('assistant', answer, d.citations || []);
        return;
      }
    }
  } catch (err) {
    console.warn('Chat error:', err);
  }

  removeLoadingBubble();
  isAiLoading = false;
  appendChatMessage('assistant', `Based on "${activeTabInfo.title}":\n\n- The page context relates directly to your query.\n- You can also highlight any paragraph and press **Alt+S** to save it to your project timeline.`);
}

function appendChatMessage(role, text, citations = []) {
  if (!elements.chatMessages) return;
  const bubble = document.createElement('div');
  bubble.className = `sp-chat-bubble ${role}`;
  
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const roleLabel = role === 'user' ? 'YOU' : 'RESEARCHIE AI';

  let citationsHtml = '';
  if (Array.isArray(citations) && citations.length > 0) {
    citationsHtml = `<div style="margin-top: 6px;">` + citations.map(c => 
      `<span class="sp-citation-chip" title="${escapeHtml(c.quote || c.text || '')}">📌 ${escapeHtml(c.sourceTitle || c.title || 'Source')}</span>`
    ).join('') + `</div>`;
  }

  let actionsHtml = '';
  if (role === 'assistant') {
    actionsHtml = `
      <div class="sp-bubble-actions">
        <button class="sp-bubble-btn sp-btn-copy-ans" title="Copy text">Copy</button>
        <button class="sp-bubble-btn sp-btn-save-project" title="Save this AI answer as note in project">+ Save to Project</button>
      </div>
    `;
  }

  const bodyContent = typeof parseMarkdownToBlocks === 'function' && typeof renderBlock === 'function'
    ? parseMarkdownToBlocks(text).map(renderBlock).join('')
    : renderSimpleMarkdown(text);

  bubble.innerHTML = `
    <div class="sp-bubble-header">
      <span class="sp-bot-tag">${roleLabel}</span>
      <span class="sp-bubble-time">${timeStr}</span>
    </div>
    <div class="sp-bubble-body">${bodyContent}</div>
    ${citationsHtml}
    ${actionsHtml}
  `;

  // Attach button listeners
  if (role === 'assistant') {
    const copyBtn = bubble.querySelector('.sp-btn-copy-ans');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(text);
        copyBtn.textContent = 'Copied!';
        setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
      });
    }

    const saveProjectBtn = bubble.querySelector('.sp-btn-save-project');
    if (saveProjectBtn) {
      saveProjectBtn.addEventListener('click', async () => {
        saveProjectBtn.disabled = true;
        saveProjectBtn.textContent = 'Saving...';
        try {
          const apiBase = await getWorkingApiBase();
          const payload = {
            projectId: activeProjectId,
            type: 'note',
            title: `Page AI: ${activeTabInfo.title.slice(0, 45)}`,
            content: {
              text: text,
              markdownContent: text,
              description: `Synthesized by Researchie AI from ${activeTabInfo.title}`,
            },
            metadata: {
              sourceUrl: activeTabInfo.url,
              pageTitle: activeTabInfo.title,
            },
            tags: ['ai-page-insight', 'page-ai'],
          };

          const res = await fetch(`${apiBase}/atoms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (res.ok) {
            saveProjectBtn.textContent = '✓ Saved!';
            showToast('Saved to project timeline');
            loadProjectAtoms();
          } else {
            saveProjectBtn.textContent = '+ Save to Project';
            saveProjectBtn.disabled = false;
            showToast('Failed to save');
          }
        } catch (err) {
          saveProjectBtn.textContent = '+ Save to Project';
          saveProjectBtn.disabled = false;
          showToast('Saved to offline queue');
        }
      });
    }
  }

  elements.chatMessages.appendChild(bubble);
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

function appendLoadingBubble() {
  if (!elements.chatMessages) return;
  const bubble = document.createElement('div');
  bubble.className = 'sp-chat-bubble assistant sp-loading-bubble';
  bubble.innerHTML = `
    <div class="sp-bubble-header">
      <span class="sp-bot-tag">RESEARCHIE AI</span>
      <span class="sp-bubble-time">Working...</span>
    </div>
    <div style="color: var(--text-muted); font-style: italic;">Reading page and analyzing notes...</div>
  `;
  elements.chatMessages.appendChild(bubble);
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

function removeLoadingBubble() {
  if (!elements.chatMessages) return;
  const loading = elements.chatMessages.querySelector('.sp-loading-bubble');
  if (loading) loading.remove();
}

// ==========================================================================
// CAPTURE SHORTCUTS & TRIGGERS (IMAGE & LINK INCLUDED)
// ==========================================================================

async function triggerCapture(mode) {
  // If embedded in in-page drawer iframe, notify host window
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ action: 'RESEARCHIE_TRIGGER_CAPTURE', mode: mode }, '*');
    }
  } catch {}

  if (activeTabInfo.id && typeof chrome !== 'undefined' && chrome.tabs) {
    if (mode === 'text') {
      chrome.tabs.sendMessage(activeTabInfo.id, { action: 'SAVE_SELECTION_TRIGGERED' });
      showToast('Text captured (Alt+S)');
    } else if (mode === 'block') {
      chrome.tabs.sendMessage(activeTabInfo.id, { action: 'TRIGGER_BLOCK_PICKER' });
      showToast('Click any element on page (Alt+B)');
    } else if (mode === 'image') {
      chrome.tabs.sendMessage(activeTabInfo.id, { action: 'TRIGGER_IMAGE_SELECTOR' });
      showToast('Click any image on page (Alt+I)');
    } else if (mode === 'crop') {
      chrome.tabs.sendMessage(activeTabInfo.id, { action: 'TRIGGER_IMAGE_CROPPER' });
      showToast('Drag area to crop (Alt+C)');
    } else if (mode === 'link_select') {
      chrome.tabs.sendMessage(activeTabInfo.id, { action: 'TRIGGER_LINK_PICKER' });
      showToast('Click any hyperlink to save to project');
    } else if (mode === 'link') {
      const payload = {
        projectId: activeProjectId,
        type: 'link',
        title: activeTabInfo.title,
        content: {
          targetUrl: activeTabInfo.url,
          description: `Saved from ${activeTabInfo.domain}`,
        },
        metadata: {
          sourceUrl: activeTabInfo.url,
          pageTitle: activeTabInfo.title,
          domainFavicon: `https://www.google.com/s2/favicons?domain=${activeTabInfo.domain}&sz=64`,
        },
        tags: ['web-link', activeTabInfo.domain.replace(/\..+$/, '')],
      };

      try {
        const apiBase = await getWorkingApiBase();
        await fetch(`${apiBase}/atoms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        showToast('Page link saved');
        loadProjectAtoms();
      } catch {
        showToast('Saved to offline queue');
      }
    }
  }
}

// ==========================================================================
// EVENT LISTENERS & NAVIGATION
// ==========================================================================

function setupNavigation() {
  elements.navTabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      currentNavTab = tabId;

      elements.navTabBtns.forEach((b) => b.classList.remove('active'));
      elements.tabPanes.forEach((p) => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPane = document.getElementById(`tab-${tabId}`);
      if (targetPane) targetPane.classList.add('active');

      if (tabId === 'page-ai') {
        refreshActiveTabContext();
      }
    });
  });
}

function setupEventListeners() {
  // Shortcuts Help Modal
  if (elements.btnShortcutsHelp && elements.shortcutsModal) {
    elements.btnShortcutsHelp.addEventListener('click', () => {
      elements.shortcutsModal.classList.remove('hidden');
    });
  }

  if (elements.shortcutsClose && elements.shortcutsModal) {
    elements.shortcutsClose.addEventListener('click', () => {
      elements.shortcutsModal.classList.add('hidden');
    });
  }

  // Close Panel button
  if (elements.btnClosePanel) {
    elements.btnClosePanel.addEventListener('click', () => {
      try {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ action: 'RESEARCHIE_CLOSE_DRAWER' }, '*');
        }
      } catch {}
      try {
        window.close();
      } catch {}
    });
  }

  // Keyboard shortcut fallback inside sidepanel (Alt+P or Escape to close)
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (elements.shortcutsModal && !elements.shortcutsModal.classList.contains('hidden')) {
        elements.shortcutsModal.classList.add('hidden');
        return;
      }
      if (elements.projectMenu && !elements.projectMenu.classList.contains('hidden')) {
        elements.projectMenu.classList.add('hidden');
        return;
      }
      try {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ action: 'RESEARCHIE_CLOSE_DRAWER' }, '*');
        }
      } catch {}
    } else if ((e.altKey || e.metaKey) && (e.key === 'p' || e.key === 'P' || e.code === 'KeyP')) {
      try {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ action: 'RESEARCHIE_CLOSE_DRAWER' }, '*');
        }
      } catch {}
    }
  });

  // Top Header buttons
  if (elements.btnOpenDash) {
    elements.btnOpenDash.addEventListener('click', async () => {
      const origin = cachedWorkingOrigin || 'http://localhost:3001';
      const targetUrl = `${origin}?project=${encodeURIComponent(activeProjectId)}`;
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        chrome.tabs.create({ url: targetUrl });
      } else {
        window.open(targetUrl, '_blank');
      }
    });
  }

  if (elements.btnRefreshAll) {
    elements.btnRefreshAll.addEventListener('click', async () => {
      await refreshActiveTabContext();
      await loadProjects();
      await loadProjectAtoms();
      showToast('Refreshed');
    });
  }

  // Project picker dropdown
  if (elements.projectPill) {
    elements.projectPill.addEventListener('click', () => {
      if (elements.projectMenu) {
        elements.projectMenu.classList.toggle('hidden');
      }
    });
  }

  if (elements.projectMenuClose) {
    elements.projectMenuClose.addEventListener('click', () => {
      if (elements.projectMenu) {
        elements.projectMenu.classList.add('hidden');
      }
    });
  }

  // Feed Filter chips
  elements.typeChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      elements.typeChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      selectedTypeFilter = chip.dataset.type || 'all';
      renderFilteredAtoms();
    });
  });

  // Feed Search input
  if (elements.feedSearch) {
    elements.feedSearch.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderFilteredAtoms();
    });
  }

  // Page AI Tab actions
  if (elements.btnRefreshTabCtx) {
    elements.btnRefreshTabCtx.addEventListener('click', () => {
      refreshActiveTabContext();
      showToast('Page content refreshed');
    });
  }

  if (elements.btnAiSummarizeTab) {
    elements.btnAiSummarizeTab.addEventListener('click', () => {
      handleSummarizePage();
    });
  }

  // Chat send
  if (elements.chatSendBtn) {
    elements.chatSendBtn.addEventListener('click', () => {
      sendUserChatMessage();
    });
  }

  if (elements.chatInput) {
    elements.chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendUserChatMessage();
      }
    });
  }

  // Capture Tile Triggers
  if (elements.capText) elements.capText.addEventListener('click', () => triggerCapture('text'));
  if (elements.capBlock) elements.capBlock.addEventListener('click', () => triggerCapture('block'));
  if (elements.capImage) elements.capImage.addEventListener('click', () => triggerCapture('image'));
  if (elements.capCrop) elements.capCrop.addEventListener('click', () => triggerCapture('crop'));
  if (elements.capLink) elements.capLink.addEventListener('click', () => triggerCapture('link'));
  if (elements.capLinkSelect) elements.capLinkSelect.addEventListener('click', () => triggerCapture('link_select'));

  if (elements.btnFlushOffline) {
    elements.btnFlushOffline.addEventListener('click', () => {
      flushOfflineQueue();
    });
  }
}

// ==========================================================================
// OFFLINE SYNC QUEUE & HEALTH CHECK
// ==========================================================================

async function checkBridgeConnection() {
  const apiBase = await getWorkingApiBase();
  if (elements.bridgeStatus) elements.bridgeStatus.textContent = apiBase.replace(/\/api$/, '');
  
  try {
    const res = await fetch(`${apiBase}/projects`, { signal: AbortSignal.timeout(1500) });
    if (res.ok) {
      if (elements.syncStatusText) elements.syncStatusText.textContent = 'Connected';
      if (elements.syncIndicator) {
        const dot = elements.syncIndicator.querySelector('.sp-pulse-dot');
        if (dot) dot.style.backgroundColor = 'var(--accent-emerald)';
      }
      return;
    }
  } catch {}

  if (elements.syncStatusText) elements.syncStatusText.textContent = 'Offline';
  if (elements.syncIndicator) {
    const dot = elements.syncIndicator.querySelector('.sp-pulse-dot');
    if (dot) dot.style.backgroundColor = 'var(--accent-amber)';
  }
}

function updateOfflineQueueCount(queue) {
  const count = Array.isArray(queue) ? queue.length : 0;
  if (elements.offlineQueueCount) {
    elements.offlineQueueCount.textContent = `${count} item${count === 1 ? '' : 's'}`;
  }
}

async function flushOfflineQueue() {
  if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) return;
  const data = await chrome.storage.local.get(['offlineQueue']);
  const queue = data.offlineQueue || [];

  if (queue.length === 0) {
    showToast('No offline items to sync');
    return;
  }

  showToast(`Syncing ${queue.length} items...`);
  const apiBase = await getWorkingApiBase();
  const failed = [];

  for (const item of queue) {
    try {
      await fetch(`${apiBase}/atoms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
    } catch {
      failed.push(item);
    }
  }

  await chrome.storage.local.set({ offlineQueue: failed });
  updateOfflineQueueCount(failed);

  if (failed.length === 0) {
    showToast('All offline items synced!');
    loadProjectAtoms();
  } else {
    showToast(`${failed.length} items still offline`);
  }
}

// ==========================================================================
// UTILITIES
// ==========================================================================

function showToast(msg) {
  if (!elements.toast || !elements.toastText) return;
  elements.toastText.textContent = msg;
  elements.toast.classList.remove('hidden');
  setTimeout(() => {
    elements.toast.classList.add('hidden');
  }, 2400);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderSimpleMarkdown(text) {
  if (!text) return '';
  
  // 1. Protect code blocks from inner regex replaces
  const codeBlocks = [];
  let processed = text.replace(/```([\s\S]*?)```/g, (match, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push(`<pre class="sp-md-pre"><code class="sp-md-code">${escapeHtml(code.trim())}</code></pre>`);
    return `__CODE_BLOCK_${idx}__`;
  });

  // 2. Parse Markdown Tables (Protected from HTML escaping)
  const tableBlocks = [];
  processed = processed.replace(/(?:^|\n)(\|[^\n]+\|\n\|[-:\s|]+\|\n(?:\|[^\n]+\|\n?)+)/g, (match, tableStr) => {
    const lines = tableStr.trim().split('\n').filter(Boolean);
    if (lines.length < 3) return match;

    const parseRow = (row) => row.split('|').slice(1, -1).map(c => c.trim());
    const headerCols = parseRow(lines[0]);
    const bodyRows = lines.slice(2).map(parseRow);

    let html = '<div class="sp-table-scroll"><table class="sp-md-table"><thead><tr>';
    headerCols.forEach(col => {
      html += `<th>${escapeHtml(col)}</th>`;
    });
    html += '</tr></thead><tbody>';
    bodyRows.forEach(row => {
      html += '<tr>';
      row.forEach(cell => {
        html += `<td>${escapeHtml(cell)}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    const idx = tableBlocks.length;
    tableBlocks.push(html);
    return `\n__TABLE_BLOCK_${idx}__\n`;
  });

  // 3. Escape remaining HTML
  let clean = escapeHtml(processed);

  // 4. Blockquotes (> Excerpt)
  clean = clean.replace(/^(?:&gt;|>)\s*(.+)$/gm, '<div class="sp-md-quote">$1</div>');

  // 5. Headings
  clean = clean.replace(/^#### (.+)$/gm, '<h5 style="margin: 6px 0 2px 0; font-size: 12px; color: var(--text-primary); font-weight: 700;">$1</h5>');
  clean = clean.replace(/^### (.+)$/gm, '<h4 style="margin: 7px 0 3px 0; font-size: 13px; color: var(--text-primary); font-weight: 700;">$1</h4>');
  clean = clean.replace(/^## (.+)$/gm, '<h3 style="margin: 9px 0 4px 0; font-size: 14px; color: var(--text-primary); font-weight: 700;">$1</h3>');
  clean = clean.replace(/^# (.+)$/gm, '<h2 style="margin: 10px 0 5px 0; font-size: 15px; color: var(--text-primary); font-weight: 700;">$1</h2>');

  // 6. Markdown Links [text](url)
  clean = clean.replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g, '<a href="$2" target="_blank" class="sp-md-link">$1</a>');

  // 7. Inline code `code`
  clean = clean.replace(/`([^`]+)`/g, '<code class="sp-md-code">$1</code>');

  // 8. Citations & Page References [Page X], [p. 135], [1]
  clean = clean.replace(/(\[(?:page|p\.|pp\.)\s*\d+(?:-\d+)?\])/gi, '<span class="sp-semantic-page sp-citation-chip">$1</span>');
  clean = clean.replace(/(\[(?:source|\d+|cite:[^\]]+)\])/gi, '<span class="sp-citation-chip">$1</span>');

  // 9. Bold
  clean = clean.replace(/\*\*(.+?)\*\*/g, '<strong style="color: var(--text-primary); font-weight: 700;">$1</strong>');

  // 10. Italic
  clean = clean.replace(/\*([^\*]+)\*/g, '<em>$1</em>');

  // 11. Subtle Semantic Inline Colors (NO background containers)
  // Metrics & Numbers: $10M, +34%, 14ms, 3.5x
  clean = clean.replace(/((\+|\-)?(?:\$|€|£|¥)\s*\d+(?:[.,]\d+)*(?:\s*(?:k|M|B|T|million|billion))?|(?:\+|\-)\d+(?:\.\d+)?%|\b\d+(?:\.\d+)?%|\b\d+(?:\.\d+)?x\b|\b\d+(?:\.\d+)?\s*(?:ms|fps|GB|MB|KB)\b|\b\d{1,3}(?:,\d{3})+\b)/g, '<span class="sp-semantic-metric">$1</span>');

  // Dates / Years: 2024, March 2025, Q3 2024
  clean = clean.replace(/\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{1,2}(?:st|nd|rd|th)?,?\s*\d{4}|\b(?:19|20)\d{2}\b|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(?:19|20)\d{2}|Q[1-4]\s*(?:19|20)\d{2})\b/gi, '<span class="sp-semantic-date">$1</span>');

  // URLs (standalone)
  clean = clean.replace(/(?<!href=")(https?:\/\/[^\s<]+)/gi, '<a href="$1" target="_blank" class="sp-semantic-url">$1</a>');

  // 12. Bullet & Numbered lists
  clean = clean.replace(/^- (.+)$/gm, '<div style="display: flex; gap: 6px; margin: 3px 0;"><span style="color: var(--text-muted);">•</span><span>$1</span></div>');
  clean = clean.replace(/^(\d+)\.\s+(.+)$/gm, '<div style="display: flex; gap: 6px; margin: 3px 0;"><span style="color: var(--text-muted); font-family: var(--font-mono); font-size: 11px;">$1.</span><span>$2</span></div>');

  // 13. Spacing & line breaks
  clean = clean.replace(/\n\n/g, '<div style="height: 6px;"></div>');
  clean = clean.replace(/\n/g, '<br>');

  // 14. Restore protected code and table blocks
  codeBlocks.forEach((block, idx) => {
    clean = clean.replace(`__CODE_BLOCK_${idx}__`, block);
  });
  tableBlocks.forEach((block, idx) => {
    clean = clean.replace(`__TABLE_BLOCK_${idx}__`, block);
  });

  return clean;
}
