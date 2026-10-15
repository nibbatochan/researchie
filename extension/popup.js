const CANDIDATE_ORIGINS = [
  'http://localhost:3001',
  'http://localhost:3000',
  'http://localhost:3002',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3000',
];

let cachedWorkingOrigin = null;

async function getWorkingApiBase() {
  // A saved server address (popup -> Connect) wins over looking for a local one.
  const saved = await chrome.storage.local.get(['serverUrl']);
  if (saved.serverUrl) return saved.serverUrl.replace(/\/+$/, '') + '/api';

  if (cachedWorkingOrigin) {
    try {
      const ping = await fetch(`${cachedWorkingOrigin}/api/projects`, { signal: AbortSignal.timeout(1000) });
      if (ping.ok) return `${cachedWorkingOrigin}/api`;
    } catch {}
  }

  for (const origin of CANDIDATE_ORIGINS) {
    try {
      const ping = await fetch(`${origin}/api/projects`, { signal: AbortSignal.timeout(1000) });
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

const DEFAULT_PROJECTS = [
  {
    id: 'proj-ai-main',
    title: 'Artificial Intelligence & RAG',
    description: 'Core research umbrella covering vector retrieval architectures, multimodal synthesis, and knowledge graph augmentation.',
    color_badge: '#325FEC',
    atom_count: 0,
  },
  {
    id: 'proj-rag-arch-2026',
    parentId: 'proj-ai-main',
    title: 'Neural Information Retrieval & Adaptive RAG',
    description: 'Hierarchical chunking, hybrid BM25 + dense embedding reranking, and self-reflective query expansion.',
    color_badge: '#518FFF',
    atom_count: 0,
  },
];

document.addEventListener('DOMContentLoaded', async () => {
  const extensionToggle = document.getElementById('extension-toggle');
  const headerPushText = document.getElementById('header-push-text');

  const projectTitle = document.getElementById('project-title');
  const projectDesc = document.getElementById('project-desc');
  const projectAvatar = document.getElementById('project-avatar');
  const projectAvatarChar = document.getElementById('project-avatar-char');
  const changeProjectBtn = document.getElementById('change-project-btn');
  const projectPicker = document.getElementById('project-picker');
  const closePickerBtn = document.getElementById('close-picker-btn');
  const projectListOptions = document.getElementById('project-list-options');

  // Summary & Q&A Elements
  const btnSummarize = document.getElementById('btn-summarize');
  const btnQnAToggle = document.getElementById('btn-qna-toggle');
  const summaryView = document.getElementById('summary-view');
  const summaryBox = document.getElementById('summary-box');
  const closeSummaryBtn = document.getElementById('close-summary-btn');
  const btnSaveSummary = document.getElementById('btn-save-summary');

  const qnaView = document.getElementById('qna-view');
  const closeQnABtn = document.getElementById('close-qna-btn');
  const popupQInput = document.getElementById('popup-q-input');
  const btnPopupQSend = document.getElementById('btn-popup-q-send');
  const qnaAnswerBox = document.getElementById('qna-answer-box');
  const qnaAnswerText = document.getElementById('qna-answer-text');
  const btnSaveQnA = document.getElementById('btn-save-qna');

  let currentSummaryData = null;
  let currentQnAData = null;

  // 4 Mode Buttons
  const modeBtns = document.querySelectorAll('.mode-btn');

  function setExtensionActiveUI(enabled, activeMode = 'text') {
    extensionToggle.checked = enabled;
    if (enabled) {
      modeBtns.forEach((btn) => {
        if (btn.dataset.mode === activeMode) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    } else {
      modeBtns.forEach((btn) => btn.classList.remove('active'));
    }
  }

  // Load Initial Storage State
  chrome.storage.local.get(
    ['activeProjectId', 'activeProjectTitle', 'activeProjectDesc', 'activeProjectColor', 'activeParentTitle', 'extensionEnabled', 'lastPushTime', 'activeMode'],
    async (data) => {
      const enabled = data.extensionEnabled !== false;
      const initialMode = data.activeMode || 'text';
      setExtensionActiveUI(enabled, initialMode);

      if (data.activeProjectTitle) {
        updateProjectDisplay(
          {
            id: data.activeProjectId,
            title: data.activeProjectTitle,
            description: data.activeProjectDesc || '',
            color_badge: data.activeProjectColor || '#325FEC',
          },
          data.activeParentTitle || ''
        );
      }

      if (data.lastPushTime) {
        headerPushText.textContent = `recent push: ${formatTimeAgo(new Date(data.lastPushTime))}`;
      } else {
        headerPushText.textContent = 'ready to send';
      }

      // Proactively sync projects from active backend server without overwriting user selection
      try {
        const apiBase = await getWorkingApiBase();
        const projRes = await fetch(`${apiBase}/projects`);
        if (projRes.ok) {
          const projJson = await projRes.json();
          if (projJson.data && projJson.data.length > 0) {
            const match = data.activeProjectId
              ? projJson.data.find((p) => p.id === data.activeProjectId)
              : null;
            if (match) {
              const parentMatch = match.parentId ? projJson.data.find((p) => p.id === match.parentId) : null;
              const parentTitle = parentMatch?.title || data.activeParentTitle || '';
              await chrome.storage.local.set({
                activeProjectId: match.id,
                activeProjectTitle: match.title,
                activeProjectDesc: match.description || '',
                activeProjectColor: match.color_badge || match.color || '#325FEC',
                activeParentTitle: parentTitle,
              });
              updateProjectDisplay(match, parentTitle);
            } else if (!data.activeProjectId) {
              const first = projJson.data[0];
              await chrome.storage.local.set({
                activeProjectId: first.id,
                activeProjectTitle: first.title,
                activeProjectDesc: first.description || '',
                activeProjectColor: first.color_badge || first.color || '#325FEC',
                activeParentTitle: '',
              });
              updateProjectDisplay(first, '');
            }
          }
        }
      } catch {}
    }
  );

  // Toggle Extension Switch
  extensionToggle.addEventListener('change', () => {
    const isChecked = extensionToggle.checked;
    const nextMode = isChecked ? 'text' : null;
    chrome.storage.local.set({ extensionEnabled: isChecked, activeMode: nextMode });
    setExtensionActiveUI(isChecked, 'text');
    showToast(isChecked ? 'Capture Mode Active (Text Selector On)' : 'Capture Mode Paused');
  });

  // Ensure Content Scripts are injected
  async function ensureScriptsInjected(tabId) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['projectMenu.js', 'content.js', 'blockPicker.js', 'cropper.js'],
      });
    } catch {}
  }

  // 4 Mode Selectors
  modeBtns.forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!extensionToggle.checked) {
        extensionToggle.checked = true;
        chrome.storage.local.set({ extensionEnabled: true });
      }

      modeBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const mode = btn.dataset.mode;
      chrome.storage.local.set({ activeMode: mode });

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id || tab.url?.startsWith('chrome://')) {
        showToast('Open a web page to use visual selection');
        return;
      }

      await ensureScriptsInjected(tab.id);

      if (mode === 'link') {
        const stored = await chrome.storage.local.get(['activeProjectId']);
        let domain = 'source';
        try {
          domain = new URL(tab.url).hostname;
        } catch {}

        const payload = {
          projectId: stored.activeProjectId || 'proj-ai-main',
          type: 'link',
          title: tab.title || 'Saved Page Link',
          content: {
            targetUrl: tab.url,
            description: `Saved from ${domain}`,
          },
          metadata: {
            sourceUrl: tab.url,
            pageTitle: tab.title,
            domainFavicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
          },
          tags: ['web-link', domain.replace(/\..+$/, '')],
        };

        // The background saves it, or keeps it in the offline queue when the server can't be reached.
        const result = await chrome.runtime.sendMessage({ action: 'SAVE_ATOM', payload }).catch(() => null);
        let linkMessage;
        if (result && result.success) {
          linkMessage = 'Page link saved to project';
        } else if (result && result.needsConnect) {
          linkMessage = 'Not connected. Link held until you connect';
        } else if (result && result.queued) {
          linkMessage = 'Saved offline. It will send when the connection returns';
        } else {
          linkMessage = 'Could not save the link. Try again';
        }
        showToast(linkMessage);
        chrome.tabs.sendMessage(tab.id, { action: 'SHOW_TOAST', text: linkMessage }).catch(() => {});
      } else if (mode === 'block') {
        chrome.tabs.sendMessage(tab.id, { action: 'TRIGGER_BLOCK_PICKER' });
        window.close();
      } else if (mode === 'image') {
        chrome.tabs.sendMessage(tab.id, { action: 'TRIGGER_IMAGE_SELECTOR' });
        window.close();
      } else if (mode === 'shot') {
        chrome.tabs.sendMessage(tab.id, { action: 'TRIGGER_IMAGE_CROPPER' });
        window.close();
      } else {
        showToast('Text Selection Mode Active');
      }
    });
  });

  // Open Project Picker
  changeProjectBtn.addEventListener('click', async () => {
    projectPicker.classList.toggle('hidden');
    if (!projectPicker.classList.contains('hidden')) {
      await renderProjectOptions();
    }
  });

  closePickerBtn.addEventListener('click', () => {
    projectPicker.classList.add('hidden');
  });

  // 1. In-Popup Page Brief (Summarize) with Expanded Size & Structured Rendering
  btnSummarize.addEventListener('click', async () => {
    qnaView.classList.add('hidden');
    summaryView.classList.remove('hidden');
    document.body.classList.add('expanded');
    summaryBox.innerHTML = '<div style="color:#A1A1AA;padding:8px;">Extracting page brief...</div>';

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      summaryBox.innerHTML = '<div style="padding:8px;">Cannot access active tab context.</div>';
      return;
    }

    try {
      const [{ result: pageText }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => document.body.innerText.slice(0, 15000),
      });

      const apiBase = await getWorkingApiBase();
      const res = await fetch(`${apiBase}/ai/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageText, pageTitle: tab.title || 'Page' }),
      });

      if (res.ok) {
        const json = await res.json();
        const data = json.data || {};
        // The route now returns a written Markdown summary (shape follows the page). Show it as written.
        if (data.markdown) {
          currentSummaryData = { tab, summary: data.markdown, keyFindings: [], metricsAndData: [], implications: [] };
          summaryBox.innerHTML = `
            <div class="summary-section-card">
              <div style="color:#FAFAFA;line-height:1.5;font-size:12.5px;white-space:pre-wrap;">${escapeHtml(data.markdown)}</div>
            </div>
          `;
          return;
        }
        const summary = data.summary || 'Summary unavailable.';
        const keyFindings = data.keyFindings || data.bulletTakeaways || [];
        const metricsAndData = data.metricsAndData || [];
        const implications = data.implications || [];

        currentSummaryData = { tab, summary, keyFindings, metricsAndData, implications };

        let findingsHtml = '';
        if (keyFindings.length > 0) {
          findingsHtml = `
            <div class="summary-section-card" style="margin-top:8px;">
              <span style="color:#FAFAFA;font-family:'JetBrains Mono',monospace;font-size:10px;text-transform:uppercase;display:block;margin-bottom:4px;">Key Insights</span>
              <ul style="margin:0;padding-left:16px;color:#D4D4D8;font-size:12px;line-height:1.5;">
                ${keyFindings.map((f) => `<li style="margin-bottom:3px;">${escapeHtml(f)}</li>`).join('')}
              </ul>
            </div>
          `;
        }

        let metricsHtml = '';
        if (metricsAndData.length > 0) {
          metricsHtml = `
            <div class="summary-section-card" style="margin-top:8px;">
              <span style="color:#FAFAFA;font-family:'JetBrains Mono',monospace;font-size:10px;text-transform:uppercase;display:block;margin-bottom:4px;">Metrics & Data Points</span>
              <div style="display:flex;flex-wrap:wrap;gap:4px;">
                ${metricsAndData.map((m) => `<span class="metric-pill" style="background:#18181B;border:1px solid #27272A;color:#FAFAFA;padding:2px 6px;border-radius:4px;font-size:11px;">${escapeHtml(m)}</span>`).join('')}
              </div>
            </div>
          `;
        }

        summaryBox.innerHTML = `
          <div class="summary-section-card">
            <span style="color:#FAFAFA;font-family:'JetBrains Mono',monospace;font-size:10px;text-transform:uppercase;display:block;margin-bottom:4px;">Core Takeaway</span>
            <div style="color:#FAFAFA;font-weight:500;line-height:1.5;font-size:12.5px;">${escapeHtml(summary)}</div>
          </div>
          ${findingsHtml}
          ${metricsHtml}
        `;
      } else {
        summaryBox.textContent = 'Failed to extract summary.';
      }
    } catch {
      summaryBox.textContent = 'Summary endpoint unreachable.';
    }
  });

  closeSummaryBtn.addEventListener('click', () => {
    summaryView.classList.add('hidden');
    if (qnaView.classList.contains('hidden')) {
      document.body.classList.remove('expanded');
    }
  });

  // Save Summary to Platform
  btnSaveSummary.addEventListener('click', async () => {
    if (!currentSummaryData) return;
    const { tab, summary, keyFindings } = currentSummaryData;

    const summaryTagInput = document.getElementById('summary-tag-input');
    const tagVal = summaryTagInput?.value.trim();
    const tags = tagVal ? [tagVal.replace(/^#/, '')] : ['summary', 'brief'];

    const mdContent = keyFindings.length > 0
      ? `### Summary\n${summary}\n\n### Key Takeaways\n${keyFindings.map((f) => `- ${f}`).join('\n')}`
      : summary;
    const storage = await chrome.storage.local.get(['activeProjectId']);

    const payload = {
      projectId: storage.activeProjectId,
      type: 'note',
      title: `Executive Brief: ${tab.title || 'Web Source'}`,
      content: {
        description: summary,
        markdownContent: mdContent,
      },
      metadata: {
        sourceUrl: tab.url,
        pageTitle: tab.title || 'Source',
        domainFavicon: `https://www.google.com/s2/favicons?domain=${new URL(tab.url).hostname}&sz=64`,
      },
      tags: tags,
    };

    chrome.runtime.sendMessage({ action: 'SAVE_ATOM', payload }, (res) => {
      btnSaveSummary.textContent = '✓ Sent to Platform!';
      btnSaveSummary.style.backgroundColor = '#10B981';
      btnSaveSummary.style.color = '#FFF';
      headerPushText.textContent = 'recent push: just now';
      showToast('Page brief sent to timeline!');
      setTimeout(() => {
        btnSaveSummary.textContent = '+ Send Brief to Platform';
        btnSaveSummary.style.backgroundColor = '#27272A';
        btnSaveSummary.style.color = '#FAFAFA';
      }, 2500);
    });
  });

  // 2. In-Popup Custom Q&A with Expanded Size & Structured Rendering
  btnQnAToggle.addEventListener('click', () => {
    summaryView.classList.add('hidden');
    qnaView.classList.toggle('hidden');
    if (!qnaView.classList.contains('hidden')) {
      document.body.classList.add('expanded');
      popupQInput.focus();
    } else {
      if (summaryView.classList.contains('hidden')) {
        document.body.classList.remove('expanded');
      }
    }
  });

  closeQnABtn.addEventListener('click', () => {
    qnaView.classList.add('hidden');
    if (summaryView.classList.contains('hidden')) {
      document.body.classList.remove('expanded');
    }
  });

  btnPopupQSend.addEventListener('click', executeQnA);
  popupQInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') executeQnA();
  });

  async function executeQnA() {
    const question = popupQInput.value.trim();
    if (!question) return;

    qnaAnswerBox.classList.remove('hidden');
    document.body.classList.add('expanded');
    qnaAnswerText.innerHTML = '<span style="color:#A1A1AA;">Searching page and formulating answer...</span>';

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) return;

    try {
      const [{ result: pageText }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => document.body.innerText.slice(0, 15000),
      });

      const apiBase = await getWorkingApiBase();
      const res = await fetch(`${apiBase}/ai/qna`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageText, question }),
      });

      if (res.ok) {
        const json = await res.json();
        const answer = json.data?.answer || 'No direct answer found.';
        currentQnAData = { tab, question, answer };

        const formattedAnswer = typeof parseMarkdownToBlocks === 'function' && typeof renderBlock === 'function'
          ? parseMarkdownToBlocks(answer).map(renderBlock).join('')
          : (typeof renderInlineMarkdown === 'function' ? renderInlineMarkdown(answer) : escapeHtml(answer));

        qnaAnswerText.innerHTML = `
          <div class="qna-question-display">
            <span style="color:#FAFAFA;font-family:'JetBrains Mono',monospace;font-size:10px;text-transform:uppercase;display:block;margin-bottom:2px;">Question</span>
            ${escapeHtml(question)}
          </div>
          <div class="summary-section-card" style="margin-top:6px;">
            <span style="color:#FAFAFA;font-family:'JetBrains Mono',monospace;font-size:10px;text-transform:uppercase;display:block;margin-bottom:6px;">Grounded Answer</span>
            <div class="qna-answer-rendered" style="color:#D4D4D8;line-height:1.6;font-size:12.5px;">${formattedAnswer}</div>
          </div>
        `;
      } else {
        qnaAnswerText.textContent = 'Unable to answer question.';
      }
    } catch {
      qnaAnswerText.textContent = 'Q&A endpoint unavailable.';
    }
  }

  // Save Q&A Answer to Platform
  btnSaveQnA.addEventListener('click', async () => {
    if (!currentQnAData) return;
    const { tab, question, answer } = currentQnAData;

    const qnaTagInput = document.getElementById('qna-tag-input');
    const tagVal = qnaTagInput?.value.trim();
    const tags = tagVal ? [tagVal.replace(/^#/, '')] : ['qna'];
    const storage = await chrome.storage.local.get(['activeProjectId']);

    const payload = {
      projectId: storage.activeProjectId,
      type: 'note',
      title: `Q&A: ${question}`,
      content: {
        description: `Q: ${question}\n\nA: ${answer}`,
        markdownContent: `### Question\n${question}\n\n### Grounded Answer\n${answer}`,
      },
      metadata: {
        sourceUrl: tab.url,
        pageTitle: tab.title || 'Source',
        domainFavicon: `https://www.google.com/s2/favicons?domain=${new URL(tab.url).hostname}&sz=64`,
      },
      tags: tags,
    };

    chrome.runtime.sendMessage({ action: 'SAVE_ATOM', payload }, (res) => {
      btnSaveQnA.textContent = '✓ Sent to Platform!';
      btnSaveQnA.style.backgroundColor = '#10B981';
      btnSaveQnA.style.color = '#FFF';
      headerPushText.textContent = 'recent push: just now';
      showToast('Answer sent to timeline!');
      setTimeout(() => {
        btnSaveQnA.textContent = '+ Send Answer to Platform';
        btnSaveQnA.style.backgroundColor = '#27272A';
        btnSaveQnA.style.color = '#FAFAFA';
      }, 2500);
    });
  });

  async function renderProjectOptions() {
    projectListOptions.innerHTML = '<div style="color:#A1A1AA;padding:8px;font-size:11px;">Loading projects...</div>';
    let projects = DEFAULT_PROJECTS;
    const storage = await chrome.storage.local.get(['activeProjectId']);
    const currentActiveId = storage.activeProjectId;

    try {
      const apiBase = await getWorkingApiBase();
      const res = await fetch(`${apiBase}/projects`);
      if (res.ok) {
        const json = await res.json();
        if (json.data && json.data.length > 0) {
          projects = json.data.filter((p) => p.role !== 'viewer');
        }
      }
    } catch (e) {}

    projectListOptions.innerHTML = '';

    // Group parent and sub projects
    const parentProjects = [];
    const subMap = new Map();

    projects.forEach((p) => {
      if (p.id === 'all') return;
      if (!p.parentId) {
        parentProjects.push(p);
      } else {
        const list = subMap.get(p.parentId) || [];
        list.push(p);
        subMap.set(p.parentId, list);
      }
    });

    parentProjects.forEach((parentProj) => {
      const isParentActive = parentProj.id === currentActiveId;
      const parentOpt = document.createElement('div');
      parentOpt.className = `project-option parent-project-option ${isParentActive ? 'active-selected' : ''}`;
      parentOpt.innerHTML = `
        <span class="project-folder-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" fill-opacity="0.9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/></svg></span>
        <span class="option-text">${escapeHtml(parentProj.title)}</span>
      `;
      parentOpt.addEventListener('click', () => {
        selectProject(parentProj, null);
        projectPicker.classList.add('hidden');
      });
      projectListOptions.appendChild(parentOpt);

      const subProjects = subMap.get(parentProj.id) || [];
      if (subProjects.length === 0) return;
      const subGroup = document.createElement('div');
      subGroup.className = 'sub-project-group';
      subProjects.forEach((subProj) => {
        const isSubActive = subProj.id === currentActiveId;
        const subOpt = document.createElement('div');
        subOpt.className = `project-option sub-project-option ${isSubActive ? 'active-selected' : ''}`;
        subOpt.innerHTML = `<span class="option-text">${escapeHtml(subProj.title)}</span>`;
        subOpt.addEventListener('click', () => {
          selectProject(subProj, parentProj);
          projectPicker.classList.add('hidden');
        });
        subGroup.appendChild(subOpt);
      });
      projectListOptions.appendChild(subGroup);
    });
  }

  function selectProject(proj, parentProj = null) {
    const parentTitle = parentProj?.title || '';
    chrome.storage.local.set({
      activeProjectId: proj.id,
      activeProjectTitle: proj.title,
      activeProjectDesc: proj.description || '',
      activeProjectColor: proj.color_badge || proj.color || '#325FEC',
      activeParentTitle: parentTitle,
    });
    updateProjectDisplay(proj, parentTitle);
    showToast(`Set project: ${proj.title}`);
  }

  function updateProjectDisplay(proj, parentTitle = '') {
    projectTitle.textContent = proj.title;
    if (parentTitle) {
      projectDesc.textContent = `${parentTitle} • Sub-project`;
    } else {
      projectDesc.textContent = proj.description || 'Active research destination';
    }
    const color = proj.color_badge || proj.color || '#325FEC';
    projectAvatar.style.backgroundColor = color;
    projectAvatarChar.textContent = proj.title.substring(0, 2).toUpperCase();
  }

  function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove('hidden');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => {
      toast.classList.add('hidden');
    }, 3000);
  }

  function formatTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }
});
