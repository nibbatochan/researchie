(() => {
  if (window.__RESEARCHIE_INJECTED__) return;
  window.__RESEARCHIE_INJECTED__ = true;

  let hostEl = document.getElementById('researchie-host');
  if (!hostEl) {
    hostEl = document.createElement('div');
    hostEl.id = 'researchie-host';
    hostEl.style.cssText = 'position: fixed; top: 0; left: 0; width: 0; height: 0; pointer-events: none; z-index: 2147483647; overflow: visible;';
    document.documentElement.appendChild(hostEl);
  }

  function ensureHostAttached() {
    if (!hostEl || !hostEl.parentNode) {
      if (!hostEl) {
        hostEl = document.createElement('div');
        hostEl.id = 'researchie-host';
        hostEl.style.cssText = 'position: fixed; top: 0; left: 0; width: 0; height: 0; pointer-events: none; z-index: 2147483647; overflow: visible;';
      }
      document.documentElement.appendChild(hostEl);
    }
  }

  const shadow = hostEl.shadowRoot || hostEl.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `
    * {
      box-sizing: border-box;
      font-family: 'Figtree', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .selection-container {
      position: fixed;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      z-index: 2147483647;
      animation: popIn 0.15s cubic-bezier(0.16, 1, 0.3, 1);
      pointer-events: auto !important;
      user-select: none;
      background: #09090B;
      border: 1px solid #27272A;
      border-radius: 9999px;
      padding: 3px 6px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.08);
    }
    .selection-arrow-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: transparent;
      color: #FAFAFA;
      padding: 3px 7px;
      border-radius: 9999px;
      border: none;
      cursor: pointer;
      font-size: 11px;
      font-weight: 600;
      transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
      overflow: hidden;
      white-space: nowrap;
    }
    .selection-arrow-btn .btn-label {
      display: inline-block;
      max-width: 0;
      opacity: 0;
      overflow: hidden;
      white-space: nowrap;
      transition: max-width 0.18s ease-out, opacity 0.15s ease-out;
      color: #FAFAFA;
      font-size: 11px;
      font-weight: 600;
    }
    .selection-arrow-btn:hover {
      background: #18181B;
    }
    .selection-arrow-btn:hover .btn-label {
      max-width: 100px;
      opacity: 1;
      margin-left: 2px;
    }
    .arrow-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      color: #FAFAFA;
      flex-shrink: 0;
    }
    .selection-divider {
      width: 1px;
      height: 14px;
      background: #27272A;
    }
    .selection-tag-trigger {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      background: transparent;
      color: #A1A1AA;
      border-radius: 9999px;
      border: none;
      cursor: pointer;
      font-family: 'Figtree', sans-serif;
      font-size: 11px;
      font-weight: 600;
      padding: 3px 7px;
      transition: all 0.15s ease;
    }
    .selection-tag-trigger:hover {
      background: #18181B;
      color: #FAFAFA;
    }
    .selection-tag-form {
      display: none;
      align-items: center;
      gap: 4px;
      background: transparent;
      padding: 1px 2px 1px 6px;
    }
    .selection-tag-form.active {
      display: inline-flex;
    }
    .selection-tag-input {
      background: #121214;
      border: 1px solid #27272A;
      border-radius: 6px;
      color: #FAFAFA;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      outline: none;
      width: 180px;
      padding: 3px 7px;
      pointer-events: auto !important;
      user-select: text !important;
    }
    .selection-tag-input:focus {
      border-color: #52525B;
    }
    .selection-tag-input::placeholder {
      color: #71717A;
    }
    .selection-tag-submit {
      background: #27272A;
      border: 1px solid #3F3F46;
      color: #FAFAFA;
      border-radius: 9999px;
      padding: 3px 9px;
      font-size: 10.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }
    .selection-tag-submit:hover {
      background: #3F3F46;
    }
    .selection-tag-cancel {
      background: transparent;
      color: #71717A;
      border: none;
      cursor: pointer;
      padding: 2px 4px;
      font-size: 11px;
      line-height: 1;
      border-radius: 4px;
    }
    .selection-tag-cancel:hover {
      color: #FAFAFA;
      background: #18181B;
    }
    .researchie-toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      display: flex;
      align-items: center;
      gap: 10px;
      background: #121214;
      color: #FAFAFA;
      padding: 8px 14px;
      border-radius: 8px;
      border: 1px solid #27272A;
      border-left: 3px solid #FAFAFA;
      box-shadow: 0 10px 30px rgba(0,0,0,0.6);
      font-size: 12px;
      font-weight: 500;
      pointer-events: auto;
      z-index: 2147483647;
      animation: slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .undo-btn {
      background: #18181B;
      border: 1px solid #27272A;
      color: #FAFAFA;
      font-family: monospace;
      font-size: 10px;
      font-weight: bold;
      padding: 2px 7px;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.15s;
      margin-left: 2px;
    }
    .undo-btn:hover {
      background: #27272A;
    }
    @keyframes popIn {
      from { opacity: 0; transform: scale(0.8); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  shadow.appendChild(style);

  let currentBtn = null;
  let activeSelectedText = '';
  let isTagFormOpen = false;
  let isMouseInsidePill = false;
  let isExtensionEnabled = true;

  // Sync Extension On/Off State
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['extensionEnabled'], (res) => {
      if (typeof res?.extensionEnabled === 'boolean') {
        isExtensionEnabled = res.extensionEnabled;
      }
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.extensionEnabled !== undefined) {
        isExtensionEnabled = changes.extensionEnabled.newValue !== false;
        if (!isExtensionEnabled) {
          forceRemoveButton();
        }
      }
    });
  }

  function normalizeTextForMatching(text) {
    return (text || '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/^###?\s+/gm, '')
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/[—–]/g, '-')
      .replace(/^["'“‘\s]+|["'”’\s]+$/g, '')
      .trim();
  }

  function htmlToStructuredMarkdown(node) {
    if (!node) return '';

    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    const tagName = node.tagName.toUpperCase();

    // Preserve line break
    if (tagName === 'BR') {
      return '\n';
    }

    // Detect bold text weights (strong, b, or font-weight >= 600)
    let isBold = false;
    let isItalic = false;

    if (['STRONG', 'B'].includes(tagName)) {
      isBold = true;
    } else {
      try {
        const computed = window.getComputedStyle(node);
        const fw = computed.fontWeight;
        if (fw === 'bold' || fw === '700' || fw === '800' || fw === '900' || parseInt(fw, 10) >= 600) {
          isBold = true;
        }
        if (computed.fontStyle === 'italic') {
          isItalic = true;
        }
      } catch {}
    }

    let childrenText = '';
    for (let i = 0; i < node.childNodes.length; i++) {
      childrenText += htmlToStructuredMarkdown(node.childNodes[i]);
    }

    if (!childrenText.trim()) {
      return '';
    }

    let result = childrenText;
    if (isBold && !result.startsWith('**') && !result.endsWith('**')) {
      result = `**${result.trim()}**`;
    } else if (isItalic && !result.startsWith('*') && !result.endsWith('*')) {
      result = `*${result.trim()}*`;
    }

    // Preserve block-level spacing & line skips
    if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(tagName)) {
      return `\n\n### ${result.trim()}\n\n`;
    }
    if (['P', 'BLOCKQUOTE', 'SECTION', 'ARTICLE'].includes(tagName)) {
      return `\n\n${result.trim()}\n\n`;
    }
    if (tagName === 'LI') {
      return `\n- ${result.trim()}`;
    }
    if (tagName === 'DIV') {
      return `\n${result}\n`;
    }

    return result;
  }

  function extractFormattedTextFromSelection(selection) {
    if (!selection || selection.rangeCount === 0) return '';
    try {
      const range = selection.getRangeAt(0);
      const cloned = range.cloneContents();
      const container = document.createElement('div');
      container.appendChild(cloned);

      const structured = htmlToStructuredMarkdown(container);
      if (structured && structured.trim().length > 0) {
        return structured
          .replace(/[ \t]+\n/g, '\n')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
      }
    } catch (e) {
      console.warn('Formatted selection extraction failed, fallback to plain:', e);
    }
    return (selection ? selection.toString() : '').trim();
  }

  function encodeFragmentComponent(str) {
    const sanitized = (str || '')
      .replace(/^[^a-zA-Z0-9]+/, '')
      .replace(/[^a-zA-Z0-9]+$/, '')
      .trim();
    const target = sanitized || str;
    return encodeURIComponent(target)
      .replace(/-/g, '%2D')
      .replace(/,/g, '%2C')
      .replace(/&/g, '%26')
      .replace(/\(/g, '%28')
      .replace(/\)/g, '%29');
  }

  // Reads the page's own DOI and PMID from its citation meta tags.
  // Bibliography tags (citation_reference) are skipped: they are secondary sources.
  // Matches src/lib/citations/identify.ts; plain JS here, so no import.
  function readPageIdentifiers() {
    const DOI_PATTERN = /10\.\d{4,9}\/[^\s"'<>]+/;
    const metas = Array.from(document.querySelectorAll('meta[name]'));
    const valueOf = (names) => {
      for (const meta of metas) {
        const name = (meta.getAttribute('name') || '').trim().toLowerCase();
        if (!names.includes(name)) continue;
        const content = (meta.getAttribute('content') || '').trim();
        if (content) return content;
      }
      return '';
    };

    let doi = '';
    for (const raw of [valueOf(['citation_doi']), valueOf(['dc.identifier', 'dc.identifier.doi'])]) {
      const match = raw.match(DOI_PATTERN);
      if (match) {
        doi = match[0].replace(/[.,;:]+$/, '');
        break;
      }
    }

    const pmid = valueOf(['citation_pmid']);
    return {
      doi: doi || undefined,
      pmid: /^\d+$/.test(pmid) ? pmid : undefined,
    };
  }

  // Page facts for a web-source citation. Used only when the page has no DOI or PMID.
  function readPageInfo() {
    const meta = (selector) => (document.querySelector(selector)?.getAttribute('content') || '').trim() || undefined;
    return {
      url: window.location.href,
      title: meta('meta[property="og:title"]') || document.title || undefined,
      siteName: meta('meta[property="og:site_name"]'),
      author: meta('meta[name="author"]') || meta('meta[property="article:author"]'),
      published: meta('meta[property="article:published_time"]') || meta('meta[name="date"]') || meta('meta[name="citation_publication_date"]'),
    };
  }

  function buildTextFragment(text) {
    const clean = normalizeTextForMatching(text);
    if (!clean) return '';
    const words = clean.split(' ').filter(Boolean);
    if (words.length <= 6) {
      return `#:~:text=${encodeFragmentComponent(clean)}`;
    }
    const start = words.slice(0, 4).join(' ');
    const end = words.slice(-4).join(' ');
    return `#:~:text=${encodeFragmentComponent(start)},${encodeFragmentComponent(end)}`;
  }

  function removeButton() {
    if (isTagFormOpen || isMouseInsidePill) return;
    if (currentBtn) {
      currentBtn.remove();
      currentBtn = null;
    }
  }

  function forceRemoveButton() {
    isTagFormOpen = false;
    isMouseInsidePill = false;
    if (currentBtn) {
      currentBtn.remove();
      currentBtn = null;
    }
  }

  function showToast(msg) {
    ensureHostAttached();
    const toast = document.createElement('div');
    toast.className = 'researchie-toast';
    toast.innerHTML = `
      <span style="color:#D2F83C;font-weight:bold;">●</span>
      <span>${msg}</span>
    `;
    shadow.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.transition = 'opacity 0.25s';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 250);
      }
    }, 2200);
  }

  function showToastWithUndo(message, atomId) {
    ensureHostAttached();
    const toast = document.createElement('div');
    toast.className = 'researchie-toast';
    let secondsLeft = 3;

    toast.innerHTML = `
      <span style="color:#D2F83C;font-weight:bold;">✓</span>
      <span>${message}</span>
      ${atomId ? `<button class="undo-btn" id="toast-undo">Undo (${secondsLeft}s)</button>` : ''}
    `;
    shadow.appendChild(toast);

    let countdown = null;
    if (atomId) {
      const undoBtn = toast.querySelector('#toast-undo');
      countdown = setInterval(() => {
        secondsLeft -= 1;
        if (secondsLeft > 0 && undoBtn) {
          undoBtn.textContent = `Undo (${secondsLeft}s)`;
        } else {
          clearInterval(countdown);
        }
      }, 1000);

      undoBtn?.addEventListener('click', async (evt) => {
        evt.stopPropagation();
        clearInterval(countdown);
        try {
          const result = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: 'DELETE_ATOM', atomId }, (res) => resolve(res || { success: false }));
          });
          if (!result.success) throw new Error('delete failed');
          toast.innerHTML = `<span style="color:#8B949E;">Undo successful — removed from timeline.</span>`;
          setTimeout(() => toast.remove(), 1000);
        } catch {
          toast.innerHTML = `<span style="color:#F85149;">Could not undo. Delete it from the timeline.</span>`;
          setTimeout(() => toast.remove(), 2500);
        }
      });
    }

    setTimeout(() => {
      if (countdown) clearInterval(countdown);
      if (toast.parentNode) {
        toast.style.transition = 'opacity 0.25s, transform 0.25s';
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(6px)';
        setTimeout(() => toast.remove(), 250);
      }
    }, 3500);
  }

  function extractSurroundingContext(selection) {
    if (!selection || selection.rangeCount === 0) {
      return { contextPrefix: '', contextSuffix: '', surroundingParagraphs: [] };
    }
    try {
      const range = selection.getRangeAt(0);
      let container = range.commonAncestorContainer;
      if (container.nodeType === Node.TEXT_NODE) {
        container = container.parentElement;
      }

      // Find enclosing block or section
      let block = container;
      while (block && block !== document.body && !['P', 'ARTICLE', 'SECTION', 'DIV', 'LI', 'BLOCKQUOTE'].includes(block.tagName)) {
        block = block.parentElement;
      }
      if (!block) block = container;

      const parentSection = block.parentElement || block;
      const allParas = Array.from(parentSection.querySelectorAll('p, blockquote, li, div'))
        .map((p) => p.innerText.replace(/\s+/g, ' ').trim())
        .filter((t) => t.length > 25);

      const uniqueParas = [...new Set(allParas)];
      const selectedText = selection.toString().trim();
      
      const foundIdx = uniqueParas.findIndex((p) => p.includes(selectedText.slice(0, 30)));
      
      let contextPrefix = '';
      let contextSuffix = '';
      let surroundingParagraphs = [];

      if (foundIdx !== -1) {
        const start = Math.max(0, foundIdx - 1);
        const end = Math.min(uniqueParas.length, foundIdx + 2);
        surroundingParagraphs = uniqueParas.slice(start, end);
        if (foundIdx > 0) {
          contextPrefix = uniqueParas[foundIdx - 1];
        }
        if (foundIdx < uniqueParas.length - 1) {
          contextSuffix = uniqueParas[foundIdx + 1];
        }
      } else {
        const fullBlockText = block.innerText || '';
        const idx = fullBlockText.indexOf(selectedText);
        if (idx !== -1) {
          contextPrefix = fullBlockText.substring(Math.max(0, idx - 250), idx).trim();
          contextSuffix = fullBlockText.substring(idx + selectedText.length, Math.min(fullBlockText.length, idx + selectedText.length + 250)).trim();
        }
        surroundingParagraphs = [contextPrefix, selectedText, contextSuffix].filter(Boolean);
      }

      return {
        contextPrefix,
        contextSuffix,
        surroundingParagraphs,
      };
    } catch (e) {
      return { contextPrefix: '', contextSuffix: '', surroundingParagraphs: [] };
    }
  }

  async function saveCurrentSelection(text, tags = []) {
    const cleanText = (text || activeSelectedText || extractFormattedTextFromSelection(window.getSelection())).trim();
    if (!cleanText) return;

    const userTag = tags.length > 0 ? tags[0] : '';
    const context = extractSurroundingContext(window.getSelection());
    let activeProjId = 'proj-ai-main';
    let activeProjTitle = 'Active Project';

    try {
      if (chrome.storage && chrome.storage.local) {
        const stored = await chrome.storage.local.get(['activeProjectId', 'activeProjectTitle']);
        if (stored.activeProjectId) {
          activeProjId = stored.activeProjectId;
          activeProjTitle = stored.activeProjectTitle || activeProjTitle;
        }
      }
    } catch {}

    const payload = {
      projectId: activeProjId,
      type: 'quote',
      title: userTag ? `#${userTag}` : (document.title || 'Web Selection'),
      content: {
        rawText: cleanText,
        text: cleanText,
        surroundingParagraphs: context.surroundingParagraphs,
      },
      metadata: {
        sourceUrl: window.location.href,
        pageTitle: document.title,
        scrollToTextFragment: buildTextFragment(cleanText),
        textFragment: buildTextFragment(cleanText),
        domainFavicon: `https://www.google.com/s2/favicons?domain=${window.location.hostname}&sz=64`,
        contextPrefix: context.contextPrefix,
        contextSuffix: context.contextSuffix,
        surroundingParagraphs: context.surroundingParagraphs,
        pageIdentifiers: readPageIdentifiers(),
        pageInfo: readPageInfo(),
      },
      tags: tags.length > 0 ? tags : undefined,
    };

    forceRemoveButton();

    // Dual-Path Execution: Try Chrome Runtime message first, with direct fetch fallback
    let sentViaRuntime = false;
    try {
      if (chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ action: 'SAVE_ATOM', payload }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn('Runtime message warning, falling back to direct API:', chrome.runtime.lastError);
            directFetchFallback(payload);
          } else {
            const atomId = response?.data?.id;
            const projTitle = response?.projectTitle || activeProjTitle;
            showToastWithUndo(`Sent quote to ${projTitle}`, atomId);
          }
        });
        sentViaRuntime = true;
      }
    } catch (e) {
      console.warn('Direct fetch fallback triggered:', e);
    }

    if (!sentViaRuntime) {
      await directFetchFallback(payload);
    }
  }

  async function directFetchFallback(payload) {
    const candidatePorts = [3001, 3000, 3002];
    for (const port of candidatePorts) {
      try {
        const res = await fetch(`http://localhost:${port}/api/atoms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          showToastWithUndo(`Sent quote to timeline`, data?.data?.id);
          return;
        }
      } catch {}
    }
    showToast('Sent quote (queued for sync)');
  }

  function checkSelectionAndRender() {
    if (!isExtensionEnabled || isTagFormOpen) return;
    ensureHostAttached();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      removeButton();
      return;
    }

    const text = extractFormattedTextFromSelection(selection);
    if (text.length < 2) {
      removeButton();
      return;
    }

    const range = selection.getRangeAt(0);
    const rects = range.getClientRects();
    const targetRect = rects.length > 0 ? rects[rects.length - 1] : range.getBoundingClientRect();

    if (!targetRect || (targetRect.width === 0 && targetRect.height === 0)) {
      return;
    }

    activeSelectedText = text;
    forceRemoveButton();

    const container = document.createElement('div');
    container.className = 'selection-container';

    container.innerHTML = `
      <div class="selection-arrow-btn" id="pill-arrow-btn" title="Send to project">
        <span class="arrow-icon">
          <svg width="13" height="13" viewBox="0 0 256 256" fill="currentColor">
            <path d="M200,64V168a8,8,0,0,1-16,0V83.31L69.66,197.66a8,8,0,0,1-11.32-11.32L172.69,72H88a8,8,0,0,1,0-16H192A8,8,0,0,1,200,64Z"/>
          </svg>
        </span>
        <span class="btn-label">Send</span>
      </div>
      <div class="selection-divider" id="pill-divider"></div>
      <button class="selection-tag-trigger" id="pill-tag-trigger" title="Add tag and send">+ Tag</button>
      <div class="selection-tag-form" id="pill-tag-form">
        <input class="selection-tag-input" id="pill-tag-input" placeholder="Tag (e.g. pricing)" autocomplete="off" spellcheck="false" />
        <button class="selection-tag-submit" id="pill-tag-submit">Send</button>
        <button class="selection-tag-cancel" id="pill-tag-cancel" title="Cancel">✕</button>
      </div>
    `;

    // Position at the exact end of the last selected line
    let top = targetRect.bottom + 4;
    let left = targetRect.right + 4;

    // Viewport overflow bounds check
    if (top + 36 > window.innerHeight) {
      top = targetRect.top - 34;
    }
    if (top < 8) top = 8;
    if (left + 260 > window.innerWidth) {
      left = window.innerWidth - 265;
    }
    if (left < 8) left = 8;

    container.style.top = `${Math.round(top)}px`;
    container.style.left = `${Math.round(left)}px`;

    const arrowBtn = container.querySelector('#pill-arrow-btn');
    const divider = container.querySelector('#pill-divider');
    const tagTrigger = container.querySelector('#pill-tag-trigger');
    const tagForm = container.querySelector('#pill-tag-form');
    const tagInput = container.querySelector('#pill-tag-input');
    const tagSubmit = container.querySelector('#pill-tag-submit');
    const tagCancel = container.querySelector('#pill-tag-cancel');

    // Track mouse over pill to prevent selectionchange from closing it prematurely
    container.addEventListener('mouseenter', () => {
      isMouseInsidePill = true;
    });
    container.addEventListener('mouseleave', () => {
      isMouseInsidePill = false;
    });

    // Prevent clicks inside container from collapsing selection unexpectedly or bubbling to host
    container.addEventListener('mousedown', (e) => {
      e.stopPropagation();
    });
    container.addEventListener('mouseup', (e) => {
      e.stopPropagation();
    });
    container.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // Fast 1-click send without tag
    const handleQuickSend = (evt) => {
      if (evt) {
        evt.preventDefault();
        evt.stopPropagation();
      }
      const textToSave = activeSelectedText || text;
      saveCurrentSelection(textToSave, []);
    };

    arrowBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    arrowBtn.addEventListener('click', handleQuickSend);

    // Prevent mousedown on tag trigger from triggering host selection collapses
    tagTrigger.addEventListener('mousedown', (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
    });

    // Expand tag form on '# Tag' click
    tagTrigger.addEventListener('click', (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      isTagFormOpen = true;
      arrowBtn.style.display = 'none';
      divider.style.display = 'none';
      tagTrigger.style.display = 'none';
      tagForm.classList.add('active');
      setTimeout(() => {
        tagInput.focus();
        tagInput.select();
      }, 20);
    });

    const handleTaggedSend = (evt) => {
      if (evt) {
        evt.preventDefault();
        evt.stopPropagation();
      }
      const textToSave = activeSelectedText || text;
      const tagVal = tagInput.value.trim().replace(/^#/, '');
      const tags = tagVal ? [tagVal] : [];
      saveCurrentSelection(textToSave, tags);
    };

    tagSubmit.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    tagSubmit.addEventListener('click', handleTaggedSend);

    tagCancel.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    tagCancel.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      forceRemoveButton();
    });

    // Ensure keystrokes inside tag input are never swallowed or intercepted by host page
    tagInput.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        e.preventDefault();
        handleTaggedSend(e);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        forceRemoveButton();
      }
    });
    tagInput.addEventListener('keyup', (e) => e.stopPropagation());
    tagInput.addEventListener('keypress', (e) => e.stopPropagation());
    tagInput.addEventListener('input', (e) => e.stopPropagation());
    tagInput.addEventListener('mousedown', (e) => e.stopPropagation());
    tagInput.addEventListener('mouseup', (e) => e.stopPropagation());
    tagInput.addEventListener('click', (e) => e.stopPropagation());

    shadow.appendChild(container);
    currentBtn = container;
  }

  // Window click to dismiss only when clicking outside
  document.addEventListener('mousedown', (e) => {
    if (isMouseInsidePill) return;
    if (e.target && hostEl && (e.target === hostEl || hostEl.contains(e.target))) return;
    if (isTagFormOpen || currentBtn) {
      forceRemoveButton();
    }
  });

  window.addEventListener('mouseup', (e) => {
    if (!isExtensionEnabled || isTagFormOpen || isMouseInsidePill) return;
    if (e.target && hostEl && (e.target === hostEl || hostEl.contains(e.target))) return;
    setTimeout(checkSelectionAndRender, 20);
  });

  document.addEventListener('selectionchange', () => {
    if (!isExtensionEnabled || isTagFormOpen || isMouseInsidePill) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      removeButton();
    }
  });

  // ALL 4 Shortcuts directly in-page with capture phase & debounce
  let lastShortcutTime = 0;
  const handleGlobalShortcut = (e) => {
    if (isExtensionEnabled === false) return;
    if (!e.altKey && !e.metaKey) return;

    const key = (e.key || '').toLowerCase();
    const code = e.code || '';

    if (key === 's' || code === 'KeyS') {
      e.preventDefault();
      e.stopPropagation();
      const selection = window.getSelection();
      const text = selection ? extractFormattedTextFromSelection(selection) : '';
      if (text.length >= 2) {
        saveCurrentSelection(text);
      } else {
        showToast('Select text first to send (Alt+S)');
      }
    } else if (key === 'b' || code === 'KeyB') {
      e.preventDefault();
      e.stopPropagation();
      window.dispatchEvent(new CustomEvent('RESEARCHIE_TRIGGER_BLOCK_PICKER'));
    } else if (key === 'l' || code === 'KeyL') {
      e.preventDefault();
      e.stopPropagation();
      saveCurrentPageLink();
    } else if (key === 'i' || code === 'KeyI') {
      e.preventDefault();
      e.stopPropagation();
      window.dispatchEvent(new CustomEvent('RESEARCHIE_TRIGGER_IMAGE_SELECTOR'));
    } else if (key === 'c' || code === 'KeyC') {
      e.preventDefault();
      e.stopPropagation();
      window.dispatchEvent(new CustomEvent('RESEARCHIE_TRIGGER_IMAGE_CROPPER'));
    } else if (key === 'p' || code === 'KeyP') {
      e.preventDefault();
      e.stopPropagation();
      const now = Date.now();
      if (now - lastShortcutTime < 300) return;
      lastShortcutTime = now;
      if (typeof window.__RESEARCHIE_TOGGLE_DRAWER__ === 'function') {
        window.__RESEARCHIE_TOGGLE_DRAWER__();
      } else {
        window.dispatchEvent(new CustomEvent('RESEARCHIE_TRIGGER_QNA_DRAWER'));
      }
    }
  };

  async function saveCurrentPageLink() {
    let activeProjId = 'proj-ai-main';
    let activeProjTitle = 'Active Project';
    try {
      if (chrome.storage && chrome.storage.local) {
        const stored = await chrome.storage.local.get(['activeProjectId', 'activeProjectTitle']);
        if (stored.activeProjectId) {
          activeProjId = stored.activeProjectId;
          activeProjTitle = stored.activeProjectTitle || activeProjTitle;
        }
      }
    } catch {}

    const payload = {
      projectId: activeProjId,
      type: 'link',
      title: document.title || 'Saved Page Link',
      content: {
        targetUrl: window.location.href,
        description: `Saved from ${window.location.hostname}`,
      },
      metadata: {
        sourceUrl: window.location.href,
        pageTitle: document.title,
        domainFavicon: `https://www.google.com/s2/favicons?domain=${window.location.hostname}&sz=64`,
        pageIdentifiers: readPageIdentifiers(),
        pageInfo: readPageInfo(),
      },
      tags: ['web-link', window.location.hostname.replace(/\..+$/, '')],
    };

    if (chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ action: 'SAVE_ATOM', payload }, (response) => {
        const atomId = response?.data?.id;
        showToastWithUndo(`Saved link to ${activeProjTitle} (Alt+L)`, atomId);
      });
    } else {
      directFetchFallback(payload);
    }
  }

  window.addEventListener('keydown', handleGlobalShortcut, true);

  function extractPageData() {
    try {
      const title = document.title || 'Untitled Web Page';
      const url = window.location.href;
      const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || 
                              document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';
      
      const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
        .map(h => h.textContent.trim())
        .filter(t => t.length > 2 && t.length < 200)
        .slice(0, 15);

      // Clone body to strip clutter without modifying the live DOM
      const clone = document.body.cloneNode(true);
      const toRemove = clone.querySelectorAll('script, style, noscript, nav, header, footer, svg, iframe, form, button, [aria-hidden="true"]');
      toRemove.forEach(el => el.remove());

      const paragraphs = Array.from(clone.querySelectorAll('p, article, section, li, blockquote'))
        .map(p => p.textContent.replace(/\s+/g, ' ').trim())
        .filter(t => t.length > 30);

      const uniqueParas = [...new Set(paragraphs)];
      const mainContent = uniqueParas.join('\n\n').slice(0, 25000);
      const selection = window.getSelection()?.toString().trim() || '';

      return {
        title,
        url,
        metaDescription,
        headings,
        keyParagraphs: uniqueParas.slice(0, 10),
        mainContent: mainContent || document.body.innerText.slice(0, 15000),
        selectedText: selection,
        wordCount: mainContent ? mainContent.split(/\s+/).length : 0,
      };
    } catch (err) {
      console.warn('Failed to extract page data:', err);
      return {
        title: document.title || 'Web Page',
        url: window.location.href,
        mainContent: document.body?.innerText?.slice(0, 10000) || '',
        headings: [],
        keyParagraphs: [],
        wordCount: 0,
      };
    }
  }

  // --- IMAGE SELECTOR ENGINE ---
  let isImageSelectorActive = false;
  let imageSelectorOverlay = null;

  function injectImageSelectorStyles() {
    if (document.getElementById('researchie-img-selector-styles')) return;
    const styleEl = document.createElement('style');
    styleEl.id = 'researchie-img-selector-styles';
    styleEl.textContent = `
      .researchie-img-hover {
        outline: 4px solid #D2F83C !important;
        outline-offset: -4px !important;
        cursor: crosshair !important;
        opacity: 0.8 !important;
        transition: all 0.2s ease !important;
      }
    `;
    (document.head || document.documentElement).appendChild(styleEl);
  }

  function startImageSelector() {
    if (isImageSelectorActive) return;
    isImageSelectorActive = true;
    
    injectImageSelectorStyles();

    ensureHostAttached();
    imageSelectorOverlay = document.createElement('div');
    imageSelectorOverlay.style.cssText = 'position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: #121214; color: #FAFAFA; padding: 10px 20px; border-radius: 9999px; border: 1px solid #27272A; z-index: 2147483647; font-size: 14px; font-weight: 500; pointer-events: none; box-shadow: 0 4px 12px rgba(0,0,0,0.5); font-family: Figtree, -apple-system, sans-serif;';
    imageSelectorOverlay.innerHTML = `<span style="color:#D2F83C; margin-right:8px;">●</span>Click an image to capture (Esc to cancel)`;
    shadow.appendChild(imageSelectorOverlay);

    document.documentElement.style.cursor = 'crosshair';

    document.addEventListener('mouseover', handleImageHover, true);
    document.addEventListener('mouseout', handleImageOut, true);
    document.addEventListener('click', handleImageClick, true);
    document.addEventListener('keydown', handleImageEsc, true);
  }

  function stopImageSelector() {
    if (!isImageSelectorActive) return;
    isImageSelectorActive = false;
    
    if (imageSelectorOverlay) {
      imageSelectorOverlay.remove();
      imageSelectorOverlay = null;
    }
    
    document.documentElement.style.cursor = '';
    
    const highlighted = document.querySelectorAll('.researchie-img-hover');
    highlighted.forEach(img => img.classList.remove('researchie-img-hover'));

    document.removeEventListener('mouseover', handleImageHover, true);
    document.removeEventListener('mouseout', handleImageOut, true);
    document.removeEventListener('click', handleImageClick, true);
    document.removeEventListener('keydown', handleImageEsc, true);
  }

  function handleImageHover(e) {
    if (e.target && e.target.tagName === 'IMG') {
      e.target.classList.add('researchie-img-hover');
    }
  }

  function handleImageOut(e) {
    if (e.target && e.target.tagName === 'IMG') {
      e.target.classList.remove('researchie-img-hover');
    }
  }

  function handleImageEsc(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      stopImageSelector();
    }
  }

  async function handleImageClick(e) {
    if (!e.target || e.target.tagName !== 'IMG') {
      if (hostEl && !hostEl.contains(e.target)) {
        e.preventDefault();
        e.stopPropagation();
        stopImageSelector();
      }
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    const img = e.target;
    const src = img.src;
    const alt = img.alt || '';
    const naturalWidth = img.naturalWidth || img.width || 0;
    const naturalHeight = img.naturalHeight || img.height || 0;
    
    stopImageSelector();
    
    const payload = {
      type: 'image',
      title: document.title || 'Web Image',
      content: {
        imageUrl: src,
        altText: alt,
        naturalWidth: naturalWidth,
        naturalHeight: naturalHeight,
      },
      metadata: {
        sourceUrl: window.location.href,
        pageTitle: document.title,
        domainFavicon: `https://www.google.com/s2/favicons?domain=${window.location.hostname}&sz=64`,
      }
    };
    
    let sentViaRuntime = false;
    try {
      if (chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ action: 'SAVE_ATOM', payload }, (response) => {
          if (chrome.runtime.lastError) {
            directFetchFallback(payload);
          } else {
            showToastWithUndo('Saved image to project', response?.data?.id);
          }
        });
        sentViaRuntime = true;
      }
    } catch (err) {}
    
    if (!sentViaRuntime) {
      await directFetchFallback(payload);
    }
  }

  window.addEventListener('RESEARCHIE_TRIGGER_IMAGE_SELECTOR', () => {
    startImageSelector();
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'SAVE_SELECTION_TRIGGERED') {
      const selection = window.getSelection();
      const text = selection ? extractFormattedTextFromSelection(selection) : message.selectionText;
      if (text) {
        saveCurrentSelection(text);
        sendResponse({ success: true });
      }
    } else if (message.action === 'EXTRACT_PAGE_CONTENT') {
      const pageData = extractPageData();
      sendResponse({ success: true, data: pageData });
    } else if (message.action === 'GET_CURRENT_SELECTION') {
      const selection = window.getSelection()?.toString().trim() || '';
      sendResponse({ selection });
    } else if (message.action === 'TRIGGER_IMAGE_SELECTOR') {
      startImageSelector();
      sendResponse({ success: true });
    }
  });

  // Seamless Web App ↔ Extension Sync: When user selects a project in web dashboard, sync to extension storage
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'RESEARCHIE_SET_ACTIVE_PROJECT') {
      const { projectId, projectTitle, projectDesc, projectColor } = event.data;
      if (projectId && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({
          activeProjectId: projectId,
          activeProjectTitle: projectTitle || 'Active Project',
          activeProjectDesc: projectDesc || '',
          activeProjectColor: projectColor || '#325FEC',
        });
      }
    }
  });

  // --- UNIVERSAL IN-SITU AUTO-SCROLL & SPOTLIGHT ENGINE ---

  function injectSpotlightStyles() {
    if (document.getElementById('researchie-spotlight-styles')) return;
    const styleEl = document.createElement('style');
    styleEl.id = 'researchie-spotlight-styles';
    styleEl.textContent = `
      @keyframes researchieSpotlightPulse {
        0% { background-color: rgba(81, 143, 255, 0.4); box-shadow: 0 0 0 4px rgba(81, 143, 255, 0.35); }
        50% { background-color: rgba(210, 248, 60, 0.4); box-shadow: 0 0 0 7px rgba(210, 248, 60, 0.3); }
        100% { background-color: rgba(81, 143, 255, 0.25); box-shadow: 0 0 0 3px rgba(81, 143, 255, 0.2); }
      }
      .researchie-quote-spotlight {
        animation: researchieSpotlightPulse 1.8s ease-in-out infinite alternate !important;
        background-color: rgba(81, 143, 255, 0.3) !important;
        border-radius: 4px !important;
        outline: 2px solid #518FFF !important;
        outline-offset: 2px !important;
        transition: all 0.3s ease !important;
      }
      .researchie-quote-badge {
        position: absolute;
        top: -24px;
        left: 0;
        background: #0A0E15;
        color: #518FFF;
        font-family: 'Figtree', sans-serif;
        font-size: 11px;
        font-weight: 600;
        padding: 2px 8px;
        border-radius: 9999px;
        border: 1px solid rgba(81, 143, 255, 0.5);
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        z-index: 2147483647;
        pointer-events: none;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
    `;
    (document.head || document.documentElement).appendChild(styleEl);
  }

  let hasPerformedAutoScroll = false;

  function performAutoScrollAndSpotlight() {
    if (hasPerformedAutoScroll) return;

    const rawHash = window.location.hash || '';
    const searchParams = new URLSearchParams(window.location.search);
    const customQuoteParam = searchParams.get('researchie_quote') || searchParams.get('quote') || '';

    let textTarget = '';
    if (rawHash.includes(':~:text=')) {
      const match = rawHash.match(/:~:text=([^&]+)/);
      if (match && match[1]) {
        try {
          textTarget = decodeURIComponent(match[1].replace(/%2D/gi, '-').replace(/%2C/gi, ',').replace(/%26/gi, '&'));
        } catch {
          textTarget = match[1];
        }
      }
    } else if (customQuoteParam) {
      textTarget = customQuoteParam;
    }

    if (!textTarget) return;

    let cleanTarget = textTarget;
    if (cleanTarget.includes('-,')) {
      cleanTarget = cleanTarget.split('-,')[1] || cleanTarget;
    }
    if (cleanTarget.includes(',-')) {
      cleanTarget = cleanTarget.split(',-')[0] || cleanTarget;
    }

    const parts = cleanTarget.split(',');
    const startQuery = normalizeTextForMatching(parts[0]);

    if (!startQuery || startQuery.length < 3) return;

    injectSpotlightStyles();

    // Walk document text nodes
    const walker = document.createTreeWalker(
      document.body || document.documentElement,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const tag = node.parentElement?.tagName;
          if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME'].includes(tag)) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let candidateNode = null;
    let node;
    const searchWords = startQuery.split(' ').slice(0, 4).join(' ');

    while ((node = walker.nextNode())) {
      const nodeText = normalizeTextForMatching(node.nodeValue);
      if (nodeText.includes(startQuery) || (searchWords && nodeText.includes(searchWords))) {
        candidateNode = node;
        break;
      }
    }

    if (candidateNode && candidateNode.parentElement) {
      const targetEl = candidateNode.parentElement;
      hasPerformedAutoScroll = true;

      // Smooth scroll directly to center
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });

      // Apply animated spotlight
      targetEl.classList.add('researchie-quote-spotlight');

      // Add badge
      const badge = document.createElement('div');
      badge.className = 'researchie-quote-badge';
      badge.innerHTML = `<span style="color:#D2F83C">●</span> Researchie Quote`;
      targetEl.style.position = targetEl.style.position === 'static' ? 'relative' : targetEl.style.position;
      targetEl.appendChild(badge);

      setTimeout(() => {
        targetEl.classList.remove('researchie-quote-spotlight');
        badge.style.transition = 'opacity 0.4s';
        badge.style.opacity = '0';
        setTimeout(() => badge.remove(), 400);
      }, 5000);
    }
  }

  if (typeof window !== 'undefined') {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      performAutoScrollAndSpotlight();
    } else {
      window.addEventListener('DOMContentLoaded', performAutoScrollAndSpotlight);
      window.addEventListener('load', performAutoScrollAndSpotlight);
    }

    window.addEventListener('hashchange', () => {
      hasPerformedAutoScroll = false;
      performAutoScrollAndSpotlight();
    });

    // Multi-interval retry for dynamic SPAs (Medium, React, Next.js, Substack)
    [200, 500, 1000, 2000, 3500].forEach((delay) => {
      setTimeout(() => {
        if (!hasPerformedAutoScroll) {
          performAutoScrollAndSpotlight();
        }
      }, delay);
    });
  }
})();
