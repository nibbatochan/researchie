// Shared in-page project switching for the capture tools. The text pill uses it now; the block, image and
// screenshot capture boxes use the same helpers. It lets a user see where a clip will go and change that
// without opening the extension popup: a tooltip on Send, and a three-dot menu with "Change to…".
// Choosing a project sets the same active project the popup sets (chrome.storage.local), so both stay in step.
(() => {
  if (window.__RESEARCHIE_PROJECT_MENU__) return;

  const DEFAULT_DESTINATION = { id: 'proj-ai-main', title: 'Active Project', parentTitle: '' };

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
      position: absolute; right: 0; min-width: 210px; max-width: 280px; z-index: 2147483647;
      background: #09090B; border: 1px solid #27272A; border-radius: 10px; padding: 4px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.85); font-size: 12px; color: #FAFAFA;
    }
    .rm-popup[hidden] { display: none; }
    .rm-popup.rm-below { top: calc(100% + 8px); }
    .rm-popup.rm-above { bottom: calc(100% + 8px); }
    .rm-item {
      display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%;
      background: transparent; border: none; color: #D4D4D8; text-align: left; cursor: pointer;
      font-family: inherit; font-size: 12px; padding: 6px 8px; border-radius: 6px;
    }
    .rm-item:hover { background: #18181B; color: #FAFAFA; }
    .rm-item .rm-check { color: #FAFAFA; font-weight: 700; flex-shrink: 0; }
    .rm-item .rm-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .rm-heading { color: #71717A; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; padding: 6px 8px 2px; }
    .rm-list { max-height: 220px; overflow-y: auto; margin-top: 2px; }
    .rm-note { color: #71717A; padding: 6px 8px; }
    .rm-tooltip {
      position: absolute; left: 0; top: calc(100% + 8px); z-index: 2147483647; pointer-events: none;
      background: #18181B; color: #FAFAFA; border: 1px solid #27272A; border-radius: 6px;
      font-size: 11px; font-weight: 500; padding: 4px 8px; white-space: nowrap; max-width: 260px;
      overflow: hidden; text-overflow: ellipsis; box-shadow: 0 4px 12px rgba(0,0,0,0.6);
    }
    .rm-tooltip[hidden] { display: none; }
    .rm-dest {
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
      margin-bottom: 10px; padding: 4px 4px 4px 8px; background: #18181B; border: 1px solid #27272A;
      border-radius: 6px; font-size: 11px; color: #A1A1AA;
    }
    .rm-dest b { color: #FAFAFA; font-weight: 600; }
    .rm-dest .rm-dest-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
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

  /** Opens the Q&A drawer (never closes it; the drawer's own toggle would). */
  function openAskAi() {
    if (typeof window.__RESEARCHIE_OPEN_DRAWER__ === 'function') {
      window.__RESEARCHIE_OPEN_DRAWER__();
    } else {
      window.dispatchEvent(new CustomEvent('RESEARCHIE_TRIGGER_QNA_DRAWER'));
    }
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

  // What to tell the user when a save did not reach their account.
  function notSavedMessage(response) {
    if (response && response.needsConnect) return 'Not connected. Open the Researchie popup and use Connect.';
    if (response && response.queued) return 'Saved offline. It will send when the connection returns.';
    return (response && response.error) || 'Could not save. Try again.';
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

  function loadProjects() {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ action: 'LIST_PROJECTS' }, (resp) => {
          if (chrome.runtime.lastError || !resp || !resp.success || !Array.isArray(resp.data)) resolve(null);
          else resolve(flattenProjects(resp.data));
        });
      } catch {
        resolve(null);
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

  /**
   * The three-dot menu. options:
   *   extraItems: [{ label, onClick }] shown above "Change to…" (for example "Ask AI")
   *   onChange(dest): called after the user picks another project
   * Returns an element to place in the tool's toolbar.
   */
  function buildMenu(options = {}) {
    const wrap = document.createElement('div');
    wrap.className = 'rm-menu-wrap';

    const dots = document.createElement('button');
    dots.type = 'button';
    dots.className = 'rm-dots';
    dots.title = 'More';
    dots.setAttribute('aria-haspopup', 'menu');
    dots.setAttribute('aria-expanded', 'false');
    dots.innerHTML = '<svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor"><circle cx="128" cy="60" r="16"/><circle cx="128" cy="128" r="16"/><circle cx="128" cy="196" r="16"/></svg>';

    const popup = document.createElement('div');
    popup.className = 'rm-popup rm-below';
    popup.setAttribute('role', 'menu');
    popup.hidden = true;

    const close = () => {
      popup.hidden = true;
      dots.setAttribute('aria-expanded', 'false');
    };

    // Keep the page selection and host page out of every interaction inside the menu.
    for (const type of ['mousedown', 'mouseup', 'click']) {
      wrap.addEventListener(type, (e) => e.stopPropagation());
    }
    wrap.addEventListener('mousedown', (e) => e.preventDefault());

    for (const extra of options.extraItems || []) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'rm-item';
      item.setAttribute('role', 'menuitem');
      item.textContent = extra.label;
      item.addEventListener('click', () => {
        close();
        extra.onClick();
      });
      popup.appendChild(item);
    }

    const heading = document.createElement('div');
    heading.className = 'rm-heading';
    heading.textContent = 'Change to…';
    const list = document.createElement('div');
    list.className = 'rm-list';
    popup.append(heading, list);

    let loaded = false;
    const fillList = async () => {
      list.innerHTML = '<div class="rm-note">Loading projects…</div>';
      const [entries, current] = await Promise.all([loadProjects(), loadDestination()]);
      list.textContent = '';
      if (!entries || entries.length === 0) {
        list.innerHTML = '<div class="rm-note">Could not load projects. Is Researchie running?</div>';
        loaded = false;
        return;
      }
      loaded = true;
      for (const { project, depth, parentTitle } of entries) {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'rm-item';
        item.setAttribute('role', 'menuitemradio');
        item.setAttribute('aria-checked', String(project.id === current.id));
        item.style.paddingLeft = `${8 + depth * 14}px`;
        const name = document.createElement('span');
        name.className = 'rm-name';
        name.textContent = project.title;
        item.appendChild(name);
        if (project.id === current.id) {
          const check = document.createElement('span');
          check.className = 'rm-check';
          check.textContent = '✓';
          item.appendChild(check);
        }
        item.addEventListener('click', async () => {
          const dest = await setDestination(project, parentTitle);
          close();
          if (options.onChange) options.onChange(dest);
        });
        list.appendChild(item);
      }
    };

    dots.addEventListener('click', () => {
      if (!popup.hidden) {
        close();
        return;
      }
      // Open below the toolbar, or above it when it sits near the bottom of the window.
      const rect = wrap.getBoundingClientRect();
      const roomBelow = window.innerHeight - rect.bottom;
      popup.classList.toggle('rm-above', roomBelow < 300 && rect.top > roomBelow);
      popup.classList.toggle('rm-below', !(roomBelow < 300 && rect.top > roomBelow));
      popup.hidden = false;
      dots.setAttribute('aria-expanded', 'true');
      if (!loaded) fillList();
    });

    wrap.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') close();
    });

    wrap.append(dots, popup);
    wrap.closeMenu = close;
    return wrap;
  }

  /**
   * Adds a "Sends to <project>" row with the three-dot menu to a confirmation dialog, before `beforeEl`
   * (or at the end). The menu holds "Ask AI" and "Change to…". Returns the row.
   */
  function mountDestinationRow(dialog, beforeEl) {
    installPageStyle();
    const row = document.createElement('div');
    row.className = 'rm-dest';
    const text = document.createElement('span');
    text.className = 'rm-dest-text';
    const setText = (dest) => {
      text.textContent = 'Sends to ';
      const name = document.createElement('b');
      name.textContent = destinationLabel(dest);
      text.appendChild(name);
    };
    text.textContent = 'Sends to …';
    loadDestination().then(setText);
    row.append(text, buildMenu({
      extraItems: [{ label: 'Ask AI', onClick: openAskAi }],
      onChange: setText,
    }));
    // Typing or clicking in the menu must not reach the dialog's own key and click handlers.
    row.addEventListener('keydown', (e) => e.stopPropagation());
    dialog.insertBefore(row, beforeEl || null);
    return row;
  }

  window.__RESEARCHIE_PROJECT_MENU__ = {
    CSS,
    installPageStyle,
    openAskAi,
    mountDestinationRow,
    notSavedMessage,
    loadDestination,
    destinationLabel,
    flattenProjects,
    loadProjects,
    setDestination,
    attachTooltip,
    buildMenu,
  };
})();
