// Researchie Image Selection & Screen Marquee Cropper
(function () {
  if (window.__RESEARCHIE_CROPPER_INJECTED__) return;
  window.__RESEARCHIE_CROPPER_INJECTED__ = true;

  let isCropping = false;
  let isSelectingImage = false;
  let canvas = null;
  let ctx = null;
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let currentY = 0;
  let activeDialog = null;

  let imageOverlay = null;
  let imageBadge = null;
  let hoveredImg = null;

  // --- 1. IMAGE SELECTOR MODE (Direct Image Grab) ---
  function initImageOverlay() {
    if (imageOverlay) return;

    imageOverlay = document.createElement('div');
    imageOverlay.id = 'researchie-image-overlay';
    imageOverlay.style.position = 'fixed';
    imageOverlay.style.pointerEvents = 'none';
    imageOverlay.style.zIndex = '2147483640';
    imageOverlay.style.border = '2px solid #FAFAFA';
    imageOverlay.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
    imageOverlay.style.display = 'none';
    imageOverlay.style.borderRadius = '6px';
    imageOverlay.style.boxShadow = '0 0 0 1px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.4)';

    imageBadge = document.createElement('div');
    imageBadge.id = 'researchie-image-badge';
    imageBadge.style.position = 'absolute';
    imageBadge.style.top = '-28px';
    imageBadge.style.left = '0';
    imageBadge.style.backgroundColor = '#121214';
    imageBadge.style.color = '#FAFAFA';
    imageBadge.style.border = '1px solid #27272A';
    imageBadge.style.padding = '2px 8px';
    imageBadge.style.borderRadius = '4px';
    imageBadge.style.fontFamily = "'JetBrains Mono', monospace";
    imageBadge.style.fontSize = '11px';
    imageBadge.style.fontWeight = 'bold';
    imageBadge.style.whiteSpace = 'nowrap';

    imageOverlay.appendChild(imageBadge);
    document.documentElement.appendChild(imageOverlay);
  }

  function startImageSelector() {
    if (isSelectingImage) return;
    isSelectingImage = true;
    initImageOverlay();

    document.addEventListener('mouseover', handleImageHover, true);
    document.addEventListener('click', handleImageClick, true);
    document.addEventListener('keydown', handleImageKeyDown, true);

    showToast('Image Select Active • Hover image & click to send.');
  }

  function stopImageSelector() {
    if (!isSelectingImage) return;
    isSelectingImage = false;

    if (imageOverlay) imageOverlay.style.display = 'none';
    document.removeEventListener('mouseover', handleImageHover, true);
    document.removeEventListener('click', handleImageClick, true);
    document.removeEventListener('keydown', handleImageKeyDown, true);
  }

  function handleImageHover(e) {
    if (!isSelectingImage) return;
    const target = e.target;
    if (!target) return;

    const isImg = target.tagName === 'IMG' || target.tagName === 'SVG' || target.tagName === 'PICTURE' || target.tagName === 'CANVAS';
    if (!isImg) {
      if (imageOverlay) imageOverlay.style.display = 'none';
      hoveredImg = null;
      return;
    }

    e.stopPropagation();
    hoveredImg = target;
    const rect = target.getBoundingClientRect();

    imageOverlay.style.display = 'block';
    imageOverlay.style.top = `${rect.top}px`;
    imageOverlay.style.left = `${rect.left}px`;
    imageOverlay.style.width = `${rect.width}px`;
    imageOverlay.style.height = `${rect.height}px`;
    imageBadge.textContent = `IMG [${Math.round(rect.width)}×${Math.round(rect.height)}] • Click to send`;
  }

  function handleImageKeyDown(e) {
    if (!isSelectingImage) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      stopImageSelector();
      showToast('Image Select Cancelled');
    }
  }

  function handleImageClick(e) {
    if (!isSelectingImage || !hoveredImg) return;
    e.preventDefault();
    e.stopPropagation();

    const target = hoveredImg;
    stopImageSelector();
    showImageConfirmationDialog(target);
  }

  function showImageConfirmationDialog(target) {
    if (activeDialog) activeDialog.remove();

    const src = target.src || target.currentSrc || target.getAttribute('src') || '';
    const alt = target.alt || document.title || 'Captured Web Image';
    const rect = target.getBoundingClientRect();

    const dialog = document.createElement('div');
    dialog.id = 'researchie-crop-dialog';
    dialog.style.position = 'fixed';
    dialog.style.top = `${Math.min(window.innerHeight - 220, Math.max(20, rect.bottom + 10))}px`;
    dialog.style.left = `${Math.min(window.innerWidth - 300, Math.max(20, rect.left))}px`;
    dialog.style.zIndex = '2147483647';
    dialog.style.backgroundColor = '#121214';
    dialog.style.border = '1px solid #27272A';
    dialog.style.borderRadius = '10px';
    dialog.style.padding = '12px 16px';
    dialog.style.boxShadow = '0 12px 36px rgba(0,0,0,0.8)';
    dialog.style.color = '#FAFAFA';
    dialog.style.fontFamily = "'Figtree', sans-serif";
    dialog.style.fontSize = '12px';
    dialog.style.minWidth = '260px';

    dialog.innerHTML = `
      <div style="font-weight:700;margin-bottom:4px;font-family:'Figtree',sans-serif;color:#FAFAFA;">Send Image to Project?</div>
      <div style="color:#A1A1AA;font-size:11px;margin-bottom:8px;">Size: ${Math.round(target.offsetWidth)}×${Math.round(target.offsetHeight)}px</div>
      <div style="max-height:80px;overflow:hidden;border-radius:5px;margin-bottom:8px;background:#09090B;border:1px solid #27272A;display:flex;align-items:center;justify-content:center;">
        <img src="${src}" style="max-height:80px;max-width:100%;object-fit:contain;" />
      </div>
      <div style="margin-bottom:10px;">
        <input id="img-tag-input" type="text" placeholder="Add tag (optional, e.g. #diagram)" style="width:100%;box-sizing:border-box;background:#18181B;border:1px solid #27272A;border-radius:6px;padding:6px 8px;color:#FAFAFA;font-size:11px;outline:none;" />
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button id="btn-img-cancel" style="background:#18181B;border:1px solid #27272A;color:#FAFAFA;padding:5px 10px;border-radius:5px;font-size:11px;cursor:pointer;">Cancel</button>
        <button id="btn-img-confirm" style="background:#FAFAFA;border:none;color:#09090B;padding:5px 12px;border-radius:5px;font-weight:700;font-size:11px;cursor:pointer;">Yes, Send</button>
      </div>
    `;

    document.body.appendChild(dialog);
    activeDialog = dialog;

    const tagInput = dialog.querySelector('#img-tag-input');
    tagInput?.focus();

    dialog.querySelector('#btn-img-cancel').addEventListener('click', () => {
      dialog.remove();
      activeDialog = null;
      showToast('Image Send Cancelled');
    });

    const confirmSend = async () => {
      const tagVal = tagInput?.value.trim() || '';
      const tags = tagVal ? [tagVal.replace(/^#/, '')] : ['image'];
      dialog.remove();
      activeDialog = null;

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
        type: 'image',
        title: tagVal ? `${tagVal} (${alt.slice(0, 50)})` : alt.slice(0, 80),
        content: {
          imageUrl: src,
          description: `Direct image capture (${Math.round(target.offsetWidth)}×${Math.round(target.offsetHeight)}px)`,
        },
        metadata: {
          sourceUrl: window.location.href,
          pageTitle: document.title,
          domainFavicon: `https://www.google.com/s2/favicons?domain=${window.location.hostname}&sz=64`,
        },
        tags: tags,
      };

      let sentViaRuntime = false;
      try {
        if (chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({ action: 'SAVE_ATOM', payload }, (res) => {
            if (chrome.runtime.lastError) {
              directImageFetch(payload);
            } else {
              const atomId = res?.data?.id;
              const projTitle = res?.projectTitle || activeProjTitle;
              showToastWithUndo(`Sent image to ${projTitle}`, atomId);
            }
          });
          sentViaRuntime = true;
        }
      } catch (e) {}

      if (!sentViaRuntime) {
        await directImageFetch(payload);
      }
    };

    async function directImageFetch(payload) {
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
            showToastWithUndo(`Sent image to timeline`, data?.data?.id);
            return;
          }
        } catch {}
      }
      showToast('Sent image (queued for sync)');
    }

    dialog.querySelector('#btn-img-confirm').addEventListener('click', confirmSend);
    tagInput?.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') confirmSend();
      if (e.key === 'Escape') {
        dialog.remove();
        activeDialog = null;
        showToast('Image Send Cancelled');
      }
    });
    tagInput?.addEventListener('keyup', (e) => e.stopPropagation());
    tagInput?.addEventListener('keypress', (e) => e.stopPropagation());
  }

  // --- 2. SCREENSHOT MARQUEE CROPPER ---
  function initCropper() {
    if (canvas) return;

    canvas = document.createElement('canvas');
    canvas.id = 'researchie-crop-canvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.zIndex = '2147483646';
    canvas.style.cursor = 'crosshair';
    canvas.style.display = 'none';

    document.documentElement.appendChild(canvas);
    ctx = canvas.getContext('2d');
  }

  function startCropper() {
    if (isCropping) return;
    isCropping = true;
    initCropper();

    if (activeDialog) {
      activeDialog.remove();
      activeDialog = null;
    }

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.display = 'block';
    canvas.style.pointerEvents = 'auto';

    drawOverlay();

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keydown', handleKeyDown);

    showToast('Screenshot Active • Drag a box over any region. (Esc to cancel)');
  }

  function stopCropper() {
    isCropping = false;

    if (canvas) {
      canvas.style.display = 'none';
      canvas.style.pointerEvents = 'none';
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
    }
    document.removeEventListener('keydown', handleKeyDown);
  }

  function drawOverlay(x1, y1, x2, y2) {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (x1 !== undefined && y1 !== undefined && x2 !== undefined && y2 !== undefined) {
      const rx = Math.min(x1, x2);
      const ry = Math.min(y1, y2);
      const rw = Math.abs(x2 - x1);
      const rh = Math.abs(y2 - y1);

      ctx.clearRect(rx, ry, rw, rh);
      ctx.strokeStyle = '#D2F83C';
      ctx.lineWidth = 2;
      ctx.strokeRect(rx, ry, rw, rh);
    }
  }

  function handleMouseDown(e) {
    startX = e.clientX;
    startY = e.clientY;
    currentX = e.clientX;
    currentY = e.clientY;
  }

  function handleMouseMove(e) {
    if (e.buttons !== 1) return;
    currentX = e.clientX;
    currentY = e.clientY;
    drawOverlay(startX, startY, currentX, currentY);
  }

  function handleMouseUp(e) {
    const rx = Math.min(startX, currentX);
    const ry = Math.min(startY, currentY);
    const rw = Math.abs(currentX - startX);
    const rh = Math.abs(currentY - startY);

    stopCropper();

    if (rw < 15 || rh < 15) {
      return;
    }

    // Show Confirmation Dialog
    showCropConfirmationDialog(rx, ry, rw, rh);
  }

  function showCropConfirmationDialog(x, y, width, height) {
    if (activeDialog) activeDialog.remove();

    const dialog = document.createElement('div');
    dialog.id = 'researchie-crop-dialog';
    dialog.style.position = 'fixed';
    dialog.style.top = `${Math.min(window.innerHeight - 170, Math.max(20, y + height + 10))}px`;
    dialog.style.left = `${Math.min(window.innerWidth - 290, Math.max(20, x))}px`;
    dialog.style.zIndex = '2147483647';
    dialog.style.backgroundColor = '#121214';
    dialog.style.border = '1px solid #27272A';
    dialog.style.borderRadius = '10px';
    dialog.style.padding = '12px 16px';
    dialog.style.boxShadow = '0 12px 36px rgba(0,0,0,0.8)';
    dialog.style.color = '#FAFAFA';
    dialog.style.fontFamily = "'Figtree', sans-serif";
    dialog.style.fontSize = '12px';
    dialog.style.minWidth = '250px';

    dialog.innerHTML = `
      <div style="font-weight:700;margin-bottom:4px;font-family:'Figtree',sans-serif;color:#FAFAFA;">Send Screenshot to Project?</div>
      <div style="color:#A1A1AA;font-size:11px;margin-bottom:8px;">Area: ${Math.round(width)}×${Math.round(height)}px</div>
      <div style="margin-bottom:10px;">
        <input id="crop-tag-input" type="text" placeholder="Add tag (optional, e.g. #pricing)" style="width:100%;box-sizing:border-box;background:#18181B;border:1px solid #27272A;border-radius:6px;padding:6px 8px;color:#FAFAFA;font-size:11px;outline:none;" />
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button id="btn-crop-cancel" style="background:#18181B;border:1px solid #27272A;color:#FAFAFA;padding:5px 10px;border-radius:5px;font-size:11px;cursor:pointer;">Cancel</button>
        <button id="btn-crop-confirm" style="background:#FAFAFA;border:none;color:#09090B;padding:5px 12px;border-radius:5px;font-weight:700;font-size:11px;cursor:pointer;">Yes, Send</button>
      </div>
    `;

    document.body.appendChild(dialog);
    activeDialog = dialog;

    const tagInput = dialog.querySelector('#crop-tag-input');
    tagInput?.focus();

    dialog.querySelector('#btn-crop-cancel').addEventListener('click', () => {
      dialog.remove();
      activeDialog = null;
      stopCropper();
      showToast('Screenshot Cancelled');
    });

    const confirmCrop = async () => {
      const tagVal = tagInput?.value.trim() || '';
      const tags = tagVal ? [tagVal.replace(/^#/, '')] : ['screenshot'];

      dialog.remove();
      activeDialog = null;
      stopCropper();

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

      chrome.runtime.sendMessage(
        {
          action: 'CAPTURE_SCREEN_AREA',
          projectId: activeProjId,
          bounds: { x, y, width, height, devicePixelRatio: window.devicePixelRatio },
          tag: tagVal,
          tags: tags,
        },
        (res) => {
          const atomId = res?.data?.id;
          const projTitle = res?.projectTitle || activeProjTitle;
          showToastWithUndo(`Sent screenshot to ${projTitle}`, atomId);
        }
      );
    };

    dialog.querySelector('#btn-crop-confirm').addEventListener('click', confirmCrop);
    tagInput?.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') confirmCrop();
      if (e.key === 'Escape') {
        dialog.remove();
        activeDialog = null;
        stopCropper();
        showToast('Screenshot Cancelled');
      }
    });
    tagInput?.addEventListener('keyup', (e) => e.stopPropagation());
    tagInput?.addEventListener('keypress', (e) => e.stopPropagation());
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      stopCropper();
      if (activeDialog) {
        activeDialog.remove();
        activeDialog = null;
      }
      showToast('Screenshot Cancelled');
    }
  }

  function showToast(msg) {
    const toast = document.createElement('div');
    toast.style.position = 'fixed';
    toast.style.bottom = '24px';
    toast.style.right = '24px';
    toast.style.zIndex = '2147483647';
    toast.style.backgroundColor = '#121214';
    toast.style.color = '#FAFAFA';
    toast.style.fontFamily = "'Figtree', sans-serif";
    toast.style.fontSize = '12px';
    toast.style.padding = '8px 14px';
    toast.style.borderRadius = '8px';
    toast.style.border = '1px solid #27272A';
    toast.style.borderLeft = '3px solid #FAFAFA';
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
      ${atomId ? `<button id="img-toast-undo" style="background:#262B38;border:1px solid #383E4E;color:#D2F83C;font-size:10px;font-weight:bold;padding:2px 7px;border-radius:4px;cursor:pointer;">Undo (${secondsLeft}s)</button>` : ''}
    `;
    document.body.appendChild(toast);

    let timer = null;
    if (atomId) {
      const undoBtn = toast.querySelector('#img-toast-undo');
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
        toast.style.transition = 'opacity 0.25s, transform 0.25s';
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(6px)';
        setTimeout(() => toast.remove(), 250);
      }
    }, 3400);
  }

  // Listen for trigger messages
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'TRIGGER_IMAGE_SELECTOR') {
      startImageSelector();
    } else if (message.action === 'TRIGGER_IMAGE_CROPPER') {
      startCropper();
    }
  });

  window.addEventListener('RESEARCHIE_TRIGGER_IMAGE_SELECTOR', () => {
    startImageSelector();
  });

  window.addEventListener('RESEARCHIE_TRIGGER_IMAGE_CROPPER', () => {
    startCropper();
  });
})();
