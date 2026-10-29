/**
 * Mural de Estética: canvas infinito de referências visuais.
 * Posição, tamanho e câmera são persistidos no próprio projeto.
 */
class MoodboardModule {
  constructor() {
    this.viewportState = { x: null, y: null, zoom: 1 };
    this.interaction = null;
    this.spaceHeld = false;
    this.selectedItemId = null;
    this.currentProjectId = null;
    this.viewportSaveTimer = null;
    this.snapEnabled = localStorage.getItem('scryba_moodboard_snap_enabled') !== 'false';
    this.initElements();
    this.bindEvents();
  }

  initElements() {
    this.grid = document.getElementById('moodboard-grid');
    this.world = document.getElementById('moodboard-world');
    this.view = document.querySelector('.moodboard-view');
    this.emptyState = document.getElementById('moodboard-empty-state');
    this.btnAddItem = document.getElementById('btn-add-moodboard');
    this.btnZoomOut = document.getElementById('btn-moodboard-zoom-out');
    this.btnZoomIn = document.getElementById('btn-moodboard-zoom-in');
    this.btnResetView = document.getElementById('btn-moodboard-reset-view');
    this.zoomLabel = document.getElementById('moodboard-zoom-level');
    this.btnSnap = document.getElementById('btn-moodboard-snap');
    this.snapGuides = document.getElementById('moodboard-snap-guides');
    this.snapGuideX = this.snapGuides?.querySelector('.moodboard-snap-guide-x');
    this.snapGuideY = this.snapGuides?.querySelector('.moodboard-snap-guide-y');
    this.modal = document.getElementById('modal-moodboard');
    this.form = document.getElementById('form-moodboard');
    this.btnCloseModal = document.getElementById('btn-close-moodboard-modal');
    this.btnCancelModal = document.getElementById('btn-cancel-moodboard-modal');
    this.inputTitle = document.getElementById('mb-title');
    this.inputUrl = document.getElementById('mb-url');
    this.inputNotes = document.getElementById('mb-notes');
    this.btnBrowseLocal = document.getElementById('btn-browse-image');
    this.fileDropTarget = document.getElementById('mb-file-drop-target');
  }

  bindEvents() {
    this.btnAddItem?.addEventListener('click', () => this.openImageModal());
    this.btnCloseModal?.addEventListener('click', () => this.closeImageModal());
    this.btnCancelModal?.addEventListener('click', () => this.closeImageModal());
    this.modal?.addEventListener('click', event => {
      if (event.target === this.modal) this.closeImageModal();
    });

    this.btnZoomIn?.addEventListener('click', () => this.zoomAtCenter(1.2));
    this.btnZoomOut?.addEventListener('click', () => this.zoomAtCenter(1 / 1.2));
    this.btnResetView?.addEventListener('click', () => this.resetView());
    this.btnSnap?.addEventListener('click', () => this.toggleMagneticAlignment());
    this.grid?.addEventListener('wheel', event => this.handleWheel(event), { passive: false });
    this.grid?.addEventListener('pointerdown', event => this.handlePointerDown(event));
    this.grid?.addEventListener('pointermove', event => this.handlePointerMove(event));
    this.grid?.addEventListener('pointerup', event => this.finishPointerInteraction(event));
    this.grid?.addEventListener('pointercancel', event => this.finishPointerInteraction(event));
    this.grid?.addEventListener('lostpointercapture', event => this.finishPointerInteraction(event));
    this.world?.addEventListener('click', event => this.handleWorldClick(event));

    this.grid?.addEventListener('dragenter', event => this.handleDragEnter(event));
    this.grid?.addEventListener('dragover', event => this.handleDragOver(event));
    this.grid?.addEventListener('dragleave', event => this.handleDragLeave(event));
    this.grid?.addEventListener('drop', event => this.handleDrop(event));
    this.modal?.addEventListener('dragover', event => {
      if (this.hasImageFiles(event.dataTransfer)) event.preventDefault();
    });
    this.modal?.addEventListener('drop', event => {
      if (!this.hasImageFiles(event.dataTransfer) || event.target.closest('#mb-file-drop-target')) return;
      event.preventDefault();
      this.handleFormDrop(event);
    });
    this.fileDropTarget?.addEventListener('dragover', event => {
      if (!this.hasImageFiles(event.dataTransfer)) return;
      event.preventDefault();
      this.fileDropTarget.classList.add('is-drag-over');
    });
    this.fileDropTarget?.addEventListener('dragleave', () => this.fileDropTarget.classList.remove('is-drag-over'));
    this.fileDropTarget?.addEventListener('drop', event => {
      this.fileDropTarget.classList.remove('is-drag-over');
      this.handleFormDrop(event);
    });

    this.btnBrowseLocal?.addEventListener('click', async () => {
      const result = await window.nativeAPI?.selectImage?.();
      if (result?.success && result.filePath) this.inputUrl.value = result.fileUrl || result.filePath;
    });
    this.form?.addEventListener('submit', event => {
      event.preventDefault();
      this.handleSaveItem();
    });
    this.updateSnapButton();

    window.addEventListener('keydown', event => {
      if (event.code !== 'Space' || this.isTypingTarget(event.target) || event.target.closest?.('button, a, [role="button"]') || !this.isCanvasVisible()) return;
      this.spaceHeld = true;
      event.preventDefault();
      this.grid?.classList.add('is-space-panning');
    });
    window.addEventListener('keyup', event => {
      if (event.code !== 'Space') return;
      this.spaceHeld = false;
      this.grid?.classList.remove('is-space-panning');
    });
    window.addEventListener('blur', () => {
      this.spaceHeld = false;
      this.grid?.classList.remove('is-space-panning');
      this.finishPointerInteraction();
    });

    window.appState.subscribe(() => this.renderGrid());
    this.renderGrid();
  }

  isTypingTarget(target) {
    return Boolean(target?.closest?.('input, textarea, select, [contenteditable="true"]'));
  }

  isCanvasVisible() {
    return Boolean(this.grid && this.grid.getBoundingClientRect().width && this.grid.getBoundingClientRect().height);
  }

  toggleMagneticAlignment() {
    this.snapEnabled = !this.snapEnabled;
    localStorage.setItem('scryba_moodboard_snap_enabled', String(this.snapEnabled));
    this.updateSnapButton();
    this.clearSnapGuides();
  }

  updateSnapButton() {
    if (!this.btnSnap) return;
    this.btnSnap.classList.toggle('is-active', this.snapEnabled);
    this.btnSnap.setAttribute('aria-pressed', String(this.snapEnabled));
    this.btnSnap.title = `Alinhamento magnético ${this.snapEnabled ? 'ligado' : 'desligado'}`;
  }

  clearSnapGuides() {
    if (!this.snapGuides) return;
    this.snapGuides.classList.remove('is-visible');
    if (this.snapGuideX) this.snapGuideX.hidden = true;
    if (this.snapGuideY) this.snapGuideY.hidden = true;
  }

  updateSnapGuides(x, y) {
    if (!this.snapGuides) return;
    const rect = this.getViewportRect();
    this.snapGuides.classList.toggle('is-visible', x !== null || y !== null);
    if (this.snapGuideX) {
      this.snapGuideX.hidden = x === null;
      if (x !== null) this.snapGuideX.style.left = `${x * this.viewportState.zoom + this.viewportState.x}px`;
    }
    if (this.snapGuideY) {
      this.snapGuideY.hidden = y === null;
      if (y !== null) this.snapGuideY.style.top = `${y * this.viewportState.zoom + this.viewportState.y}px`;
    }
    this.snapGuides.style.setProperty('--snap-guide-height', `${rect.height}px`);
    this.snapGuides.style.setProperty('--snap-guide-width', `${rect.width}px`);
  }

  getMagneticTarget(item, target, others) {
    if (!this.snapEnabled) return { target, x: null, y: null };
    const threshold = 10 / this.viewportState.zoom;
    const choose = (axis, candidates, current, baseTarget = target) => {
      let best = null;
      for (const option of candidates) {
        const distance = Math.abs(option.value - current);
        if (distance > threshold || (best && distance >= best.distance)) continue;
        const probe = axis === 'x'
          ? { x: option.value, y: baseTarget.y, width: item.width, height: item.height }
          : { x: baseTarget.x, y: option.value, width: item.width, height: item.height };
        if (others.some(other => this.rectanglesOverlap(probe, other))) continue;
        best = { ...option, distance };
      }
      return best;
    };
    const xCandidates = [];
    const yCandidates = [];
    for (const other of others) {
      const centerX = other.x + other.width / 2;
      const centerY = other.y + other.height / 2;
      xCandidates.push(
        { value: other.x, guide: other.x },
        { value: other.x + other.width - item.width, guide: other.x + other.width },
        { value: other.x + other.width + 2, guide: other.x + other.width + 1 },
        { value: other.x - item.width - 2, guide: other.x - 1 },
        { value: centerX - item.width / 2, guide: centerX }
      );
      yCandidates.push(
        { value: other.y, guide: other.y },
        { value: other.y + other.height - item.height, guide: other.y + other.height },
        { value: other.y + other.height + 2, guide: other.y + other.height + 1 },
        { value: other.y - item.height - 2, guide: other.y - 1 },
        { value: centerY - item.height / 2, guide: centerY }
      );
    }
    const viewport = this.getViewportRect();
    const canvasCenterX = (viewport.width / 2 - this.viewportState.x) / this.viewportState.zoom;
    const canvasCenterY = (viewport.height / 2 - this.viewportState.y) / this.viewportState.zoom;
    xCandidates.push({ value: canvasCenterX - item.width / 2, guide: canvasCenterX });
    yCandidates.push({ value: canvasCenterY - item.height / 2, guide: canvasCenterY });
    const snapX = choose('x', xCandidates, target.x);
    const snappedTarget = { x: snapX?.value ?? target.x, y: target.y };
    const snapY = choose('y', yCandidates, target.y, snappedTarget);
    snappedTarget.y = snapY?.value ?? target.y;
    return { target: snappedTarget, x: snapX?.guide ?? null, y: snapY?.guide ?? null };
  }

  getMagneticResizeWidth(interaction, targetWidth, ratio, others, shapeAtWidth) {
    if (!this.snapEnabled) return { width: targetWidth, x: null, y: null };
    const direction = interaction.direction || 'se';
    const fromWest = direction.includes('w');
    const fromNorth = direction.includes('n');
    const anchorX = fromWest ? interaction.x + interaction.width : interaction.x;
    const anchorY = fromNorth ? interaction.y + interaction.height : interaction.y;
    const candidates = [];
    const addAxisCandidates = (axis, guides) => {
      const fromNearEdge = axis === 'x' ? fromWest : fromNorth;
      const anchor = axis === 'x' ? anchorX : anchorY;
      const scale = axis === 'x' ? 1 : ratio;
      const featureAt = (width, alignment) => {
        const shape = shapeAtWidth(width);
        if (axis === 'x') return alignment === 'center' ? shape.x + shape.width / 2 : fromWest ? shape.x : shape.x + shape.width;
        return alignment === 'center' ? shape.y + shape.height / 2 : fromNorth ? shape.y : shape.y + shape.height;
      };
      for (const guide of guides) {
        for (const alignment of ['edge', 'center']) {
          const multiplier = alignment === 'center' ? 2 : 1;
          const width = fromNearEdge
            ? (anchor - guide) * multiplier / scale
            : (guide - anchor) * multiplier / scale;
          if (!Number.isFinite(width) || width < 120) continue;
          const distance = Math.abs(featureAt(targetWidth, alignment) - guide) * this.viewportState.zoom;
          if (distance <= 10) candidates.push({ width, axis, guide, distance: Math.abs(width - targetWidth) * scale * this.viewportState.zoom });
        }
      }
    };

    const xGuides = [];
    const yGuides = [];
    for (const other of others) {
      xGuides.push(other.x, other.x + other.width, other.x + other.width / 2);
      yGuides.push(other.y, other.y + other.height, other.y + other.height / 2);
    }
    const viewport = this.getViewportRect();
    const centerX = (viewport.width / 2 - this.viewportState.x) / this.viewportState.zoom;
    const centerY = (viewport.height / 2 - this.viewportState.y) / this.viewportState.zoom;
    xGuides.push(centerX);
    yGuides.push(centerY);
    addAxisCandidates('x', xGuides);
    addAxisCandidates('y', yGuides);

    candidates.sort((a, b) => a.distance - b.distance);
    const chosen = candidates.find(candidate => !others.some(other => this.rectanglesOverlap(shapeAtWidth(candidate.width), other)));
    if (!chosen) return { width: targetWidth, x: null, y: null };
    const matching = candidates.filter(candidate => Math.abs(candidate.width - chosen.width) * this.viewportState.zoom < 0.5);
    return {
      width: chosen.width,
      x: matching.find(candidate => candidate.axis === 'x')?.guide ?? null,
      y: matching.find(candidate => candidate.axis === 'y')?.guide ?? null
    };
  }

  openImageModal() {
    this.form?.reset();
    this.modal?.classList.add('active');
    this.modal?.setAttribute('aria-hidden', 'false');
  }

  closeImageModal() {
    this.modal?.classList.remove('active');
    this.modal?.setAttribute('aria-hidden', 'true');
  }

  getProject() {
    return window.appState.getActiveProject();
  }

  getItems() {
    const project = this.getProject();
    if (!project) return [];
    if (!Array.isArray(project.moodboard)) project.moodboard = [];
    return project.moodboard;
  }

  rectanglesOverlap(a, b, gap = 2) {
    return a.x < b.x + b.width + gap && a.x + a.width + gap > b.x &&
      a.y < b.y + b.height + gap && a.y + a.height + gap > b.y;
  }

  findFreePosition(item, x, y, others, gap = 2) {
    const xCandidates = new Set([x]);
    const yCandidates = new Set([y]);
    for (const other of others) {
      xCandidates.add(other.x - item.width - gap);
      xCandidates.add(other.x + other.width + gap);
      yCandidates.add(other.y - item.height - gap);
      yCandidates.add(other.y + other.height + gap);
    }
    const rightEdge = Math.max(x, ...others.map(other => other.x + other.width + gap));
    const leftEdge = Math.min(x, ...others.map(other => other.x - item.width - gap));
    xCandidates.add(rightEdge);
    xCandidates.add(leftEdge);
    let best = null;
    let bestDistance = Infinity;
    for (const candidateX of xCandidates) {
      for (const candidateY of yCandidates) {
        const candidate = { x: candidateX, y: candidateY, width: item.width, height: item.height };
        if (others.some(other => this.rectanglesOverlap(candidate, other, gap))) continue;
        const distance = (candidateX - x) ** 2 + (candidateY - y) ** 2;
        if (distance < bestDistance) {
          best = { x: candidateX, y: candidateY };
          bestDistance = distance;
        }
      }
    }
    return best || { x: rightEdge, y };
  }

  moveWithoutCollision(item, from, target, others) {
    const distance = Math.hypot(target.x - from.x, target.y - from.y);
    const steps = Math.max(1, Math.ceil(distance / 12));
    let last = { x: from.x, y: from.y };
    for (let step = 1; step <= steps; step += 1) {
      const fraction = step / steps;
      const candidate = {
        x: from.x + (target.x - from.x) * fraction,
        y: from.y + (target.y - from.y) * fraction,
        width: item.width, height: item.height
      };
      if (others.some(other => this.rectanglesOverlap(candidate, other))) {
        let low = (step - 1) / steps;
        let high = fraction;
        for (let iteration = 0; iteration < 14; iteration += 1) {
          const middle = (low + high) / 2;
          const probe = {
            x: from.x + (target.x - from.x) * middle,
            y: from.y + (target.y - from.y) * middle,
            width: item.width, height: item.height
          };
          if (others.some(other => this.rectanglesOverlap(probe, other))) high = middle;
          else low = middle;
        }
        last = {
          x: from.x + (target.x - from.x) * low,
          y: from.y + (target.y - from.y) * low
        };
        break;
      }
      last = { x: candidate.x, y: candidate.y };
    }
    return last;
  }

  normalizeItemPositions(items) {
    const placed = [];
    let changed = false;
    for (const item of items) {
      const position = this.findFreePosition(item, item.x, item.y, placed);
      if (position.x !== item.x || position.y !== item.y) {
        item.x = position.x;
        item.y = position.y;
        changed = true;
      }
      placed.push(item);
    }
    return changed;
  }

  getViewportRect() {
    return this.grid.getBoundingClientRect();
  }

  ensureViewport(project) {
    const rect = this.getViewportRect();
    const saved = project.moodboardViewport;
    if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y) && Number.isFinite(saved.zoom)) {
      this.viewportState = { x: saved.x, y: saved.y, zoom: this.clampZoom(saved.zoom) };
    } else {
      this.viewportState = {
        x: rect.width ? rect.width / 2 : null,
        y: rect.height ? rect.height / 2 : null,
        zoom: 1
      };
    }
  }

  toWorldPoint(clientX, clientY) {
    const rect = this.getViewportRect();
    return {
      x: (clientX - rect.left - this.viewportState.x) / this.viewportState.zoom,
      y: (clientY - rect.top - this.viewportState.y) / this.viewportState.zoom
    };
  }

  applyViewport() {
    if (!this.world || this.viewportState.x === null) return;
    const { x, y, zoom } = this.viewportState;
    this.world.style.transform = `translate(${x}px, ${y}px) scale(${zoom})`;
    this.grid.style.backgroundPosition = `${x}px ${y}px`;
    this.grid.style.backgroundSize = `${24 * zoom}px ${24 * zoom}px`;
    if (this.zoomLabel) this.zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
  }

  clampZoom(zoom) {
    return Math.max(0.2, Math.min(3, zoom));
  }

  handleWheel(event) {
    event.preventDefault();
    const rect = this.getViewportRect();
    const cursorX = event.clientX - rect.left;
    const cursorY = event.clientY - rect.top;
    const oldZoom = this.viewportState.zoom;
    const nextZoom = this.clampZoom(oldZoom * Math.exp(-event.deltaY * 0.0015));
    if (nextZoom === oldZoom) return;
    const worldX = (cursorX - this.viewportState.x) / oldZoom;
    const worldY = (cursorY - this.viewportState.y) / oldZoom;
    this.viewportState.zoom = nextZoom;
    this.viewportState.x = cursorX - worldX * nextZoom;
    this.viewportState.y = cursorY - worldY * nextZoom;
    this.applyViewport();
    this.scheduleViewportSave();
  }

  zoomAtCenter(factor) {
    const rect = this.getViewportRect();
    this.zoomAtPoint(rect.left + rect.width / 2, rect.top + rect.height / 2, factor);
  }

  zoomAtPoint(clientX, clientY, factor) {
    const rect = this.getViewportRect();
    const cursorX = clientX - rect.left;
    const cursorY = clientY - rect.top;
    const oldZoom = this.viewportState.zoom;
    const nextZoom = this.clampZoom(oldZoom * factor);
    if (nextZoom === oldZoom) return;
    const worldX = (cursorX - this.viewportState.x) / oldZoom;
    const worldY = (cursorY - this.viewportState.y) / oldZoom;
    this.viewportState.zoom = nextZoom;
    this.viewportState.x = cursorX - worldX * nextZoom;
    this.viewportState.y = cursorY - worldY * nextZoom;
    this.applyViewport();
    this.scheduleViewportSave();
  }

  resetView() {
    const rect = this.getViewportRect();
    this.viewportState = { x: rect.width / 2, y: rect.height / 2, zoom: 1 };
    this.applyViewport();
    this.persistViewport();
  }

  handlePointerDown(event) {
    if (event.button !== 0) return;
    clearTimeout(this.viewportSaveTimer);
    const card = event.target.closest('.moodboard-item');
      const resizeHandle = event.target.closest('[data-moodboard-resize]');
    const deleteButton = event.target.closest('[data-moodboard-delete]');
    if (deleteButton) return;

    if (card && !this.spaceHeld) {
      const item = this.getItems().find(entry => entry.id === card.dataset.id);
      if (!item) return;
      this.selectedItemId = item.id;
      this.world.querySelectorAll('.moodboard-item').forEach(element => element.classList.toggle('is-selected', element === card));
      event.preventDefault();
      event.stopPropagation();
      this.interaction = resizeHandle
        ? { type: 'resize', item, direction: resizeHandle.dataset.moodboardResize, startX: event.clientX, startY: event.clientY, x: item.x, y: item.y, width: item.width, height: item.height, lastWidth: item.width, pointerId: event.pointerId }
        : { type: 'move', item, startX: event.clientX, startY: event.clientY, x: item.x, y: item.y, lastX: item.x, lastY: item.y, pointerId: event.pointerId };
      card.classList.add('is-interacting');
      this.capturePointer(event);
      return;
    }

    if (!card || this.spaceHeld) {
      event.preventDefault();
      this.selectedItemId = null;
      this.world?.querySelectorAll('.moodboard-item.is-selected').forEach(element => element.classList.remove('is-selected'));
      this.interaction = {
        type: 'pan', pointerId: event.pointerId,
        startX: event.clientX, startY: event.clientY,
        x: this.viewportState.x, y: this.viewportState.y
      };
      this.grid.classList.add('is-panning');
      this.capturePointer(event);
    }
  }

  capturePointer(event) {
    try { this.grid.setPointerCapture(event.pointerId); } catch (_) {}
  }

  handlePointerMove(event) {
    if (!this.interaction || (this.interaction.pointerId !== undefined && event.pointerId !== this.interaction.pointerId)) return;
    const interaction = this.interaction;
    const deltaX = event.clientX - interaction.startX;
    const deltaY = event.clientY - interaction.startY;
    if (interaction.type === 'pan') {
      this.viewportState.x = interaction.x + deltaX;
      this.viewportState.y = interaction.y + deltaY;
      this.applyViewport();
    } else if (interaction.type === 'move') {
      const others = this.getItems().filter(item => item.id !== interaction.item.id);
      const magnetic = this.getMagneticTarget(interaction.item, {
        x: interaction.x + deltaX / this.viewportState.zoom,
        y: interaction.y + deltaY / this.viewportState.zoom
      }, others);
      const position = this.moveWithoutCollision(interaction.item,
        { x: interaction.lastX, y: interaction.lastY },
        magnetic.target,
        others);
      interaction.item.x = interaction.lastX = position.x;
      interaction.item.y = interaction.lastY = position.y;
      this.positionCard(interaction.item);
      this.updateSnapGuides(
        magnetic.x !== null && Math.abs(position.x - magnetic.target.x) < 0.5 ? magnetic.x : null,
        magnetic.y !== null && Math.abs(position.y - magnetic.target.y) < 0.5 ? magnetic.y : null
      );
    } else if (interaction.type === 'resize') {
      const direction = interaction.direction || 'se';
      const horizontalSign = direction.includes('w') ? -1 : 1;
      const verticalSign = direction.includes('n') ? -1 : 1;
      const ratio = interaction.height / interaction.width;
      const widthDelta = Math.abs(deltaX) >= Math.abs(deltaY)
        ? deltaX * horizontalSign / this.viewportState.zoom
        : deltaY * verticalSign / this.viewportState.zoom / ratio;
      const requestedWidth = Math.max(120, interaction.width + widthDelta);
      const others = this.getItems().filter(item => item.id !== interaction.item.id);
      const shapeAtWidth = width => {
        const height = Math.max(90, width * ratio);
        const x = direction.includes('w') ? interaction.x + interaction.width - width : interaction.x;
        const y = direction.includes('n') ? interaction.y + interaction.height - height : interaction.y;
        return { x, y, width, height };
      };
      const collidesAtWidth = width => others.some(other => this.rectanglesOverlap(shapeAtWidth(width), other));
      let acceptedWidth = requestedWidth;
      if (requestedWidth > interaction.lastWidth && collidesAtWidth(requestedWidth)) {
        let low = interaction.lastWidth;
        let high = requestedWidth;
        for (let iteration = 0; iteration < 14; iteration += 1) {
          const middle = (low + high) / 2;
          if (collidesAtWidth(middle)) high = middle;
          else low = middle;
        }
        acceptedWidth = low;
      }
      const magnetic = this.getMagneticResizeWidth(interaction, acceptedWidth, ratio, others, shapeAtWidth);
      acceptedWidth = magnetic.width;
      interaction.lastWidth = acceptedWidth;
      interaction.item.width = acceptedWidth;
      interaction.item.height = Math.max(90, acceptedWidth * ratio);
      if (direction.includes('w')) interaction.item.x = interaction.x + interaction.width - acceptedWidth;
      else interaction.item.x = interaction.x;
      if (direction.includes('n')) interaction.item.y = interaction.y + interaction.height - interaction.item.height;
      else interaction.item.y = interaction.y;
      this.positionCard(interaction.item);
      this.updateSnapGuides(magnetic.x, magnetic.y);
    }
  }

  finishPointerInteraction(event) {
    if (!this.interaction) return;
    if (event?.pointerId !== undefined && this.interaction.pointerId !== event.pointerId) return;
    const interaction = this.interaction;
    this.interaction = null;
    this.clearSnapGuides();
    this.grid?.classList.remove('is-panning');
    this.world?.querySelectorAll('.moodboard-item.is-interacting').forEach(element => element.classList.remove('is-interacting'));
    if (interaction.type === 'pan') this.persistViewport();
    else window.appState.updateActiveProject({ moodboard: this.getItems() });
  }

  positionCard(item) {
    const card = this.world?.querySelector(`[data-id="${CSS.escape(item.id)}"]`);
    if (!card) return;
    card.style.left = `${item.x}px`;
    card.style.top = `${item.y}px`;
    card.style.width = `${item.width}px`;
    card.style.height = `${item.height}px`;
  }

  handleWorldClick(event) {
    const deleteButton = event.target.closest('[data-moodboard-delete]');
    if (!deleteButton) return;
    event.stopPropagation();
    const item = this.getItems().find(entry => entry.id === deleteButton.dataset.moodboardDelete);
    if (!item || !confirm(`Remover “${item.title || 'esta imagem'}” do mural?`)) return;
    window.appState.updateActiveProject({ moodboard: this.getItems().filter(entry => entry.id !== item.id) });
  }

  scheduleViewportSave() {
    clearTimeout(this.viewportSaveTimer);
    this.viewportSaveTimer = setTimeout(() => this.persistViewport(), 250);
  }

  persistViewport() {
    clearTimeout(this.viewportSaveTimer);
    const project = this.getProject();
    if (!project) return;
    const moodboardViewport = { ...this.viewportState };
    project.moodboardViewport = moodboardViewport;
    window.appState.updateActiveProject({ moodboardViewport });
  }

  hasImageFiles(dataTransfer) {
    return Boolean(dataTransfer && (dataTransfer.types?.includes('Files') || [...(dataTransfer.files || [])].some(file => this.isImageFile(file))));
  }

  isImageFile(file) {
    return file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg|avif)$/i.test(file.name || '');
  }

  handleDragEnter(event) {
    if (!this.hasImageFiles(event.dataTransfer)) return;
    event.preventDefault();
    this.view?.classList.add('is-drag-over');
  }

  handleDragOver(event) {
    if (!this.hasImageFiles(event.dataTransfer)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    this.view?.classList.add('is-drag-over');
  }

  handleDragLeave(event) {
    if (event.relatedTarget && this.view?.contains(event.relatedTarget)) return;
    this.view?.classList.remove('is-drag-over');
  }

  async handleDrop(event) {
    if (!this.hasImageFiles(event.dataTransfer)) return;
    event.preventDefault();
    event.stopPropagation();
    this.view?.classList.remove('is-drag-over');
    const files = [...event.dataTransfer.files].filter(file => this.isImageFile(file));
    const project = this.getProject();
    if (!project || !files.length) return;
    if (!Array.isArray(project.moodboard)) project.moodboard = [];
    const worldPoint = this.toWorldPoint(event.clientX, event.clientY);
    for (const [index, file] of files.entries()) {
      const url = await this.getDroppedImageUrl(file);
      const title = file.name.replace(/\.[^.]+$/, '').trim() || 'Referência visual';
      const item = {
        id: `mb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title, url, notes: '',
        x: worldPoint.x + index * 24 - 140,
        y: worldPoint.y + index * 24 - 105,
        width: 280, height: 210
      };
      Object.assign(item, this.findFreePosition(item, item.x, item.y, project.moodboard));
      project.moodboard.push(item);
    }
    window.appState.updateActiveProject({ moodboard: project.moodboard });
  }

  async handleFormDrop(event) {
    if (!this.hasImageFiles(event.dataTransfer)) return;
    event.preventDefault();
    event.stopPropagation();
    const file = [...event.dataTransfer.files].find(item => this.isImageFile(item));
    if (!file) return;
    this.inputUrl.value = await this.getDroppedImageUrl(file);
    if (!this.inputTitle.value.trim()) this.inputTitle.value = file.name.replace(/\.[^.]+$/, '');
  }

  getDroppedImageUrl(file) {
    try {
      if (window.nativeAPI?.getDroppedFileUrl) return Promise.resolve(window.nativeAPI.getDroppedFileUrl(file));
    } catch (error) {
      console.warn('Falha ao acessar caminho da imagem; usando uma cópia incorporada.', error);
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  handleSaveItem() {
    const project = this.getProject();
    if (!project) return;
    const title = this.inputTitle.value.trim() || 'Referência visual';
    let url = this.inputUrl.value.trim();
    const notes = this.inputNotes.value.trim();
    if (!url) {
      alert('Informe a URL da imagem ou escolha um arquivo local.');
      return;
    }
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('file://') && !url.startsWith('data:')) {
      url = 'file:///' + url.replace(/\\/g, '/');
    }
    if (!Array.isArray(project.moodboard)) project.moodboard = [];
    const rect = this.getViewportRect();
    const center = this.toWorldPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    const item = {
      id: `mb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title, url, notes,
      x: center.x - 140, y: center.y - 105, width: 280, height: 210
    };
    Object.assign(item, this.findFreePosition(item, item.x, item.y, project.moodboard));
    project.moodboard.push(item);
    window.appState.updateActiveProject({ moodboard: project.moodboard });
    this.closeImageModal();
  }

  renderGrid() {
    if (!this.grid || !this.world) return;
    const project = this.getProject();
    if (!project) return;
    if (project.id !== this.currentProjectId) {
      this.currentProjectId = project.id;
      this.selectedItemId = null;
      this.ensureViewport(project);
    }
    if (this.viewportState.x === null || this.viewportState.y === null) {
      const rect = this.getViewportRect();
      if (rect.width && rect.height) {
        this.viewportState.x = rect.width / 2;
        this.viewportState.y = rect.height / 2;
      }
    }
    const items = this.getItems();
    items.forEach((item, index) => {
      if (!Number.isFinite(item.x)) item.x = -140 + (index % 3) * 320;
      if (!Number.isFinite(item.y)) item.y = -105 + Math.floor(index / 3) * 260;
      if (!Number.isFinite(item.width)) item.width = 280;
      if (!Number.isFinite(item.height)) item.height = 210;
    });
    this.view?.classList.toggle('is-empty', items.length === 0);
    if (this.emptyState) this.emptyState.hidden = items.length > 0;
    this.world.innerHTML = items.map(item => `
      <article class="moodboard-item ${item.id === this.selectedItemId ? 'is-selected' : ''}" data-id="${escapeHtml(item.id)}" style="left:${item.x}px;top:${item.y}px;width:${item.width}px;height:${item.height}px" aria-label="${escapeHtml(item.title || 'Referência visual')}">
        <img class="moodboard-img" src="${escapeHtml(item.url || '')}" alt="${escapeHtml(item.title || 'Referência visual')}" draggable="false" onerror="this.classList.add('is-image-missing')">
        <div class="moodboard-caption"><strong>${escapeHtml(item.title || 'Referência visual')}</strong>${item.notes ? `<p>${escapeHtml(item.notes)}</p>` : ''}</div>
        <button type="button" class="moodboard-item-delete" data-moodboard-delete="${escapeHtml(item.id)}" aria-label="Remover ${escapeHtml(item.title || 'imagem')}" title="Remover imagem">×</button>
        <button type="button" class="moodboard-resize-handle moodboard-resize-nw" data-moodboard-resize="nw" aria-label="Redimensionar pelo canto superior esquerdo" title="Arraste para redimensionar"></button>
        <button type="button" class="moodboard-resize-handle moodboard-resize-ne" data-moodboard-resize="ne" aria-label="Redimensionar pelo canto superior direito" title="Arraste para redimensionar"></button>
        <button type="button" class="moodboard-resize-handle moodboard-resize-sw" data-moodboard-resize="sw" aria-label="Redimensionar pelo canto inferior esquerdo" title="Arraste para redimensionar"></button>
        <button type="button" class="moodboard-resize-handle moodboard-resize-se" data-moodboard-resize="se" aria-label="Redimensionar pelo canto inferior direito" title="Arraste para redimensionar"></button>
      </article>`).join('');
    this.applyViewport();
    if (this.normalizeItemPositions(items)) {
      window.appState.updateActiveProject({ moodboard: items });
    }
  }
}

window.MoodboardModule = MoodboardModule;
