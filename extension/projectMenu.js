// Shared in-page controls for the capture tools: the three-dot menu on the text pill, the "Set project" panel,
// and the one dialog the block, image and screenshot captures share. Plus the "not connected" prompt.
//
// "Set project" is a small label with the chosen project under it, highlighted. Opening it shows the project
// list the way the platform does: a project has a blue folder, a sub-project has no icon and hangs off a guide
// line under its project. Choosing a project sets the same active project the popup sets
// (chrome.storage.local), so both stay in step.
(() => {
  if (window.__RESEARCHIE_PROJECT_MENU__) return;

  const DEFAULT_DESTINATION = { id: 'proj-ai-main', title: 'Active Project', parentTitle: '' };

  // Simple outline icons (24 x 24, drawn with the current text color).
  const icon = (body, size = 14, extra = '') =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${body}</svg>`;
  const ICON = {
    dots: '<svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><circle cx="128" cy="60" r="16"/><circle cx="128" cy="128" r="16"/><circle cx="128" cy="196" r="16"/></svg>',
    folder: (s) => icon('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/>', s, 'fill="currentColor" fill-opacity="0.9"'),
    tag: (s) => icon('<path d="M3 12V4h8l10 10-8 8L3 12z"/><circle cx="7.5" cy="8.5" r="1.2" fill="currentColor"/>', s),
    chevronDown: (s) => icon('<path d="M6 9l6 6 6-6"/>', s),
  };

  // Styles are added to each tool's own shadow root, because the page's CSS cannot reach into it.
  const CSS = `
    .rm-menu-wrap { position: relative; display: inline-flex; align-items: center; }
    .rm-dots {
      display: inline-flex; align-items: center; justify-content: center;
      width: 22px; height: 22px; padding: 0; background: transparent; color: #A1A1AA;
      border: none; border-radius: 9999px; cursor: pointer; transition: all 0.15s ease;
    }
    .rm-dots:hover, .rm-dots[aria-expanded="true"] { background: #18181B; color: #FAFAFA; }

    .rm-popup {
      position: absolute; right: 0; width: 232px; z-index: 2147483647;
      background: #09090B; border: 1px solid #27272A; border-radius: 10px; padding: 4px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.85); font-size: 12px; color: #FAFAFA;
      font-family: 'Figtree', system-ui, sans-serif; text-align: left;
    }
    .rm-popup.rm-left { right: auto; left: 0; }
    .rm-popup[hidden] { display: none; }
    .rm-popup.rm-below { top: calc(100% + 8px); }
    .rm-popup.rm-above { bottom: calc(100% + 8px); }

    /* "Set project" in small type, with the chosen project under it, highlighted. */
    .rm-head { padding: 6px 8px 8px; border-bottom: 1px solid #1F1F23; margin-bottom: 4px; }
    .rm-head-label { display: block; font-size: 10px; font-weight: 500; color: #71717A; margin-bottom: 4px; }
    .rm-head-name {
      display: inline-block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      vertical-align: top; font-size: 11.5px; font-weight: 600; color: #9DBBFF;
      background: rgba(81,143,255,0.14); border-radius: 5px; padding: 2px 7px;
    }

    /* No scrollbar is drawn; the list still scrolls with the wheel or the keyboard. */
    .rm-list { max-height: 232px; overflow-y: auto; scrollbar-width: none; -ms-overflow-style: none; }
    .rm-list::-webkit-scrollbar { display: none; width: 0; height: 0; }
    .rm-item {
      display: flex; align-items: center; gap: 8px; width: 100%;
      background: transparent; border: 1px solid transparent; text-align: left; cursor: pointer;
      font-family: inherit; font-size: 12px; padding: 6px 8px; border-radius: 8px; color: #E4E4E7;
    }
    .rm-item:hover { background: #18181B; }
    .rm-item .rm-ico { display: inline-flex; flex-shrink: 0; }
    .rm-item .rm-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .rm-item[aria-checked="true"] { border-color: #518FFF; color: #FAFAFA; font-weight: 600; }
    /* Same look as the platform's project list: a project has the blue folder; a sub-project has no icon and
       hangs off a guide line under its project. */
    .rm-item.rm-top .rm-ico { color: #518FFF; }
    .rm-item.rm-top .rm-name { font-weight: 500; }
    .rm-item.rm-top[aria-checked="true"] .rm-name { font-weight: 600; }
    .rm-subs { margin: 2px 0 2px 12px; padding-left: 8px; border-left: 2px solid #27272A; }
    .rm-item.rm-subitem { font-size: 11.5px; color: #A1A1AA; padding: 5px 8px; border-radius: 6px; }
    .rm-item.rm-subitem:hover, .rm-item.rm-subitem[aria-checked="true"] { color: #FAFAFA; }
    .rm-note { color: #A1A1AA; padding: 8px; line-height: 1.4; }
    .rm-note .rm-connect-btn { margin-top: 6px; }

    .rm-connect-btn {
      display: inline-flex; align-items: center; background: #FAFAFA; color: #09090B; border: none;
      border-radius: 6px; padding: 4px 10px; font-size: 11px; font-weight: 700; cursor: pointer; font-family: inherit;
    }

    .rm-tooltip {
      position: absolute; left: 0; top: calc(100% + 8px); z-index: 2147483647; pointer-events: none;
      background: #18181B; color: #FAFAFA; border: 1px solid #27272A; border-radius: 6px;
      font-size: 11px; font-weight: 500; padding: 4px 8px; white-space: nowrap; max-width: 260px;
      overflow: hidden; text-overflow: ellipsis; box-shadow: 0 4px 12px rgba(0,0,0,0.6);
    }
    .rm-tooltip[hidden] { display: none; }

    /* The row on the block, image and screenshot dialogs: [Set project / name] [tag]. */
    .rm-dest { position: relative; display: flex; align-items: center; gap: 6px; margin-bottom: 10px; }
    .rm-chip {
      display: inline-flex; align-items: center; gap: 6px; min-height: 26px; padding: 0 8px;
      background: #18181B; border: 1px solid #27272A; border-radius: 6px; color: #D4D4D8; cursor: pointer;
      font-family: inherit; font-size: 11px; font-weight: 500; max-width: 100%; min-width: 0;
    }
    .rm-chip:hover, .rm-chip[aria-expanded="true"], .rm-chip[aria-pressed="true"] { background: #27272A; color: #FAFAFA; }
    .rm-chip-project { flex: 0 1 auto; min-width: 0; padding: 4px 8px; text-align: left; }
    .rm-chip-stack { display: flex; flex-direction: column; align-items: flex-start; min-width: 0; line-height: 1.2; }
    .rm-chip-label { font-size: 9.5px; font-weight: 500; color: #71717A; }
    .rm-chip-name { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11.5px; font-weight: 600; color: #9DBBFF; }
    .rm-chip-icon { width: 26px; padding: 0; justify-content: center; flex-shrink: 0; }

    /* One dialog look for the block, image and screenshot captures. */
    .rm-dialog {
      position: fixed; z-index: 2147483647; width: 272px; max-width: calc(100vw - 16px); box-sizing: border-box;
      background: #121214; border: 1px solid #27272A; border-radius: 12px; padding: 12px 14px; color: #FAFAFA;
      font-family: 'Figtree', system-ui, sans-serif; font-size: 12px; line-height: 1.35; text-align: left;
      box-shadow: 0 12px 36px rgba(0,0,0,0.8);
    }
    .rm-dialog *, .rm-dialog *::before, .rm-dialog *::after { box-sizing: border-box; }
    .rm-d-title { font-weight: 700; font-size: 12.5px; color: #FAFAFA; margin-bottom: 2px; }
    .rm-d-meta { color: #A1A1AA; font-size: 11px; margin-bottom: 10px; }
    .rm-d-preview {
      max-height: 80px; overflow: hidden; border-radius: 6px; margin-bottom: 10px; background: #09090B;
      border: 1px solid #27272A; display: flex; align-items: center; justify-content: center;
    }
    .rm-d-preview img { max-height: 80px; max-width: 100%; object-fit: contain; }
    .rm-d-field { margin-bottom: 10px; }
    .rm-tag-input {
      display: block; width: 100%; background: #18181B; border: none; border-radius: 6px; padding: 7px 9px;
      color: #FAFAFA; font-family: inherit; font-size: 11px; outline: none; box-shadow: none;
    }
    .rm-tag-input::placeholder { color: #71717A; }
    .rm-d-actions { display: flex; gap: 8px; justify-content: flex-end; }
    .rm-btn {
      background: #18181B; border: 1px solid #27272A; color: #FAFAFA; padding: 5px 12px; border-radius: 6px;
      font-family: inherit; font-size: 11px; font-weight: 500; cursor: pointer;
    }
    .rm-btn:hover { background: #27272A; }
    .rm-btn-primary { background: #FAFAFA; border-color: #FAFAFA; color: #09090B; font-weight: 700; }
    .rm-btn-primary:hover { background: #E4E4E7; }

    /* The prompt that appears when the extension is not connected. */
    .rm-connect-toast {
      position: fixed; right: 20px; bottom: 20px; z-index: 2147483647; display: flex; align-items: center; gap: 10px;
      max-width: 360px; background: #09090B; color: #FAFAFA; border: 1px solid #3F3F46; border-radius: 10px;
      padding: 10px 12px; font-family: 'Figtree', system-ui, sans-serif; font-size: 12px; line-height: 1.35;
      box-shadow: 0 12px 32px rgba(0,0,0,0.7);
    }
    .rm-connect-toast .rm-dot { width: 8px; height: 8px; border-radius: 9999px; background: #F59E0B; flex-shrink: 0; }
    .rm-connect-toast .rm-x { background: transparent; border: none; color: #71717A; cursor: pointer; font-size: 14px; padding: 0 2px; }
  `;

  // The block, image and screenshot dialogs live in the page itself, not in a shadow root,
  // so the menu styles go into the page head once.
  function installPageStyle() {
    if (document.getElementById('researchie-project-menu-style')) return;
    const style = document.createElement('style');
    style.id = 'researchie-project-menu-style';
    style.textContent = CSS;
    (document.head || document.documentElement).appendChild(style);
  }

  async function loadDestination() {
    try {
      if (chrome.storage && chrome.storage.local) {
        const stored = await chrome.storage.local.get(['activeProjectId', 'activeProjectTitle', 'activeParentTitle']);
        if (stored.activeProjectId) {
          return {
            id: stored.activeProjectId,
            title: stored.activeProjectTitle || DEFAULT_DESTINATION.title,
            parentTitle: stored.activeParentTitle || '',
          };
        }
      }
    } catch {}
    return { ...DEFAULT_DESTINATION };
  }

  /** "Parent / Child" when the project is inside another one, else just its title. */
  function destinationLabel(dest) {
    return dest.parentTitle ? `${dest.parentTitle} / ${dest.title}` : dest.title;
  }

  // Every project, parents first with their sub-projects under them: [{ project, depth, parentTitle }].
  function flattenProjects(projects) {
    const byParent = new Map();
    for (const p of projects) {
      const key = p.parentId || '';
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key).push(p);
    }
    const ids = new Set(projects.map((p) => p.id));
    const out = [];
    const walk = (parentKey, depth, parentTitle, seen) => {
      for (const p of byParent.get(parentKey) || []) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        out.push({ project: p, depth, parentTitle });
        walk(p.id, depth + 1, p.title, seen);
      }
    };
    const seen = new Set();
    walk('', 0, '', seen);
    // A project whose parent is missing from the list would otherwise be dropped; show it at the top level.
    for (const p of projects) {
      if (!seen.has(p.id) && !ids.has(p.parentId)) {
        seen.add(p.id);
        out.push({ project: p, depth: 0, parentTitle: '' });
        walk(p.id, 1, p.title, seen);
      }
    }
    return out;
  }

  // Resolves to { entries } on success, or { error: 'not-connected' | 'unreachable' }.
  function loadProjects() {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ action: 'LIST_PROJECTS' }, (resp) => {
          if (chrome.runtime.lastError || !resp) return resolve({ error: 'unreachable' });
          if (resp.code === 'NOT_CONNECTED') return resolve({ error: 'not-connected' });
          if (!resp.success || !Array.isArray(resp.data)) return resolve({ error: 'unreachable' });
          resolve({ entries: flattenProjects(resp.data) });
        });
      } catch {
        resolve({ error: 'unreachable' });
      }
    });
  }

  async function setDestination(project, parentTitle) {
    const dest = {
      id: project.id,
      title: project.title,
      parentTitle: parentTitle || '',
    };
    try {
      await chrome.storage.local.set({
        activeProjectId: project.id,
        activeProjectTitle: project.title,
        activeProjectDesc: project.description || '',
        activeProjectColor: project.color_badge || project.color || '#325FEC',
        activeParentTitle: dest.parentTitle,
      });
    } catch {}
    return dest;
  }

  // ── Not connected ────────────────────────────────────────────────────────────

  /** Opens the extension popup on its Connect panel. Resolves true when the popup could be opened. */
  function openConnect() {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ action: 'OPEN_CONNECT' }, (resp) => resolve(Boolean(resp && resp.opened)));
      } catch {
        resolve(false);
      }
    });
  }

  /** A clear prompt on the page: the clip is held in the extension, and how to connect. */
  function showNotConnected() {
    const id = 'researchie-connect-toast-host';
    document.getElementById(id)?.remove();
    const host = document.createElement('div');
    host.id = id;
    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = CSS;
    const toast = document.createElement('div');
    toast.className = 'rm-connect-toast';
    toast.setAttribute('role', 'alert');
    const dot = document.createElement('span');
    dot.className = 'rm-dot';
    const text = document.createElement('span');
    text.textContent = 'Not connected. Your clip is held in the extension. Connect your account to send it.';
    const connect = document.createElement('button');
    connect.type = 'button';
    connect.className = 'rm-connect-btn';
    connect.textContent = 'Connect';
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'rm-x';
    close.setAttribute('aria-label', 'Dismiss');
    close.textContent = '✕';
    toast.append(dot, text, connect, close);
    shadow.append(style, toast);
    document.documentElement.appendChild(host);

    const dismiss = () => host.remove();
    close.addEventListener('click', dismiss);
    connect.addEventListener('click', async () => {
      const opened = await openConnect();
      if (opened) return dismiss();
      text.textContent = 'Click the Researchie icon in the toolbar, then the link icon next to the on/off switch.';
      connect.remove();
    });
    setTimeout(dismiss, 15000);
    return host;
  }

  // What to tell the user when a save did not reach their account.
  function notSavedMessage(response) {
    if (response && response.needsConnect) return 'Not connected. Connect your account to send clips.';
    if (response && response.queued) return 'Saved offline. It will send when the connection returns.';
    return (response && response.error) || 'Could not save. Try again.';
  }

  /** Shows the right thing for a save that did not go through: the connect prompt, or a plain toast. */
  function reportNotSaved(response, showToast) {
    if (response && response.needsConnect) return showNotConnected();
    return showToast(notSavedMessage(response));
  }

  // ── Tooltip on Send ──────────────────────────────────────────────────────────

  /**
   * A small tooltip that shows where Send will go. Call attachTooltip(container, trigger, getText);
   * getText runs on every hover, so it always shows the current destination.
   */
  function attachTooltip(container, trigger, getText) {
    const tip = document.createElement('div');
    tip.className = 'rm-tooltip';
    tip.hidden = true;
    container.appendChild(tip);
    trigger.addEventListener('mouseenter', async () => {
      tip.textContent = 'Send to …';
      tip.hidden = false;
      tip.textContent = `Send to ${await getText()}`;
    });
    trigger.addEventListener('mouseleave', () => {
      tip.hidden = true;
    });
    return tip;
  }

  // ── The panel ────────────────────────────────────────────────────────────────

  const el = (tag, className, html) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (html !== undefined) node.innerHTML = html;
    return node;
  };

  /**
   * The "Set project" panel: a small "Set project" label, the chosen project under it (highlighted), and the
   * project list with sub-projects under their project. options:
   *   onChange(dest) called after the user picks another project
   * Returns { el, open(anchor, closed), close(), isOpen() }.
   */
  function buildPanel(options = {}) {
    const popup = el('div', 'rm-popup rm-below');
    popup.setAttribute('role', 'menu');
    popup.hidden = true;
    let onClose = () => {};

    const close = () => {
      popup.hidden = true;
      onClose();
    };

    async function render() {
      popup.textContent = '';
      const head = el('div', 'rm-head');
      const label = el('span', 'rm-head-label');
      label.textContent = 'Set project';
      const nameEl = el('span', 'rm-head-name');
      nameEl.textContent = '…';
      head.append(label, nameEl);
      const list = el('div', 'rm-list');
      list.innerHTML = '<div class="rm-note">Loading projects…</div>';
      popup.append(head, list);
      place();

      const [loaded, current] = await Promise.all([loadProjects(), loadDestination()]);
      nameEl.textContent = destinationLabel(current);
      list.textContent = '';
      if (loaded.error === 'not-connected') {
        const note = el('div', 'rm-note');
        note.textContent = 'Not connected. Connect your account to choose a project.';
        const btn = el('button', 'rm-connect-btn');
        btn.type = 'button';
        btn.textContent = 'Connect';
        btn.addEventListener('click', () => {
          openConnect();
          close();
        });
        note.append(document.createElement('br'), btn);
        list.appendChild(note);
        return;
      }
      if (!loaded.entries || loaded.entries.length === 0) {
        list.innerHTML = '<div class="rm-note">Could not load projects. Is Researchie running?</div>';
        return;
      }
      let group = null;
      for (const { project, depth, parentTitle } of loaded.entries) {
        const isSub = depth > 0;
        const item = el('button', `rm-item ${isSub ? 'rm-subitem' : 'rm-top'}`);
        item.type = 'button';
        item.setAttribute('role', 'menuitemradio');
        item.setAttribute('aria-checked', String(project.id === current.id));
        item.dataset.depth = String(depth);
        const name = el('span', 'rm-name');
        name.textContent = project.title;
        if (isSub) {
          if (depth > 1) item.style.paddingLeft = `${8 + (depth - 1) * 10}px`;
          item.append(name);
        } else {
          item.append(el('span', 'rm-ico', ICON.folder(14)), name);
        }
        item.addEventListener('click', async () => {
          const dest = await setDestination(project, parentTitle);
          close();
          if (options.onChange) options.onChange(dest);
        });
        if (isSub) {
          if (!group) {
            group = el('div', 'rm-subs');
            list.appendChild(group);
          }
          group.appendChild(item);
        } else {
          group = null;
          list.appendChild(item);
        }
      }
    }

    // Opens downward unless that would run off the page. Runs again once the list has filled in, because
    // the project list is taller than its first "Loading" line.
    let anchorEl = null;
    const place = () => {
      const target = anchorEl || popup.parentElement;
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const need = Math.min(popup.scrollHeight || 0, 340) + 16;
      const roomBelow = window.innerHeight - rect.bottom;
      const above = roomBelow < need && rect.top > roomBelow;
      popup.classList.toggle('rm-above', above);
      popup.classList.toggle('rm-below', !above);
      // The list is only as tall as the room on the side it opens to, so the panel stays inside the window.
      const list = popup.querySelector('.rm-list');
      if (list) {
        const room = above ? rect.top : roomBelow;
        list.style.maxHeight = `${Math.max(88, Math.min(232, room - 96))}px`;
      }
      // Right-aligned by default; flip to left-aligned when that would run off the left edge of the page.
      const wrapRect = (popup.parentElement || target).getBoundingClientRect();
      if (!options.alignLeft) popup.classList.toggle('rm-left', wrapRect.right - 232 < 8);
    };

    if (options.alignLeft) popup.classList.add('rm-left');

    return {
      el: popup,
      isOpen: () => !popup.hidden,
      close,
      open(anchor, closed) {
        onClose = closed || (() => {});
        anchorEl = anchor || null;
        popup.hidden = false;
        return Promise.resolve(render()).then(place);
      },
    };
  }

  /** Closes a panel when the person clicks or presses a key outside it. */
  function closeOnOutside(wrap, panel) {
    const outside = (e) => {
      const path = e.composedPath ? e.composedPath() : [];
      if (!path.includes(wrap)) {
        panel.close();
        cleanup();
      }
    };
    const key = (e) => {
      if (e.key === 'Escape') {
        panel.close();
        cleanup();
      }
    };
    const cleanup = () => {
      document.removeEventListener('mousedown', outside, true);
      document.removeEventListener('keydown', key, true);
    };
    document.addEventListener('mousedown', outside, true);
    document.addEventListener('keydown', key, true);
    return cleanup;
  }

  /**
   * The three-dot button and its panel, for the text pill. options: { onChange }.
   * Returns an element to place in the tool's toolbar.
   */
  function buildMenu(options = {}) {
    const wrap = el('div', 'rm-menu-wrap');
    const dots = el('button', 'rm-dots', ICON.dots);
    dots.type = 'button';
    dots.title = 'Set project';
    dots.setAttribute('aria-label', 'Set project');
    dots.setAttribute('aria-haspopup', 'menu');
    dots.setAttribute('aria-expanded', 'false');

    // Keep the page selection and host page out of every interaction inside the menu.
    for (const type of ['mousedown', 'mouseup', 'click']) wrap.addEventListener(type, (e) => e.stopPropagation());
    wrap.addEventListener('mousedown', (e) => e.preventDefault());

    const panel = buildPanel({ onChange: options.onChange });
    let stopListening = () => {};
    const closed = () => {
      dots.setAttribute('aria-expanded', 'false');
      stopListening();
    };

    dots.addEventListener('click', () => {
      if (panel.isOpen()) {
        panel.close();
        return;
      }
      dots.setAttribute('aria-expanded', 'true');
      stopListening = closeOnOutside(wrap, panel);
      panel.open(wrap, closed);
    });
    wrap.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') panel.close();
    });
    wrap.append(dots, panel.el);
    wrap.closeMenu = () => panel.close();
    return wrap;
  }

  /**
   * Replaces the destination row on the block, image and screenshot dialogs with one row:
   *   [ Set project / name  v ]  [tag icon]
   * options: { tagInput }. The tag field stays hidden until the tag icon is pressed.
   * The project button opens the "Set project" panel. Returns the row.
   */
  function mountActionRow(dialog, beforeEl, options = {}) {
    installPageStyle();
    const row = el('div', 'rm-dest');

    const chip = el('button', 'rm-chip rm-chip-project');
    chip.type = 'button';
    chip.setAttribute('aria-haspopup', 'menu');
    chip.setAttribute('aria-expanded', 'false');
    const stack = el('span', 'rm-chip-stack');
    const chipLabel = el('span', 'rm-chip-label');
    chipLabel.textContent = 'Set project';
    const chipName = el('span', 'rm-chip-name');
    stack.append(chipLabel, chipName);
    chip.append(stack, el('span', 'rm-ico', ICON.chevronDown(11)));
    const setText = (dest) => {
      chipName.textContent = destinationLabel(dest);
      chip.title = `Sends to ${destinationLabel(dest)}. Click to change.`;
    };
    chipName.textContent = '…';
    loadDestination().then(setText);
    row.appendChild(chip);

    if (options.tagInput) {
      const field = options.tagInput.parentElement;
      if (field) field.style.display = 'none';
      const tag = el('button', 'rm-chip rm-chip-icon rm-chip-tag', ICON.tag(14));
      tag.type = 'button';
      tag.title = 'Add a tag';
      tag.setAttribute('aria-label', 'Add a tag');
      tag.setAttribute('aria-pressed', 'false');
      tag.addEventListener('click', () => {
        const show = field ? field.style.display === 'none' : false;
        if (field) field.style.display = show ? '' : 'none';
        tag.setAttribute('aria-pressed', String(show));
        if (show) options.tagInput.focus();
      });
      row.appendChild(tag);
    }

    const panel = buildPanel({ onChange: setText, alignLeft: true });
    let stopListening = () => {};
    const closed = () => {
      chip.setAttribute('aria-expanded', 'false');
      stopListening();
    };
    chip.addEventListener('click', () => {
      if (panel.isOpen()) return panel.close();
      chip.setAttribute('aria-expanded', 'true');
      stopListening = closeOnOutside(row, panel);
      panel.open(chip, closed);
    });
    row.appendChild(panel.el);

    // Typing or clicking in the row must not reach the dialog's own key and click handlers.
    row.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape' && panel.isOpen()) panel.close();
    });
    dialog.insertBefore(row, beforeEl || null);
    return row;
  }

  // ── Dialogs ──────────────────────────────────────────────────────────────────

  /**
   * Keeps a dialog fully inside the window, buttons included: it sits just under the thing it belongs to,
   * above it when there is no room below, and is pulled back in whenever its size changes (a tag field
   * opening, a picture loading) or the window is resized. anchor: { left, top, bottom } in window coordinates.
   */
  function keepInView(dialog, anchor) {
    const M = 8;
    const fit = () => {
      if (!dialog.isConnected) return;
      const w = dialog.offsetWidth;
      const h = dialog.offsetHeight;
      const vw = document.documentElement.clientWidth || window.innerWidth;
      const vh = window.innerHeight;
      const left = Math.min(Math.max(M, anchor.left), Math.max(M, vw - w - M));
      let top = anchor.bottom + 10;
      if (top + h > vh - M) top = anchor.top - h - 10;
      top = Math.min(Math.max(M, top), Math.max(M, vh - h - M));
      dialog.style.left = `${Math.round(left)}px`;
      dialog.style.top = `${Math.round(top)}px`;
    };
    fit();
    if (typeof ResizeObserver === 'function') new ResizeObserver(fit).observe(dialog);
    const onResize = () => {
      if (!dialog.isConnected) return window.removeEventListener('resize', onResize);
      fit();
    };
    window.addEventListener('resize', onResize);
    return fit;
  }

  /**
   * The one dialog the block, image and screenshot captures share: title, size line, optional picture, the
   * "Set project" row with a tag icon, then Cancel and Send. Returns { dialog, tagInput }.
   * options: { id, title, meta, previewSrc, tagId, tagPlaceholder, cancelId, confirmId, anchor }
   */
  function createDialog(options) {
    installPageStyle();
    const dialog = el('div', 'rm-dialog');
    dialog.id = options.id;
    const title = el('div', 'rm-d-title');
    title.textContent = options.title;
    const meta = el('div', 'rm-d-meta');
    meta.textContent = options.meta || '';
    dialog.append(title, meta);
    if (options.previewSrc) {
      const box = el('div', 'rm-d-preview');
      const img = document.createElement('img');
      img.src = options.previewSrc;
      box.appendChild(img);
      dialog.appendChild(box);
    }
    const field = el('div', 'rm-d-field');
    const tagInput = el('input', 'rm-tag-input');
    tagInput.id = options.tagId;
    tagInput.type = 'text';
    tagInput.placeholder = options.tagPlaceholder || 'Add tag (optional)';
    tagInput.autocomplete = 'off';
    tagInput.spellcheck = false;
    field.appendChild(tagInput);
    const actions = el('div', 'rm-d-actions');
    const cancel = el('button', 'rm-btn');
    cancel.id = options.cancelId;
    cancel.type = 'button';
    cancel.textContent = 'Cancel';
    const confirm = el('button', 'rm-btn rm-btn-primary');
    confirm.id = options.confirmId;
    confirm.type = 'button';
    confirm.textContent = 'Send';
    actions.append(cancel, confirm);
    dialog.append(field, actions);
    document.body.appendChild(dialog);

    mountActionRow(dialog, field, { tagInput });
    keepInView(dialog, options.anchor || { left: 20, top: 20, bottom: 20 });
    return { dialog, tagInput };
  }

  window.__RESEARCHIE_PROJECT_MENU__ = {
    CSS,
    ICON,
    installPageStyle,
    mountActionRow,
    buildMenu,
    buildPanel,
    createDialog,
    keepInView,
    openConnect,
    showNotConnected,
    reportNotSaved,
    notSavedMessage,
    loadDestination,
    destinationLabel,
    flattenProjects,
    loadProjects,
    setDestination,
    attachTooltip,
  };
})();
