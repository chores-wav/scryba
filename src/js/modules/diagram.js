/** Canvas espacial para organizar cartões e conexões do projeto. */
class DiagramModule {
  constructor() {
    this.canvasView = document.querySelector('#view-canvas .canvas-view');
    this.viewport = document.getElementById('canvas-viewport');
    this.world = document.getElementById('canvas-world');
    this.canvasSurface = document.getElementById('canvas-surface');
    this.svgLines = document.getElementById('connections-svg');
    this.btnAddNode = document.getElementById('btn-add-node');
    this.btnConnect = document.getElementById('btn-connect-nodes');
    this.btnZoomIn = document.getElementById('btn-canvas-zoom-in');
    this.btnZoomOut = document.getElementById('btn-canvas-zoom-out');
    this.btnFit = document.getElementById('btn-canvas-fit');
    this.btnSnap = document.getElementById('btn-canvas-snap');
    this.snapGuides = document.getElementById('canvas-snap-guides');
    this.snapGuideX = this.snapGuides?.querySelector('.canvas-snap-guide-x');
    this.snapGuideY = this.snapGuides?.querySelector('.canvas-snap-guide-y');
    this.snapEnabled = localStorage.getItem('scryba_canvas_snap_enabled') !== 'false';
    this.zoomLabel = document.getElementById('canvas-zoom-level');
    this.canvasHint = document.getElementById('canvas-hint');
    this.modalNode = document.getElementById('modal-node');
    this.formNode = document.getElementById('form-node');
    this.nodeIdInput = document.getElementById('node-id');
    this.nodeModalTitle = document.getElementById('node-modal-title');
    this.btnSaveNode = document.getElementById('btn-save-node');
    this.connectionModal = document.getElementById('modal-connection');
    this.connectionForm = document.getElementById('form-connection');
    this.connectionLabelInput = document.getElementById('connection-label');
    this.connectionColorInput = document.getElementById('connection-color');
    this.connectionStartInput = document.getElementById('connection-start-marker');
    this.connectionEndInput = document.getElementById('connection-end-marker');
    this.customConnectionColorButton = document.getElementById('btn-custom-connection-color');
    this.savedConnectionColors = document.getElementById('canvas-saved-colors');
    this.saveConnectionColorButton = document.getElementById('btn-save-connection-color');
    this.deleteSavedColorButton = document.getElementById('btn-delete-saved-color');
    this.contextColor = null;
    this.customColors = this.loadCustomColors();
    this.btnDeleteConnection = document.getElementById('btn-delete-connection');
    this.editingConnectionId = null;
    this.editingNodeId = null;
    this.selectedNodeId = null;
    this.selectedConnectionId = null;
    this.connectMode = false;
    this.connectSourceId = null;
    this.pointerAction = null;
    this.camera = { x: 0, y: 0, zoom: 1 };
    this.cameraProjectId = null;
    this.bindEvents();
  }

  bindEvents() {
    this.btnAddNode?.addEventListener('click', () => this.openNodeModal());
    document.getElementById('btn-close-node-modal')?.addEventListener('click', () => this.closeNodeModal());
    document.getElementById('btn-cancel-node-modal')?.addEventListener('click', () => this.closeNodeModal());
    this.formNode?.addEventListener('submit', event => {
      event.preventDefault();
      this.saveNode();
    });

    this.btnConnect?.addEventListener('click', () => this.toggleConnectMode());
    this.btnZoomIn?.addEventListener('click', () => this.zoomAt(1.2));
    this.btnZoomOut?.addEventListener('click', () => this.zoomAt(1 / 1.2));
    this.btnFit?.addEventListener('click', () => this.fitCanvas());
    this.btnSnap?.addEventListener('click', () => {
      this.snapEnabled = !this.snapEnabled;
      localStorage.setItem('scryba_canvas_snap_enabled', String(this.snapEnabled));
      this.updateSnapButton();
      if (!this.snapEnabled) this.clearSnapGuides();
    });
    this.updateSnapButton();
    this.viewport?.addEventListener('wheel', event => {
      event.preventDefault();
      const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
      this.zoomAt(factor, event.clientX, event.clientY);
    }, { passive: false });

    this.viewport?.addEventListener('pointerdown', event => this.onCanvasPointerDown(event));
    this.canvasSurface?.addEventListener('click', event => this.onCanvasClick(event));
    this.canvasSurface?.addEventListener('dblclick', event => {
      const node = event.target.closest('[data-node-id]');
      if (node && !event.target.closest('[data-node-action]')) this.openNodeModal(node.dataset.nodeId);
    });
    this.canvasSurface?.addEventListener('keydown', event => {
      const node = event.target.closest('[data-node-id]');
      if (!node || event.target.closest('[data-node-action], [data-node-connect]')) return;
      if ((event.key === ' ' || event.key === 'Enter') && this.connectMode) {
        event.preventDefault();
        this.chooseConnectionNode(node.dataset.nodeId);
      } else if (event.key === 'Enter') {
        this.openNodeModal(node.dataset.nodeId);
      }
    });
    this.canvasSurface?.addEventListener('click', event => {
      const button = event.target.closest('[data-node-action]');
      if (!button) return;
      event.stopPropagation();
      if (button.dataset.nodeAction === 'edit') this.openNodeModal(button.dataset.nodeId);
      if (button.dataset.nodeAction === 'delete') this.deleteNode(button.dataset.nodeId);
    });
    this.svgLines?.addEventListener('click', event => {
      const path = event.target.closest('[data-connection-id]');
      if (path) this.openConnectionModal(path.dataset.connectionId, event.clientX, event.clientY);
    });
    this.connectionForm?.addEventListener('submit', event => {
      event.preventDefault();
      this.saveConnection();
    });
    this.connectionModal?.querySelectorAll('.canvas-color-swatch').forEach(button => {
      button.addEventListener('click', () => {
        this.connectionColorInput.value = button.dataset.color;
        this.updateConnectionColorSelection();
      });
    });
    this.savedConnectionColors?.addEventListener('click', event => {
      const button = event.target.closest('.canvas-color-swatch');
      if (!button) return;
      this.hideSavedColorMenu();
      this.connectionColorInput.value = button.dataset.color;
      this.updateConnectionColorSelection();
    });
    this.savedConnectionColors?.addEventListener('contextmenu', event => {
      const button = event.target.closest('.canvas-saved-color');
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      this.showSavedColorMenu(button.dataset.color, event.clientX, event.clientY);
    });
    this.customConnectionColorButton?.addEventListener('click', () => this.connectionColorInput?.click());
    this.connectionColorInput?.addEventListener('input', () => this.updateConnectionColorSelection());
    this.saveConnectionColorButton?.addEventListener('click', () => this.saveCustomColor());
    this.deleteSavedColorButton?.addEventListener('click', () => this.deleteCustomColor());
    this.renderCustomColors();
    document.getElementById('btn-close-connection-modal')?.addEventListener('click', () => this.closeConnectionModal());
    document.addEventListener('click', event => {
      if (!event.target.closest('#btn-delete-saved-color, .canvas-saved-color')) this.hideSavedColorMenu();
      if (!this.connectionModal?.classList.contains('active')) return;
      if (event.target.closest('#modal-connection, [data-connection-id]')) return;
      this.closeConnectionModal();
    });
    this.btnDeleteConnection?.addEventListener('click', () => this.deleteConnection(this.editingConnectionId));
    this.connectionModal?.addEventListener('click', event => {
      if (event.target === this.connectionModal) this.closeConnectionModal();
    });

    window.addEventListener('pointermove', event => this.onPointerMove(event));
    window.addEventListener('pointerup', event => this.onPointerUp(event));
    window.addEventListener('pointercancel', event => this.onPointerUp(event));
    window.addEventListener('keyup', event => {
      if (event.code === 'Space') {
        this.spaceHeld = false;
        this.viewport?.classList.remove('space-pan-ready');
      }
    });
    window.addEventListener('resize', () => this.renderLines());
    document.addEventListener('keydown', event => this.onKeyDown(event));
    this.modalNode?.addEventListener('click', event => {
      if (event.target === this.modalNode) this.closeNodeModal();
    });

    window.appState.subscribe(() => this.render());
  }

  getDiagram() {
    const project = window.appState.getActiveProject();
    if (!project) return null;
    if (!project.diagram || typeof project.diagram !== 'object') project.diagram = {};
    if (!Array.isArray(project.diagram.nodes)) project.diagram.nodes = [];
    if (!Array.isArray(project.diagram.connections)) project.diagram.connections = [];
    project.diagram.connections.forEach(edge => {
      if (!edge.id) edge.id = `edge-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      if (!edge.startMarker) edge.startMarker = 'none';
      if (!edge.endMarker) edge.endMarker = 'arrow';
      if (!edge.color) edge.color = '#dc2626';
      if (typeof edge.label !== 'string') edge.label = '';
    });
    return project.diagram;
  }

  openNodeModal(nodeId = null) {
    const project = window.appState.getActiveProject();
    const node = nodeId ? project?.diagram?.nodes?.find(item => item.id === nodeId) : null;
    this.formNode.reset();
    this.editingNodeId = node?.id || null;
    this.nodeIdInput.value = node?.id || '';
    document.getElementById('node-label').value = node?.label || '';
    document.getElementById('node-type').value = node?.type || 'nota';
    document.getElementById('node-desc').value = node?.desc || '';
    this.nodeModalTitle.textContent = node ? 'Editar cartão' : 'Novo cartão no Canvas';
    this.btnSaveNode.textContent = node ? 'Salvar alterações' : 'Adicionar cartão';
    this.modalNode.classList.add('active');
    requestAnimationFrame(() => document.getElementById('node-label').focus());
  }

  closeNodeModal() {
    this.modalNode.classList.remove('active');
    this.editingNodeId = null;
  }

  nodeCollides(rect, nodes, ignoreId = null, gap = 2) {
    return nodes.some(node => {
      if (node.id === ignoreId) return false;
      const element = this.canvasSurface.querySelector(`[data-node-id="${CSS.escape(node.id)}"]`);
      const width = element?.offsetWidth || 260;
      const height = element?.offsetHeight || 140;
      return rect.x < node.x + width + gap && rect.x + rect.width + gap > node.x &&
        rect.y < node.y + height + gap && rect.y + rect.height + gap > node.y;
    });
  }

  findFreeNodePosition(x, y, width, height, nodes, ignoreId = null) {
    const gap = 2;
    const xCandidates = new Set([x]);
    const yCandidates = new Set([y]);
    for (const node of nodes) {
      if (node.id === ignoreId) continue;
      const element = this.canvasSurface.querySelector(`[data-node-id="${CSS.escape(node.id)}"]`);
      const otherWidth = element?.offsetWidth || 260;
      const otherHeight = element?.offsetHeight || 140;
      xCandidates.add(node.x - width - gap);
      xCandidates.add(node.x + otherWidth + gap);
      yCandidates.add(node.y - height - gap);
      yCandidates.add(node.y + otherHeight + gap);
    }
    const others = nodes.filter(node => node.id !== ignoreId);
    const rightEdge = Math.max(x, ...others.map(node => {
      const element = this.canvasSurface.querySelector(`[data-node-id="${CSS.escape(node.id)}"]`);
      return node.x + (element?.offsetWidth || 260) + gap;
    }));
    const leftEdge = Math.min(x, ...others.map(node => {
      const element = this.canvasSurface.querySelector(`[data-node-id="${CSS.escape(node.id)}"]`);
      return node.x - width - gap;
    }));
    xCandidates.add(rightEdge);
    xCandidates.add(leftEdge);
    let best = null;
    let bestDistance = Infinity;
    for (const candidateX of xCandidates) {
      for (const candidateY of yCandidates) {
        const candidate = { x: candidateX, y: candidateY, width, height };
        if (this.nodeCollides(candidate, nodes, ignoreId, gap)) continue;
        const distance = (candidateX - x) ** 2 + (candidateY - y) ** 2;
        if (distance < bestDistance) {
          best = { x: candidateX, y: candidateY };
          bestDistance = distance;
        }
      }
    }
    return best || { x: rightEdge, y };
  }

  constrainNodeMove(node, element, from, target, nodes) {
    const distance = Math.hypot(target.x - from.x, target.y - from.y);
    const steps = Math.max(1, Math.ceil(distance / 12));
    let last = { x: from.x, y: from.y };
    for (let step = 1; step <= steps; step += 1) {
      const fraction = step / steps;
      const candidate = {
        x: from.x + (target.x - from.x) * fraction,
        y: from.y + (target.y - from.y) * fraction,
        width: element.offsetWidth || 260,
        height: element.offsetHeight || 140
      };
      if (this.nodeCollides(candidate, nodes, node.id)) {
        let low = (step - 1) / steps;
        let high = fraction;
        for (let iteration = 0; iteration < 14; iteration += 1) {
          const middle = (low + high) / 2;
          const probe = {
            x: from.x + (target.x - from.x) * middle,
            y: from.y + (target.y - from.y) * middle,
            width: candidate.width,
            height: candidate.height
          };
          if (this.nodeCollides(probe, nodes, node.id)) high = middle;
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

  updateSnapButton() {
    if (!this.btnSnap) return;
    this.btnSnap.classList.toggle('is-active', this.snapEnabled);
    this.btnSnap.setAttribute('aria-pressed', String(this.snapEnabled));
    this.btnSnap.title = `Alinhamento magnético ${this.snapEnabled ? 'ligado' : 'desligado'}`;
  }

  clearSnapGuides() {
    this.snapGuides?.classList.remove('is-visible');
    if (this.snapGuideX) this.snapGuideX.hidden = true;
    if (this.snapGuideY) this.snapGuideY.hidden = true;
  }

  updateSnapGuides(x, y) {
    if (!this.snapGuides) return;
    this.snapGuides.classList.toggle('is-visible', x !== null || y !== null);
    if (this.snapGuideX) {
      this.snapGuideX.hidden = x === null;
      if (x !== null) this.snapGuideX.style.left = `${x * this.camera.zoom + this.camera.x}px`;
    }
    if (this.snapGuideY) {
      this.snapGuideY.hidden = y === null;
      if (y !== null) this.snapGuideY.style.top = `${y * this.camera.zoom + this.camera.y}px`;
    }
  }

  getMagneticNodeTarget(node, element, target, nodes) {
    if (!this.snapEnabled) return { target, x: null, y: null };
    const threshold = 10 / this.camera.zoom;
    const width = element.offsetWidth || 260;
    const height = element.offsetHeight || 140;
    const others = nodes.filter(item => item.id !== node.id).map(item => {
      const otherElement = this.canvasSurface.querySelector(`[data-node-id="${CSS.escape(item.id)}"]`);
      return { item, width: otherElement?.offsetWidth || 260, height: otherElement?.offsetHeight || 140 };
    });
    const findSnap = (axis, dimension, current, otherAxisTarget) => {
      const candidates = [];
      const offsets = [0, dimension / 2, dimension];
      for (const other of others) {
        const origin = axis === 'x' ? other.item.x : other.item.y;
        const otherSize = axis === 'x' ? other.width : other.height;
        for (const offset of offsets) {
          for (const guide of [origin, origin + otherSize / 2, origin + otherSize]) {
            const position = guide - offset;
            const distance = Math.abs(position - current);
            if (distance <= threshold) candidates.push({ position, guide, distance });
          }
        }
      }
      const viewportRect = this.viewport.getBoundingClientRect();
      const canvasCenter = axis === 'x'
        ? (viewportRect.width / 2 - this.camera.x) / this.camera.zoom
        : (viewportRect.height / 2 - this.camera.y) / this.camera.zoom;
      const centerPosition = canvasCenter - dimension / 2;
      if (Math.abs(centerPosition - current) <= threshold) candidates.push({ position: centerPosition, guide: canvasCenter, distance: Math.abs(centerPosition - current) });
      candidates.sort((a, b) => a.distance - b.distance);
      for (const candidate of candidates) {
        const rect = axis === 'x'
          ? { x: candidate.position, y: otherAxisTarget, width, height }
          : { x: otherAxisTarget, y: candidate.position, width, height };
        if (!this.nodeCollides(rect, nodes, node.id)) return candidate;
      }
      return null;
    };
    const snapX = findSnap('x', width, target.x, target.y);
    const snappedTarget = { x: snapX?.position ?? target.x, y: target.y };
    const snapY = findSnap('y', height, target.y, snappedTarget.x);
    snappedTarget.y = snapY?.position ?? target.y;
    return { target: snappedTarget, x: snapX?.guide ?? null, y: snapY?.guide ?? null };
  }

  resolveNodeCollisions(diagram) {
    const placed = [];
    let changed = false;
    for (const node of diagram.nodes) {
      const element = this.canvasSurface.querySelector(`[data-node-id="${CSS.escape(node.id)}"]`);
      if (!element) continue;
      const originalX = Number(node.x) || 0;
      const originalY = Number(node.y) || 0;
      const position = this.findFreeNodePosition(originalX, originalY, element.offsetWidth || 260, element.offsetHeight || 140, placed);
      node.x = position.x;
      node.y = position.y;
      element.dataset.x = String(node.x);
      element.dataset.y = String(node.y);
      element.style.left = `${node.x}px`;
      element.style.top = `${node.y}px`;
      placed.push(node);
      if (position.x !== originalX || position.y !== originalY) changed = true;
    }
    return changed;
  }

  saveNode() {
    const project = window.appState.getActiveProject();
    const diagram = this.getDiagram();
    if (!project || !diagram) return;
    const label = document.getElementById('node-label').value.trim();
    if (!label) return;
    const type = document.getElementById('node-type').value;
    const desc = document.getElementById('node-desc').value.trim();
    const existing = this.editingNodeId ? diagram.nodes.find(node => node.id === this.editingNodeId) : null;
    if (existing) {
      Object.assign(existing, { label, type, desc });
    } else {
      const rect = this.viewport.getBoundingClientRect();
      const center = this.screenToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2);
      const nodeSize = { width: 260, height: 140 };
      const position = this.findFreeNodePosition(
        center.x - nodeSize.width / 2,
        center.y - nodeSize.height / 2,
        nodeSize.width,
        nodeSize.height,
        diagram.nodes
      );
      diagram.nodes.push({
        id: `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        label, type, desc,
        x: position.x,
        y: position.y
      });
    }
    window.appState.updateActiveProject({ diagram });
    this.closeNodeModal();
  }

  deleteNode(nodeId) {
    const diagram = this.getDiagram();
    const node = diagram?.nodes.find(item => item.id === nodeId);
    if (!node || !window.confirm(`Remover o cartão "${node.label}" e suas conexões?`)) return;
    diagram.nodes = diagram.nodes.filter(item => item.id !== nodeId);
    diagram.connections = diagram.connections.filter(edge => edge.from !== nodeId && edge.to !== nodeId);
    if (this.selectedNodeId === nodeId) this.selectedNodeId = null;
    window.appState.updateActiveProject({ diagram });
  }

  toggleConnectMode() {
    this.connectMode = !this.connectMode;
    this.connectSourceId = null;
    this.btnConnect?.classList.toggle('active', this.connectMode);
    this.btnConnect?.setAttribute('aria-pressed', String(this.connectMode));
    this.viewport?.classList.toggle('is-connecting', this.connectMode);
    this.updateHint();
  }

  chooseConnectionNode(nodeId) {
    const diagram = this.getDiagram();
    if (!this.connectSourceId) {
      this.connectSourceId = nodeId;
      this.selectedNodeId = nodeId;
      this.render();
      this.updateHint();
      return;
    }
    if (this.connectSourceId === nodeId) {
      this.connectSourceId = null;
      this.render();
      this.updateHint();
      return;
    }
    const sourceId = this.connectSourceId;
    const duplicate = diagram.connections.some(edge =>
      (edge.from === sourceId && edge.to === nodeId) ||
      (edge.from === nodeId && edge.to === sourceId)
    );
    this.connectSourceId = null;
    if (!duplicate) {
      this.createConnection(sourceId, nodeId);
    }
    this.renderSelection();
    this.updateHint();
  }

  onCanvasPointerDown(event) {
    if (event.target.closest('[data-connection-id]')) return;
    const nodeEl = event.target.closest('[data-node-id]');
    if (nodeEl) {
      const connectHandle = event.target.closest('[data-node-connect]');
      if (connectHandle) {
        event.preventDefault();
        event.stopPropagation();
        this.pointerAction = {
          type: 'connect', pointerId: event.pointerId, sourceId: nodeEl.dataset.nodeId,
          sourceSide: connectHandle.dataset.nodeConnect, currentX: event.clientX, currentY: event.clientY
        };
        if (event.target.setPointerCapture) event.target.setPointerCapture(event.pointerId);
        this.viewport.classList.add('is-connecting');
        return;
      }
      if (event.target.closest('[data-node-action]')) return;
      if (this.spaceHeld) {
        this.pointerAction = {
          type: 'pan', pointerId: event.pointerId,
          startX: event.clientX, startY: event.clientY,
          cameraX: this.camera.x, cameraY: this.camera.y
        };
        this.viewport.classList.add('is-panning');
        event.preventDefault();
        return;
      }
      if (this.connectMode) {
        event.preventDefault();
        this.chooseConnectionNode(nodeEl.dataset.nodeId);
        return;
      }
      this.selectedNodeId = nodeEl.dataset.nodeId;
      this.selectedConnectionId = null;
      this.renderSelection();
      this.pointerAction = {
        type: 'node', pointerId: event.pointerId, nodeId: nodeEl.dataset.nodeId,
        startX: event.clientX, startY: event.clientY,
        nodeX: Number(nodeEl.dataset.x), nodeY: Number(nodeEl.dataset.y),
        lastX: Number(nodeEl.dataset.x), lastY: Number(nodeEl.dataset.y)
      };
      event.preventDefault();
      return;
    }
    if (event.target === this.canvasSurface || event.target === this.world || event.target === this.viewport || event.target === this.svgLines) {
      this.selectedNodeId = null;
      this.selectedConnectionId = null;
      this.renderSelection();
      this.pointerAction = {
        type: 'pan', pointerId: event.pointerId,
        startX: event.clientX, startY: event.clientY,
        cameraX: this.camera.x, cameraY: this.camera.y
      };
      this.viewport.classList.add('is-panning');
      event.preventDefault();
    }
  }

  onCanvasClick(event) {
    if (event.target === this.canvasSurface || event.target === this.world) {
      if (this.connectMode) {
        this.connectSourceId = null;
        this.updateHint();
      }
    }
  }

  onPointerMove(event) {
    const action = this.pointerAction;
    if (!action || action.pointerId !== event.pointerId) return;
    if (action.type === 'pan') {
      this.camera.x = action.cameraX + event.clientX - action.startX;
      this.camera.y = action.cameraY + event.clientY - action.startY;
      this.applyCamera();
      return;
    }
    if (action.type === 'connect') {
      action.currentX = event.clientX;
      action.currentY = event.clientY;
      document.querySelectorAll('.node-item.connect-target').forEach(node => node.classList.remove('connect-target'));
      const target = this.getNodeAtPoint(event.clientX, event.clientY);
      if (target && target.dataset.nodeId !== action.sourceId) target.classList.add('connect-target');
      this.renderLines();
      return;
    }
    const diagram = this.getDiagram();
    const node = diagram?.nodes.find(item => item.id === action.nodeId);
    const nodeEl = this.canvasSurface.querySelector(`[data-node-id="${CSS.escape(action.nodeId)}"]`);
    if (!node || !nodeEl) return;
    const target = {
      x: action.nodeX + (event.clientX - action.startX) / this.camera.zoom,
      y: action.nodeY + (event.clientY - action.startY) / this.camera.zoom
    };
    const magnetic = this.getMagneticNodeTarget(node, nodeEl, target, diagram.nodes);
    const position = this.constrainNodeMove(node, nodeEl,
      { x: action.lastX, y: action.lastY }, magnetic.target, diagram.nodes);
    node.x = action.lastX = position.x;
    node.y = action.lastY = position.y;
    nodeEl.dataset.x = String(node.x);
    nodeEl.dataset.y = String(node.y);
    nodeEl.style.left = `${node.x}px`;
    nodeEl.style.top = `${node.y}px`;
    this.updateSnapGuides(
      magnetic.x !== null && Math.abs(position.x - magnetic.target.x) < 0.5 ? magnetic.x : null,
      magnetic.y !== null && Math.abs(position.y - magnetic.target.y) < 0.5 ? magnetic.y : null
    );
    this.renderLines();
  }

  onPointerUp(event) {
    const action = this.pointerAction;
    if (!action || action.pointerId !== event.pointerId) return;
    this.pointerAction = null;
    this.viewport?.classList.remove('is-panning');
    this.clearSnapGuides();
    if (action.type === 'pan') this.saveCamera();
    if (action.type === 'connect') {
      const target = this.getNodeAtPoint(event.clientX, event.clientY);
      document.querySelectorAll('.node-item.connect-target').forEach(node => node.classList.remove('connect-target'));
      this.viewport?.classList.toggle('is-connecting', this.connectMode);
      if (target && target.dataset.nodeId !== action.sourceId) {
        const source = this.canvasSurface.querySelector(`[data-node-id="${CSS.escape(action.sourceId)}"]`);
        const toSide = source ? this.getFacingSides(target, source).fromSide : 'left';
        this.createConnection(action.sourceId, target.dataset.nodeId, action.sourceSide, toSide);
      } else {
        this.renderLines();
      }
    }
    if (action.type === 'node') {
      const diagram = this.getDiagram();
      if (diagram) window.appState.updateActiveProject({ diagram });
    }
  }

  onKeyDown(event) {
    if (event.key === 'Escape' && this.modalNode?.classList.contains('active')) {
      this.closeNodeModal();
      return;
    }
    if (event.key === 'Escape' && this.connectionModal?.classList.contains('active')) {
      this.closeConnectionModal();
      return;
    }
    if (this.modalNode?.classList.contains('active') || this.connectionModal?.classList.contains('active')) return;
    if (event.code === 'Space' && this.isCanvasActive() && !event.target.closest('input, textarea, select, button')) {
      this.spaceHeld = true;
      this.viewport.classList.add('space-pan-ready');
      event.preventDefault();
    }
    if ((event.key === 'Delete' || event.key === 'Backspace') && this.isCanvasActive() && !event.target.closest('input, textarea, select')) {
      if (this.selectedNodeId) this.deleteNode(this.selectedNodeId);
      else if (this.selectedConnectionId) this.deleteConnection(this.selectedConnectionId);
    }
    if (event.key === 'Escape' && this.connectMode) this.toggleConnectMode();
  }

  isCanvasActive() {
    return document.getElementById('view-canvas')?.classList.contains('active');
  }

  deleteConnection(connectionId, confirmDelete = false) {
    const diagram = this.getDiagram();
    if (!diagram) return;
    const connection = diagram.connections.find(edge => edge.id === connectionId);
    if (!connection) return;
    if (confirmDelete && !window.confirm('Remover esta conexão?')) return;
    diagram.connections = diagram.connections.filter(edge => edge.id !== connectionId);
    this.selectedConnectionId = null;
    this.closeConnectionModal();
    window.appState.updateActiveProject({ diagram });
  }

  selectConnection(connectionId) {
    this.selectedConnectionId = connectionId;
    this.selectedNodeId = null;
    this.renderLines();
    this.updateHint('Conexão selecionada · pressione Delete para remover');
  }

  createConnection(from, to, fromSide, toSide) {
    const diagram = this.getDiagram();
    if (!diagram || from === to) return;
    const duplicate = diagram.connections.some(edge =>
      (edge.from === from && edge.to === to) || (edge.from === to && edge.to === from)
    );
    if (duplicate) return;
    diagram.connections.push({
      id: `edge-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      from, to, fromSide, toSide,
      startMarker: 'none', endMarker: 'arrow', color: '#dc2626', label: ''
    });
    window.appState.updateActiveProject({ diagram });
  }

  openConnectionModal(connectionId, clientX, clientY) {
    const diagram = this.getDiagram();
    const connection = diagram?.connections.find(edge => edge.id === connectionId);
    if (!connection) return;
    this.editingConnectionId = connectionId;
    this.selectedConnectionId = connectionId;
    this.connectionLabelInput.value = connection.label || '';
    this.connectionColorInput.value = this.normalizeColor(connection.color);
    this.updateConnectionColorSelection();
    this.connectionStartInput.value = connection.startMarker || 'none';
    this.connectionEndInput.value = connection.endMarker || 'arrow';
    this.connectionModal.classList.add('active');
    this.connectionModal.setAttribute('aria-hidden', 'false');
    const rect = this.canvasView.getBoundingClientRect();
    const anchorX = Number.isFinite(clientX) && clientX ? clientX - rect.left + 14 : rect.width / 2;
    const anchorY = Number.isFinite(clientY) && clientY ? clientY - rect.top + 12 : rect.height / 2;
    requestAnimationFrame(() => {
      const maxX = Math.max(12, rect.width - this.connectionModal.offsetWidth - 12);
      const maxY = Math.max(12, rect.height - this.connectionModal.offsetHeight - 12);
      this.connectionModal.style.left = `${Math.max(12, Math.min(anchorX, maxX))}px`;
      this.connectionModal.style.top = `${Math.max(12, Math.min(anchorY, maxY))}px`;
    });
    this.renderLines();
  }

  getNodeAtPoint(clientX, clientY) {
    const nodes = [...this.canvasSurface.querySelectorAll('.node-item')];
    for (let index = nodes.length - 1; index >= 0; index -= 1) {
      const rect = nodes[index].getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) return nodes[index];
    }
    return null;
  }

  closeConnectionModal() {
    this.connectionModal?.classList.remove('active');
    this.connectionModal?.setAttribute('aria-hidden', 'true');
    this.editingConnectionId = null;
  }

  saveConnection() {
    const diagram = this.getDiagram();
    const connection = diagram?.connections.find(edge => edge.id === this.editingConnectionId);
    if (!connection) return;
    Object.assign(connection, {
      label: this.connectionLabelInput.value.trim(),
      color: this.normalizeColor(this.connectionColorInput.value),
      startMarker: this.connectionStartInput.value,
      endMarker: this.connectionEndInput.value
    });
    this.selectedConnectionId = connection.id;
    window.appState.updateActiveProject({ diagram });
    this.closeConnectionModal();
  }

  normalizeColor(value) {
    return /^#[0-9a-f]{6}$/i.test(value || '') ? value : '#dc2626';
  }

  updateConnectionColorSelection() {
    const color = this.normalizeColor(this.connectionColorInput?.value);
    let matchedPrimary = false;
    this.connectionModal?.querySelectorAll('.canvas-color-swatch, .canvas-saved-color').forEach(button => {
      const selected = button.dataset.color.toLowerCase() === color.toLowerCase();
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
      matchedPrimary ||= selected;
    });
    this.customConnectionColorButton?.classList.toggle('selected', !matchedPrimary);
    this.customConnectionColorButton?.style.setProperty('--custom-color', color);
    this.saveConnectionColorButton?.classList.toggle('visible', !this.isBuiltInColor(color) && !this.customColors.includes(color.toLowerCase()));
  }

  isBuiltInColor(color) {
    return [...(this.connectionModal?.querySelectorAll('.canvas-color-swatch') || [])]
      .some(button => button.dataset.color.toLowerCase() === color.toLowerCase());
  }

  loadCustomColors() {
    try {
      const colors = JSON.parse(localStorage.getItem('scryba-canvas-custom-colors') || '[]');
      return Array.isArray(colors) ? [...new Set(colors.filter(color => /^#[0-9a-f]{6}$/i.test(color)).map(color => color.toLowerCase()))] : [];
    } catch {
      return [];
    }
  }

  renderCustomColors() {
    if (!this.savedConnectionColors) return;
    this.savedConnectionColors.innerHTML = this.customColors.map(color =>
      `<button type="button" class="canvas-color-swatch canvas-saved-color" style="--swatch-color:${color}" data-color="${color}" aria-label="Cor personalizada ${color}" title="${color}"></button>`
    ).join('');
    this.savedConnectionColors.classList.toggle('has-colors', this.customColors.length > 0);
    this.updateConnectionColorSelection();
  }

  saveCustomColor() {
    const color = this.normalizeColor(this.connectionColorInput?.value).toLowerCase();
    if (this.isBuiltInColor(color) || this.customColors.includes(color)) return;
    this.customColors.push(color);
    try { localStorage.setItem('scryba-canvas-custom-colors', JSON.stringify(this.customColors)); } catch { /* armazenamento local indisponível */ }
    this.renderCustomColors();
  }

  showSavedColorMenu(color, clientX, clientY) {
    if (!this.deleteSavedColorButton || !this.connectionModal) return;
    this.contextColor = color.toLowerCase();
    const rect = this.connectionModal.getBoundingClientRect();
    this.deleteSavedColorButton.style.left = `${Math.max(8, Math.min(clientX - rect.left, rect.width - 112))}px`;
    this.deleteSavedColorButton.style.top = `${Math.max(8, Math.min(clientY - rect.top, rect.height - 36))}px`;
    this.deleteSavedColorButton.classList.add('visible');
  }

  hideSavedColorMenu() {
    this.deleteSavedColorButton?.classList.remove('visible');
    this.contextColor = null;
  }

  deleteCustomColor() {
    if (!this.contextColor) return;
    this.customColors = this.customColors.filter(color => color !== this.contextColor);
    try { localStorage.setItem('scryba-canvas-custom-colors', JSON.stringify(this.customColors)); } catch { /* armazenamento local indisponível */ }
    this.hideSavedColorMenu();
    this.renderCustomColors();
  }

  markerMarkup(id, type, color) {
    if (!type || type === 'none') return '';
    const shape = {
      arrow: '<path d="M 0 0 L 10 5 L 0 10 z" />',
      circle: '<circle cx="5" cy="5" r="3.4" />',
      diamond: '<path d="M 5 0 L 10 5 L 5 10 L 0 5 z" />',
      square: '<rect x="1.5" y="1.5" width="7" height="7" rx="1" />'
    }[type];
    return shape ? `<marker id="${id}" viewBox="0 0 10 10" refX="${type === 'arrow' ? 8 : 5}" refY="5" markerWidth="12" markerHeight="12" orient="auto-start-reverse" markerUnits="userSpaceOnUse" fill="${color}">${shape}</marker>` : '';
  }

  screenToWorld(clientX, clientY) {
    const rect = this.viewport.getBoundingClientRect();
    return {
      x: (clientX - rect.left - this.camera.x) / this.camera.zoom,
      y: (clientY - rect.top - this.camera.y) / this.camera.zoom
    };
  }

  zoomAt(factor, clientX = null, clientY = null) {
    const rect = this.viewport.getBoundingClientRect();
    const px = clientX === null ? rect.width / 2 : clientX - rect.left;
    const py = clientY === null ? rect.height / 2 : clientY - rect.top;
    const oldZoom = this.camera.zoom;
    const newZoom = Math.max(0.25, Math.min(2, oldZoom * factor));
    const worldX = (px - this.camera.x) / oldZoom;
    const worldY = (py - this.camera.y) / oldZoom;
    this.camera.zoom = newZoom;
    this.camera.x = px - worldX * newZoom;
    this.camera.y = py - worldY * newZoom;
    this.applyCamera();
    this.saveCamera();
  }

  fitCanvas() {
    const diagram = this.getDiagram();
    const rect = this.viewport.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    if (!diagram?.nodes.length) {
      this.camera = { x: 0, y: 0, zoom: 1 };
      this.applyCamera();
      this.saveCamera();
      return;
    }
    const nodes = diagram.nodes;
    const minX = Math.min(...nodes.map(node => Number(node.x) || 0));
    const minY = Math.min(...nodes.map(node => Number(node.y) || 0));
    const maxX = Math.max(...nodes.map(node => (Number(node.x) || 0) + 260));
    const maxY = Math.max(...nodes.map(node => (Number(node.y) || 0) + 150));
    const zoom = Math.max(0.25, Math.min(1.4, Math.min((rect.width - 100) / (maxX - minX), (rect.height - 120) / (maxY - minY))));
    this.camera.zoom = zoom;
    this.camera.x = (rect.width - (maxX - minX) * zoom) / 2 - minX * zoom;
    this.camera.y = (rect.height - (maxY - minY) * zoom) / 2 - minY * zoom;
    this.applyCamera();
    this.saveCamera();
  }

  applyCamera() {
    if (!this.world) return;
    this.world.style.transform = `translate(${this.camera.x}px, ${this.camera.y}px) scale(${this.camera.zoom})`;
    if (this.zoomLabel) this.zoomLabel.textContent = `${Math.round(this.camera.zoom * 100)}%`;
    this.renderLines();
  }

  saveCamera() {
    const project = window.appState.getActiveProject();
    const diagram = this.getDiagram();
    if (!project || !diagram) return;
    diagram.viewport = { ...this.camera };
    window.appState.updateActiveProject({ diagram });
  }

  updateHint(message = null) {
    if (!this.canvasHint) return;
    this.canvasHint.textContent = message || (this.connectMode
      ? (this.connectSourceId ? 'Agora clique no cartão de destino · Esc para cancelar' : 'Clique em um cartão de origem e depois no destino · Esc para sair')
      : 'Passe o cursor na lateral do cartão para conectar · arraste o fundo para navegar · role para aproximar');
  }

  render() {
    if (!this.canvasSurface) return;
    const project = window.appState.getActiveProject();
    if (!project) return;
    const diagram = this.getDiagram();
    const projectChanged = this.cameraProjectId !== project.id;
    this.cameraProjectId = project.id;
    if (projectChanged) {
      this.selectedNodeId = null;
      this.selectedConnectionId = null;
      this.connectSourceId = null;
      const saved = diagram.viewport;
      this.camera = saved && Number.isFinite(saved.zoom)
        ? { x: Number(saved.x) || 0, y: Number(saved.y) || 0, zoom: Math.max(0.25, Math.min(2, saved.zoom)) }
        : { x: 0, y: 0, zoom: 1 };
    }
    this.canvasSurface.innerHTML = diagram.nodes.map(node => {
      const iconByType = { personagem: 'user', cidade: 'building', magia: 'sparkles', evento: 'shield', grupo: 'users', nota: 'note' };
      const icon = iconSvg(iconByType[node.type] || 'note');
      const selected = this.selectedNodeId === node.id;
      return `
        <article class="node-item node-${escapeHtml(node.type || 'nota')} ${selected ? 'selected' : ''} ${this.connectSourceId === node.id ? 'connect-source' : ''}"
          data-node-id="${escapeHtml(node.id)}" data-x="${Number(node.x) || 0}" data-y="${Number(node.y) || 0}"
          style="left:${Number(node.x) || 0}px;top:${Number(node.y) || 0}px" tabindex="0" role="button" aria-label="${escapeHtml(node.label)}. Duplo clique para editar.">
          <button type="button" class="node-connect-zone node-connect-left" data-node-connect="left" aria-label="Criar conexão a partir da lateral esquerda"></button>
          <button type="button" class="node-connect-zone node-connect-right" data-node-connect="right" aria-label="Criar conexão a partir da lateral direita"></button>
          <button type="button" class="node-connect-zone node-connect-top" data-node-connect="top" aria-label="Criar conexão a partir do topo"></button>
          <button type="button" class="node-connect-zone node-connect-bottom" data-node-connect="bottom" aria-label="Criar conexão a partir da base"></button>
          <div class="node-card-topline"><span>${icon} ${escapeHtml(node.type || 'nota')}</span>
            <span class="node-card-actions">
              <button type="button" data-node-action="edit" data-node-id="${escapeHtml(node.id)}" aria-label="Editar cartão">${iconSvg('edit')}</button>
              <button type="button" data-node-action="delete" data-node-id="${escapeHtml(node.id)}" aria-label="Remover cartão">${iconSvg('close')}</button>
            </span>
          </div>
          <h3>${escapeHtml(node.label)}</h3>
          ${node.desc ? `<p>${escapeHtml(node.desc).replace(/\n/g, '<br>')}</p>` : '<p class="node-empty-copy">Clique duas vezes para adicionar detalhes.</p>'}
        </article>`;
    }).join('');
    if (this.resolveNodeCollisions(diagram)) {
      window.appState.updateActiveProject({ diagram });
      return;
    }
    this.applyCamera();
    if (!diagram.viewport && diagram.nodes.length) requestAnimationFrame(() => this.fitCanvas());
    this.updateHint();
  }

  renderSelection() {
    this.canvasSurface.querySelectorAll('.node-item').forEach(node => {
      node.classList.toggle('selected', node.dataset.nodeId === this.selectedNodeId);
    });
    this.renderLines();
  }

  getFacingSides(fromEl, toEl) {
    const fromX = Number(fromEl.dataset.x) + fromEl.offsetWidth / 2;
    const fromY = Number(fromEl.dataset.y) + fromEl.offsetHeight / 2;
    const toX = Number(toEl.dataset.x) + toEl.offsetWidth / 2;
    const toY = Number(toEl.dataset.y) + toEl.offsetHeight / 2;
    const dx = toX - fromX;
    const dy = toY - fromY;
    if (Math.abs(dx) >= Math.abs(dy)) {
      return dx >= 0 ? { fromSide: 'right', toSide: 'left' } : { fromSide: 'left', toSide: 'right' };
    }
    return dy >= 0 ? { fromSide: 'bottom', toSide: 'top' } : { fromSide: 'top', toSide: 'bottom' };
  }

  getConnectionPoint(nodeEl, side) {
    const x = Number(nodeEl.dataset.x);
    const y = Number(nodeEl.dataset.y);
    if (side === 'left') return { x, y: y + nodeEl.offsetHeight / 2 };
    if (side === 'right') return { x: x + nodeEl.offsetWidth, y: y + nodeEl.offsetHeight / 2 };
    if (side === 'top') return { x: x + nodeEl.offsetWidth / 2, y };
    return { x: x + nodeEl.offsetWidth / 2, y: y + nodeEl.offsetHeight };
  }

  getSideNormal(side) {
    return ({ left: [-1, 0], right: [1, 0], top: [0, -1], bottom: [0, 1] })[side] || [1, 0];
  }

  renderLines() {
    if (!this.svgLines) return;
    const diagram = this.getDiagram();
    if (!diagram) {
      this.svgLines.innerHTML = '';
      return;
    }
    const markers = [];
    const edges = diagram.connections.map((connection, index) => {
      const fromEl = this.canvasSurface.querySelector(`[data-node-id="${CSS.escape(connection.from)}"]`);
      const toEl = this.canvasSurface.querySelector(`[data-node-id="${CSS.escape(connection.to)}"]`);
      if (!fromEl || !toEl) return '';
      const facing = this.getFacingSides(fromEl, toEl);
      const fromSide = connection.fromSide || facing.fromSide;
      const toSide = connection.toSide || facing.toSide;
      const start = this.getConnectionPoint(fromEl, fromSide);
      const end = this.getConnectionPoint(toEl, toSide);
      const [fromNx, fromNy] = this.getSideNormal(fromSide);
      const [toNx, toNy] = this.getSideNormal(toSide);
      const bend = Math.max(44, Math.min(160, Math.hypot(end.x - start.x, end.y - start.y) * 0.38));
      const c1x = start.x + fromNx * bend;
      const c1y = start.y + fromNy * bend;
      const c2x = end.x + toNx * bend;
      const c2y = end.y + toNy * bend;
      const path = `M ${start.x} ${start.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${end.x} ${end.y}`;
      const color = this.normalizeColor(connection.color);
      const startId = `canvas-edge-${index}-start`;
      const endId = `canvas-edge-${index}-end`;
      if (connection.startMarker && connection.startMarker !== 'none') markers.push(this.markerMarkup(startId, connection.startMarker, color));
      if (connection.endMarker && connection.endMarker !== 'none') markers.push(this.markerMarkup(endId, connection.endMarker, color));
      const selected = connection.id === this.selectedConnectionId;
      const mx = (start.x + 3*c1x + 3*c2x + end.x) / 8;
      const my = (start.y + 3*c1y + 3*c2y + end.y) / 8;
      const markerStart = connection.startMarker && connection.startMarker !== 'none' ? `marker-start="url(#${startId})"` : '';
      const markerEnd = connection.endMarker && connection.endMarker !== 'none' ? `marker-end="url(#${endId})"` : '';
      return `<g class="connection-group ${selected ? 'selected' : ''}" data-connection-id="${escapeHtml(connection.id)}">
        <path d="${path}" class="connection-hit-area" />
        <path d="${path}"
          class="connection-line ${selected ? 'selected' : ''}" style="stroke:${color}" tabindex="0" role="button" aria-label="Conexão${connection.label ? `: ${escapeHtml(connection.label)}` : ''}. Clique para editar." ${markerStart} ${markerEnd} />
        ${connection.label ? `<text x="${mx}" y="${my - 8}" class="connection-label">${escapeHtml(connection.label)}</text>` : ''}
      </g>`;
    }).join('');
    this.svgLines.innerHTML = `<defs>${markers.join('')}</defs>${edges}`;

    if (this.pointerAction?.type === 'connect') {
      const source = this.canvasSurface.querySelector(`[data-node-id="${CSS.escape(this.pointerAction.sourceId)}"]`);
      if (source) {
        const side = this.pointerAction.sourceSide;
        const start = this.getConnectionPoint(source, side);
        const [nx, ny] = this.getSideNormal(side);
        const point = this.screenToWorld(this.pointerAction.currentX, this.pointerAction.currentY);
        const bend = Math.max(44, Math.min(160, Math.hypot(point.x - start.x, point.y - start.y) * 0.38));
        const c1x = start.x + nx * bend;
        const c1y = start.y + ny * bend;
        this.svgLines.insertAdjacentHTML('beforeend', `<path class="connection-preview" d="M ${start.x} ${start.y} C ${c1x} ${c1y}, ${point.x} ${point.y}, ${point.x} ${point.y}" />`);
      }
    }
  }
}

window.DiagramModule = DiagramModule;
