/**
 * MÓDULO 5: FERRAMENTA DE DIAGRAMA E CONEXÕES (ESTILO OBSIDIAN CANVAS)
 */

class DiagramModule {
  constructor() {
    this.canvasSurface = document.getElementById('canvas-surface');
    this.svgLines = document.getElementById('connections-svg');
    this.btnAddNode = document.getElementById('btn-add-node');
    this.modalNode = document.getElementById('modal-node');
    this.formNode = document.getElementById('form-node');
    this.btnCloseNodeModal = document.getElementById('btn-close-node-modal');
    this.btnCancelNodeModal = document.getElementById('btn-cancel-node-modal');
    
    this.draggedNode = null;
    this.dragOffset = { x: 0, y: 0 };

    this.bindEvents();
  }

  bindEvents() {
    if (this.btnAddNode) {
      this.btnAddNode.addEventListener('click', () => {
        this.formNode.reset();
        this.modalNode.classList.add('active');
      });
    }

    if (this.btnCloseNodeModal) this.btnCloseNodeModal.addEventListener('click', () => this.modalNode.classList.remove('active'));
    if (this.btnCancelNodeModal) this.btnCancelNodeModal.addEventListener('click', () => this.modalNode.classList.remove('active'));

    if (this.formNode) {
      this.formNode.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleCreateNode();
      });
    }

    // Drag & Drop no canvas
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', () => this.onMouseUp());

    window.appState.subscribe(() => {
      this.render();
    });
  }

  handleCreateNode() {
    const proj = window.appState.getActiveProject();
    if (!proj) return;

    const label = document.getElementById('node-label').value.trim();
    const type = document.getElementById('node-type').value;
    const desc = document.getElementById('node-desc').value.trim();

    if (!label) {
      alert('Informe o título do nó.');
      return;
    }

    if (!proj.diagram) proj.diagram = { nodes: [], connections: [] };

    // Posiciona no centro visível
    const newNode = {
      id: 'node-' + Date.now(),
      label,
      type,
      desc,
      x: 180 + Math.random() * 200,
      y: 120 + Math.random() * 150
    };

    proj.diagram.nodes.push(newNode);
    window.appState.updateActiveProject({ diagram: proj.diagram });
    this.modalNode.classList.remove('active');
    this.render();
  }

  onMouseDown(e, nodeData, nodeEl) {
    this.draggedNode = { data: nodeData, el: nodeEl };
    const rect = nodeEl.getBoundingClientRect();
    this.dragOffset = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  onMouseMove(e) {
    if (!this.draggedNode || !this.canvasSurface) return;
    const canvasRect = this.canvasSurface.getBoundingClientRect();
    const newX = e.clientX - canvasRect.left - this.dragOffset.x;
    const newY = e.clientY - canvasRect.top - this.dragOffset.y;

    this.draggedNode.data.x = Math.max(10, newX);
    this.draggedNode.data.y = Math.max(10, newY);

    this.draggedNode.el.style.left = `${this.draggedNode.data.x}px`;
    this.draggedNode.el.style.top = `${this.draggedNode.data.y}px`;

    this.renderLines();
  }

  onMouseUp() {
    if (this.draggedNode) {
      const proj = window.appState.getActiveProject();
      if (proj && proj.diagram) {
        window.appState.updateActiveProject({ diagram: proj.diagram });
      }
      this.draggedNode = null;
    }
  }

  render() {
    if (!this.canvasSurface) return;
    const proj = window.appState.getActiveProject();
    if (!proj || !proj.diagram || !proj.diagram.nodes) {
      this.canvasSurface.innerHTML = '';
      return;
    }

    this.canvasSurface.innerHTML = '';

    proj.diagram.nodes.forEach(n => {
      const el = document.createElement('div');
      el.className = `node-item node-${n.type}`;
      el.style.left = `${n.x || 100}px`;
      el.style.top = `${n.y || 100}px`;

      let icon = '📌';
      if (n.type === 'personagem') icon = '👤';
      if (n.type === 'cidade') icon = '🏰';
      if (n.type === 'magia') icon = '✨';
      if (n.type === 'evento') icon = '⚔️';

      el.innerHTML = `
        <div class="node-header"><span>${icon}</span> <span>${escapeHtml(n.label)}</span></div>
        ${n.desc ? `<div class="node-desc">${escapeHtml(n.desc)}</div>` : ''}
      `;

      el.addEventListener('mousedown', (e) => this.onMouseDown(e, n, el));
      this.canvasSurface.appendChild(el);
    });

    this.renderLines();
  }

  renderLines() {
    if (!this.svgLines) return;
    const proj = window.appState.getActiveProject();
    if (!proj || !proj.diagram || !proj.diagram.connections) {
      this.svgLines.innerHTML = '';
      return;
    }

    const nodeMap = {};
    if (proj.diagram.nodes) {
      proj.diagram.nodes.forEach(n => { nodeMap[n.id] = n; });
    }

    this.svgLines.innerHTML = proj.diagram.connections.map(conn => {
      const fromNode = nodeMap[conn.from];
      const toNode = nodeMap[conn.to];
      if (!fromNode || !toNode) return '';

      // Centro estimado dos nós
      const x1 = (fromNode.x || 100) + 80;
      const y1 = (fromNode.y || 100) + 30;
      const x2 = (toNode.x || 100) + 80;
      const y2 = (toNode.y || 100) + 30;

      return `
        <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="connection-line" />
      `;
    }).join('');
  }
}

window.DiagramModule = DiagramModule;

