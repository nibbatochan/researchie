// Researchie Visual DOM Block Picker
(function () {
  if (window.__RESEARCHIE_BLOCK_PICKER_INJECTED__) return;
  window.__RESEARCHIE_BLOCK_PICKER_INJECTED__ = true;

  let isPicking = false;
  let hoveredElement = null;
  let overlay = null;
  let badge = null;

  function initOverlay() {
    if (overlay) return;

    overlay = document.createElement('div');
    overlay.id = 'researchie-block-overlay';
    overlay.style.position = 'fixed';
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = '2147483640';
    overlay.style.border = '2px solid #FAFAFA';
    overlay.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
    overlay.style.transition = 'all 0.06s ease-out';
    overlay.style.display = 'none';
    overlay.style.borderRadius = '6px';
    overlay.style.boxShadow = '0 0 0 1px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.4)';

    badge = document.createElement('div');
    badge.id = 'researchie-block-badge';
    badge.style.position = 'absolute';
    badge.style.top = '-30px';
    badge.style.left = '0';
    badge.style.backgroundColor = '#121214';
    badge.style.color = '#FAFAFA';
    badge.style.border = '1px solid #27272A';
    badge.style.padding = '3px 8px';
    badge.style.borderRadius = '5px';
    badge.style.fontFamily = "'JetBrains Mono', monospace";
    badge.style.fontSize = '11px';
    badge.style.fontWeight = 'bold';
    badge.style.whiteSpace = 'nowrap';
    badge.style.boxShadow = '0 4px 12px rgba(0,0,0,0.6)';

    overlay.appendChild(badge);
    document.documentElement.appendChild(overlay);
  }

  function startBlockPicker() {
    if (isPicking) return;
    isPicking = true;
    initOverlay();

    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown, true);

    showToast('Block Select Active • Hover element. [↑/↓] Expand. Click to save.');
  }

  function stopBlockPicker() {
    if (!isPicking) return;
    isPicking = false;

    if (overlay) overlay.style.display = 'none';
    document.removeEventListener('mouseover', handleMouseOver, true);
    document.removeEventListener('click', handleClick, true);
    document.removeEventListener('keydown', handleKeyDown, true);
  }

  function updateHighlight(element) {
    if (!element || element === overlay || element === document.body || element === document.documentElement) {
      return;
    }

    hoveredElement = element;
    const rect = element.getBoundingClientRect();

    overlay.style.display = 'block';
    overlay.style.top = `${rect.top}px`;
    overlay.style.left = `${rect.left}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;

    const tag = element.tagName.toLowerCase();
    const className = element.className && typeof element.className === 'string'
      ? '.' + element.className.trim().split(/\s+/).slice(0, 2).join('.')
      : '';
    badge.textContent = `${tag}${className} [${Math.round(rect.width)}×${Math.round(rect.height)}]`;
  }

  function handleMouseOver(e) {
    if (!isPicking) return;
    e.stopPropagation();
    updateHighlight(e.target);
  }

  function handleKeyDown(e) {
    if (!isPicking) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      stopBlockPicker();
      showToast('Block Select Cancelled');
      return;
    }

    if (e.key === 'ArrowUp' && hoveredElement && hoveredElement.parentElement) {
      e.preventDefault();
      updateHighlight(hoveredElement.parentElement);
    } else if (e.key === 'ArrowDown' && hoveredElement && hoveredElement.firstElementChild) {
      e.preventDefault();
      updateHighlight(hoveredElement.firstElementChild);
    }
  }

  // Walk up ancestor tree to find real rendered background color & image
  function getEffectiveBackground(el) {
    let curr = el;
    let effectiveBg = '';
    let effectiveBgImage = '';

    while (curr && curr !== document.documentElement) {
      const comp = window.getComputedStyle(curr);
      const bg = comp.backgroundColor;
      const bgImg = comp.backgroundImage;

      if (!effectiveBg && bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)' && !bg.startsWith('rgba(0, 0, 0, 0')) {
        effectiveBg = bg;
      }

      if (!effectiveBgImage && bgImg && bgImg !== 'none') {
        effectiveBgImage = bgImg;
      }

      if (effectiveBg) break;
      curr = curr.parentElement;
    }

    if (!effectiveBg) {
      const bodyComp = window.getComputedStyle(document.body);
      const bodyBg = bodyComp.backgroundColor;
      if (bodyBg && bodyBg !== 'transparent' && bodyBg !== 'rgba(0, 0, 0, 0)') {
        effectiveBg = bodyBg;
      } else {
        effectiveBg = '#13151A';
      }
    }

    return { backgroundColor: effectiveBg, backgroundImage: effectiveBgImage };
  }

  function getEffectiveColor(el) {
    let curr = el;
    while (curr && curr !== document.documentElement) {
      const comp = window.getComputedStyle(curr);
      const color = comp.color;
      if (color && color !== 'transparent' && color !== 'rgba(0, 0, 0, 0)') {
        return color;
      }
      curr = curr.parentElement;
    }
    return '#F8FAFC';
  }

  function handleClick(e) {
    if (!isPicking || !hoveredElement) return;
    e.preventDefault();
    e.stopPropagation();

    const target = hoveredElement;
    stopBlockPicker();
    showBlockConfirmationDialog(target);
  }

  function showBlockConfirmationDialog(target) {
    const rect = target.getBoundingClientRect();
    const tag = target.tagName.toLowerCase();
    const selector = getCssSelector(target);

    const dialog = document.createElement('div');
    dialog.id = 'researchie-block-dialog';
    dialog.style.position = 'fixed';
    dialog.style.top = `${Math.min(window.innerHeight - 170, Math.max(20, rect.bottom + 10))}px`;
    dialog.style.left = `${Math.min(window.innerWidth - 290, Math.max(20, rect.left))}px`;
    dialog.style.zIndex = '2147483647';
    dialog.style.backgroundColor = '#13151A';
    dialog.style.border = '1px solid #262B38';
    dialog.style.borderRadius = '10px';
    dialog.style.padding = '12px 16px';
    dialog.style.boxShadow = '0 12px 36px rgba(0,0,0,0.8)';
    dialog.style.color = '#FFF';
    dialog.style.fontFamily = "'Figtree', sans-serif";
    dialog.style.fontSize = '12px';
    dialog.style.minWidth = '250px';

    dialog.innerHTML = `
      <div style="font-weight:700;margin-bottom:4px;font-family:'Space Grotesk',sans-serif;">Send DOM Block to Project?</div>
      <div style="color:#8B949E;font-size:11px;margin-bottom:8px;">&lt;${tag.toUpperCase()}&gt; • Area: ${Math.round(rect.width)}×${Math.round(rect.height)}px</div>
      <div style="margin-bottom:10px;">
        <input id="block-tag-input" type="text" placeholder="Add tag (optional, e.g. #pricing-card)" style="width:100%;box-sizing:border-box;background:#1A1D24;border:1px solid #383E4E;border-radius:6px;padding:6px 8px;color:#FFF;font-size:11px;outline:none;" />
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button id="btn-block-cancel" style="background:#262B38;border:none;color:#FFF;padding:5px 10px;border-radius:5px;font-size:11px;cursor:pointer;">Cancel</button>
        <button id="btn-block-confirm" style="background:#D2F83C;border:none;color:#000;padding:5px 12px;border-radius:5px;font-weight:700;font-size:11px;cursor:pointer;">Yes, Send</button>
      </div>
    `;

    document.body.appendChild(dialog);

    const tagInput = dialog.querySelector('#block-tag-input');
    // Where it will go, with the three-dot menu to change it or ask AI.
    if (window.__RESEARCHIE_PROJECT_MENU__ && tagInput) {
      window.__RESEARCHIE_PROJECT_MENU__.mountDestinationRow(dialog, tagInput.parentElement);
    }
    tagInput?.focus();

    dialog.querySelector('#btn-block-cancel').addEventListener('click', () => {
      dialog.remove();
      showToast('Block Send Cancelled');
    });

    const confirmSend = async () => {
      const tagVal = tagInput?.value.trim() || '';
      const tags = tagVal ? [tagVal.replace(/^#/, '')] : ['block'];
      dialog.remove();

      // Effective rendered background and text color from ancestor chain
      const bgInfo = getEffectiveBackground(target);
      const textColor = getEffectiveColor(target);
      const computed = window.getComputedStyle(target);
      const fontFamily = computed.fontFamily || "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

      // Clone element and clean up active scripts/iframes
      const clone = target.cloneNode(true);
      const badTags = clone.querySelectorAll('script, iframe, noscript, form, input, button[type="submit"]');
      badTags.forEach((s) => s.remove());

      // Resolve relative asset URLs to absolute URLs
      const origin = window.location.origin;
      const baseHref = window.location.href;
      clone.querySelectorAll('img').forEach((img) => {
        const src = img.getAttribute('src');
        if (src) {
          try { img.setAttribute('src', new URL(src, baseHref).href); } catch (e) {}
        }
        const srcset = img.getAttribute('srcset');
        if (srcset) {
          try {
            const resolved = srcset.split(',').map(part => {
              const [url, size] = part.trim().split(/\s+/);
              return `${new URL(url, baseHref).href} ${size || ''}`.trim();
            }).join(', ');
            img.setAttribute('srcset', resolved);
          } catch (e) {}
        }
      });
      clone.querySelectorAll('a').forEach((a) => {
        const href = a.getAttribute('href');
        if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
          try { a.setAttribute('href', new URL(href, baseHref).href); } catch (e) {}
          a.setAttribute('target', '_blank');
          a.setAttribute('rel', 'noopener noreferrer');
        }
      });

      const origElements = [target, ...target.querySelectorAll('*')];
      const cloneElements = [clone, ...clone.querySelectorAll('*')];

      // Comprehensive CSS property extraction
      const styleProps = [
        'display', 'position', 'flex-direction', 'flex-wrap', 'flex-grow', 'flex-shrink', 'flex-basis',
        'justify-content', 'align-items', 'align-content', 'align-self', 'justify-self', 'place-items',
        'gap', 'row-gap', 'column-gap',
        'grid-template-columns', 'grid-template-rows', 'grid-column', 'grid-row', 'grid-auto-flow', 'grid-gap',
        'box-sizing', 'width', 'min-width', 'max-width', 'height', 'min-height',
        'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
        'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
        'border-top-width', 'border-top-style', 'border-top-color',
        'border-right-width', 'border-right-style', 'border-right-color',
        'border-bottom-width', 'border-bottom-style', 'border-bottom-color',
        'border-left-width', 'border-left-style', 'border-left-color',
        'border-radius', 'border-top-left-radius', 'border-top-right-radius', 'border-bottom-left-radius', 'border-bottom-right-radius',
        'color', 'background-color', 'background-image', 'background-size', 'background-position', 'background-repeat',
        'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'text-align',
        'text-transform', 'text-decoration', 'white-space', 'word-break', 'overflow-wrap',
        'box-shadow', 'opacity', 'fill', 'stroke', 'border-collapse', 'table-layout'
      ];

      for (let i = 0; i < origElements.length && i < cloneElements.length; i++) {
        const orig = origElements[i];
        const cl = cloneElements[i];
        if (orig.nodeType !== Node.ELEMENT_NODE || cl.nodeType !== Node.ELEMENT_NODE) continue;

        try {
          const comp = window.getComputedStyle(orig);
          let inlineStyle = '';
          for (const prop of styleProps) {
            const val = comp.getPropertyValue(prop);
            if (val && val !== 'initial' && val !== 'normal' && val !== 'none' && val !== 'auto') {
              inlineStyle += `${prop}: ${val}; `;
            }
          }
          if (inlineStyle) {
            cl.setAttribute('style', inlineStyle + (cl.getAttribute('style') || ''));
          }
        } catch (e) {}
      }

      // Root element responsive constraints
      clone.style.boxSizing = 'border-box';
      clone.style.maxWidth = '100%';

      // If target had transparent background, explicitly apply the effective background
      const targetComp = window.getComputedStyle(target);
      if (!targetComp.backgroundColor || targetComp.backgroundColor === 'transparent' || targetComp.backgroundColor.startsWith('rgba(0, 0, 0, 0')) {
        clone.style.backgroundColor = bgInfo.backgroundColor;
      }
      if (!targetComp.color || targetComp.color === 'transparent') {
        clone.style.color = textColor;
      }

      const sanitizedHtml = `<div style="background-color:${bgInfo.backgroundColor}; color:${textColor}; padding:14px; border-radius:8px; font-family:${fontFamily}; max-width:100%; box-sizing:border-box;">${clone.outerHTML}</div>`;
      const rawText = target.innerText.trim().slice(0, 500);

      // Full standalone HTML with ancestor background, responsive reset, and styles
      const standaloneHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <base href="${window.location.origin}/">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      html, body {
        margin: 0;
        padding: 14px;
        background-color: ${bgInfo.backgroundColor};
        ${bgInfo.backgroundImage ? `background-image: ${bgInfo.backgroundImage};` : ''}
        color: ${textColor};
        font-family: ${fontFamily};
        line-height: 1.55;
        font-size: 13px;
        overflow-x: hidden;
      }
      body > * { max-width: 100% !important; }
      img, video, svg { max-width: 100%; height: auto; }
      table { width: 100%; border-collapse: collapse; }
      a { color: inherit; text-decoration: none; }
    </style>
  </head>
  <body>
    ${clone.outerHTML}
  </body>
</html>`;

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
        type: 'block',
        title: tagVal ? `${tagVal} (<${tag.toUpperCase()}> Block)` : `${tag.toUpperCase()} Container from ${document.title || 'Page'}`,
        content: {
          sanitizedHtml: sanitizedHtml,
          standaloneHtml: standaloneHtml,
          rawText: rawText,
          description: `Captured ${tag} container (${Math.round(target.offsetWidth)}×${Math.round(target.offsetHeight)}px)`,
        },
        metadata: {
          sourceUrl: window.location.href,
          pageTitle: document.title || 'Source Page',
          domainFavicon: `https://www.google.com/s2/favicons?domain=${window.location.hostname}&sz=64`,
          domCssSelector: selector,
          tagName: tag.toUpperCase(),
        },
        tags: tags,
      };

      // Dual-path send
      let sentViaRuntime = false;
      try {
        if (chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({ action: 'SAVE_ATOM', payload }, (res) => {
            if (chrome.runtime.lastError) {
              directBlockFetch(payload);
            } else {
              const atomId = res?.data?.id;
          if (!atomId) {
            showToast((window.__RESEARCHIE_PROJECT_MENU__ && window.__RESEARCHIE_PROJECT_MENU__.notSavedMessage(res)) || 'Could not save. Try again.');
            return;
          }
              const projTitle = res?.projectTitle || activeProjTitle;
              showToastWithUndo(`Sent DOM block to ${projTitle}`, atomId);
            }
          });
          sentViaRuntime = true;
        }
      } catch (e) {}

      if (!sentViaRuntime) {
        await directBlockFetch(payload);
      }
    };

    async function directBlockFetch(payload) {
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
            showToastWithUndo(`Sent DOM block to timeline`, data?.data?.id);
            return;
          }
        } catch {}
      }
      showToast('Could not reach the server. Reload this page and try again.');
    }

    dialog.querySelector('#btn-block-confirm').addEventListener('click', confirmSend);
    tagInput?.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') confirmSend();
      if (e.key === 'Escape') {
        dialog.remove();
        showToast('Block Send Cancelled');
      }
    });
    tagInput?.addEventListener('keyup', (e) => e.stopPropagation());
    tagInput?.addEventListener('keypress', (e) => e.stopPropagation());
  }

  function getCssSelector(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return '';
    const path = [];
    while (el && el.nodeType === Node.ELEMENT_NODE && el !== document.body) {
      let selector = el.nodeName.toLowerCase();
      if (el.id) {
        selector += `#${el.id}`;
        path.unshift(selector);
        break;
      } else if (el.className && typeof el.className === 'string') {
        const primaryClass = el.className.trim().split(/\s+/)[0];
        if (primaryClass) selector += `.${primaryClass}`;
      }
      path.unshift(selector);
      el = el.parentNode;
    }
    return path.join(' > ');
  }

  function showToast(msg) {
    const toast = document.createElement('div');
    toast.style.position = 'fixed';
    toast.style.bottom = '24px';
    toast.style.right = '24px';
    toast.style.zIndex = '2147483647';
    toast.style.backgroundColor = '#13151A';
    toast.style.color = '#F8FAFC';
    toast.style.fontFamily = "'Figtree', sans-serif";
    toast.style.fontSize = '12px';
    toast.style.padding = '8px 14px';
    toast.style.borderRadius = '8px';
    toast.style.border = '1px solid #262B38';
    toast.style.borderLeft = '3px solid #D2F83C';
    toast.style.boxShadow = '0 10px 30px rgba(0,0,0,0.6)';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2400);
  }

  function showToastWithUndo(message, atomId) {
    const toast = document.createElement('div');
    toast.style.position = 'fixed';
    toast.style.bottom = '24px';
    toast.style.right = '24px';
    toast.style.zIndex = '2147483647';
    toast.style.backgroundColor = '#13151A';
    toast.style.color = '#F8FAFC';
    toast.style.fontFamily = "'Figtree', sans-serif";
    toast.style.fontSize = '12px';
    toast.style.padding = '8px 14px';
    toast.style.borderRadius = '8px';
    toast.style.border = '1px solid #262B38';
    toast.style.borderLeft = '3px solid #D2F83C';
    toast.style.boxShadow = '0 10px 30px rgba(0,0,0,0.6)';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '10px';

    let secondsLeft = 3;
    toast.innerHTML = `
      <span style="color:#D2F83C;font-weight:bold;">✓</span>
      <span>${message}</span>
      ${atomId ? `<button id="block-toast-undo" style="background:#262B38;border:1px solid #383E4E;color:#D2F83C;font-size:10px;font-weight:bold;padding:2px 7px;border-radius:4px;cursor:pointer;">Undo (${secondsLeft}s)</button>` : ''}
    `;
    document.body.appendChild(toast);

    let timer = null;
    if (atomId) {
      const undoBtn = toast.querySelector('#block-toast-undo');
      timer = setInterval(() => {
        secondsLeft -= 1;
        if (secondsLeft > 0 && undoBtn) {
          undoBtn.textContent = `Undo (${secondsLeft}s)`;
        } else {
          clearInterval(timer);
        }
      }, 1000);

      undoBtn?.addEventListener('click', async () => {
        clearInterval(timer);
        try {
          const result = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: 'DELETE_ATOM', atomId }, (res) => resolve(res || { success: false }));
          });
          if (!result.success) throw new Error('delete failed');
          toast.innerHTML = `<span style="color:#8B949E;">Undo successful.</span>`;
          setTimeout(() => toast.remove(), 1000);
        } catch {
          toast.innerHTML = `<span style="color:#F85149;">Could not undo. Delete it from the timeline.</span>`;
          setTimeout(() => toast.remove(), 2500);
        }
      });
    }

    setTimeout(() => {
      if (timer) clearInterval(timer);
      if (toast.parentNode) {
        toast.style.transition = 'opacity 0.25s';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 250);
      }
    }, 3400);
  }

  // Listen for trigger messages
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'TRIGGER_BLOCK_PICKER') {
      startBlockPicker();
    }
  });

  window.addEventListener('RESEARCHIE_TRIGGER_BLOCK_PICKER', () => {
    startBlockPicker();
  });
})();
