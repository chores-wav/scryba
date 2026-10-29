class FamilyTreeModule {
  constructor() {
    this.stage = document.getElementById('family-tree-stage');
    this.generationsEl = document.getElementById('family-tree-generations');
    this.linesSvg = document.getElementById('family-tree-lines');
    this.countEl = document.getElementById('family-tree-count');
    this.galleryView = document.getElementById('family-tree-gallery-view');
    this.detailView = document.getElementById('family-tree-detail-view');
    this.galleryEl = document.getElementById('family-tree-gallery');
    this.treeModal = document.getElementById('modal-family-tree');
    this.treeForm = document.getElementById('form-family-tree');
    this.selectedTreeId = null;
    this.selectedProjectId = null;
    this.modal = document.getElementById('modal-family-member');
    this.form = document.getElementById('form-family-member');
    this.parentOptions = document.getElementById('family-parent-options');
    this.avatarDrop = document.getElementById('family-avatar-drop');
    this.avatarInput = document.getElementById('family-member-avatar-input');
    this.avatarPreview = document.getElementById('family-avatar-preview');
    this.avatarPlaceholder = document.getElementById('family-avatar-placeholder');
    this.avatarData = '';
    this.editingId = null;
    this.bindEvents();
    this.render();
  }

  getTrees() {
    const project = window.appState.getActiveProject();
    if (!project) return [];
    if (!Array.isArray(project.familyTrees)) {
      const legacyMembers = Array.isArray(project.familyTree) ? project.familyTree : [];
      project.familyTrees = legacyMembers.length ? [{
        id: 'family-tree-legacy',
        name: 'Árvore genealógica',
        description: 'Linhagem já existente no projeto.',
        members: legacyMembers
      }] : [];
      project.familyTree = [];
      window.appState.updateActiveProject({ familyTrees: project.familyTrees, familyTree: project.familyTree });
    }
    project.familyTrees.forEach(tree => {
      if (!Array.isArray(tree.members)) tree.members = [];
      tree.members.forEach(member => {
        if (!Array.isArray(member.parents)) member.parents = [];
      });
    });
    return project.familyTrees;
  }

  getCurrentTree() {
    return this.getTrees().find(tree => tree.id === this.selectedTreeId) || null;
  }

  getMembers() {
    return this.getCurrentTree()?.members || [];
  }

  bindEvents() {
    document.getElementById('btn-create-family-tree')?.addEventListener('click', () => this.openTreeModal());
    document.getElementById('btn-close-family-tree')?.addEventListener('click', () => this.closeTreeModal());
    document.getElementById('btn-cancel-family-tree')?.addEventListener('click', () => this.closeTreeModal());
    document.getElementById('btn-back-family-gallery')?.addEventListener('click', () => {
      this.selectedTreeId = null;
      this.render();
    });
    this.treeForm?.addEventListener('submit', event => {
      event.preventDefault();
      this.createTree();
    });
    this.galleryEl?.addEventListener('click', event => {
      const action = event.target.closest('[data-family-tree-action]');
      const card = event.target.closest('[data-family-tree-id]');
      if (action?.dataset.familyTreeAction === 'delete') {
        event.stopPropagation();
        this.deleteTree(action.dataset.treeId);
        return;
      }
      if (action?.dataset.familyTreeAction === 'open') {
        event.stopPropagation();
        this.selectedTreeId = action.dataset.treeId;
        this.selectedProjectId = window.appState.getActiveProject()?.id || null;
        this.render();
        return;
      }
      if (card) {
        this.selectedTreeId = card.dataset.familyTreeId;
        this.selectedProjectId = window.appState.getActiveProject()?.id || null;
        this.render();
      }
    });
    this.treeModal?.addEventListener('click', event => {
      if (event.target === this.treeModal) this.closeTreeModal();
    });
    document.getElementById('btn-add-family-member')?.addEventListener('click', () => this.openModal());
    document.getElementById('btn-close-family-member')?.addEventListener('click', () => this.closeModal());
    document.getElementById('btn-cancel-family-member')?.addEventListener('click', () => this.closeModal());
    this.form?.addEventListener('submit', event => {
      event.preventDefault();
      this.saveMember();
    });
    this.generationsEl?.addEventListener('click', event => {
      const action = event.target.closest('[data-family-action]');
      if (!action) return;
      if (action.dataset.familyAction === 'new') this.openModal();
      if (action.dataset.familyAction === 'edit') this.openModal(action.dataset.memberId);
      if (action.dataset.familyAction === 'delete') this.deleteMember(action.dataset.memberId);
    });
    this.parentOptions?.addEventListener('change', event => {
      if (this.parentOptions.querySelectorAll('input:checked').length > 2) {
        event.target.checked = false;
        this.announce('Escolha no máximo dois progenitores.');
      }
    });
    document.getElementById('btn-select-family-avatar')?.addEventListener('click', () => this.avatarInput?.click());
    this.avatarDrop?.addEventListener('click', () => this.avatarInput?.click());
    this.avatarDrop?.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.avatarInput?.click();
      }
    });
    this.avatarInput?.addEventListener('change', () => {
      const file = this.avatarInput.files?.[0];
      if (file) this.loadAvatarFile(file);
      this.avatarInput.value = '';
    });
    document.getElementById('btn-remove-family-avatar')?.addEventListener('click', () => {
      this.avatarData = '';
      this.updateAvatarPreview();
    });
    this.avatarDrop?.addEventListener('dragover', event => {
      if (![...(event.dataTransfer?.files || [])].some(file => file.type.startsWith('image/'))) return;
      event.preventDefault();
      this.avatarDrop.classList.add('is-drag-over');
    });
    this.avatarDrop?.addEventListener('dragleave', event => {
      if (!event.relatedTarget || !this.avatarDrop.contains(event.relatedTarget)) this.avatarDrop.classList.remove('is-drag-over');
    });
    this.avatarDrop?.addEventListener('drop', event => {
      const file = [...(event.dataTransfer?.files || [])].find(item => item.type.startsWith('image/'));
      if (!file) return;
      event.preventDefault();
      this.avatarDrop.classList.remove('is-drag-over');
      this.loadAvatarFile(file);
    });
    this.modal?.addEventListener('click', event => {
      if (event.target === this.modal) this.closeModal();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && this.modal?.classList.contains('active')) this.closeModal();
      if (event.key === 'Escape' && this.treeModal?.classList.contains('active')) this.closeTreeModal();
    });
    window.appState.subscribe(() => this.render());
    window.addEventListener('resize', () => this.drawConnections());
  }

  openTreeModal() {
    this.treeForm?.reset();
    this.treeModal?.classList.add('active');
    this.treeModal?.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => document.getElementById('family-tree-name')?.focus());
  }

  closeTreeModal() {
    this.treeModal?.classList.remove('active');
    this.treeModal?.setAttribute('aria-hidden', 'true');
  }

  createTree() {
    const trees = this.getTrees();
    const id = 'family-tree-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    const tree = {
      id,
      name: document.getElementById('family-tree-name').value.trim(),
      description: document.getElementById('family-tree-description').value.trim(),
      createdAt: new Date().toISOString(),
      members: []
    };
    trees.push(tree);
    this.selectedTreeId = id;
    this.selectedProjectId = window.appState.getActiveProject()?.id || null;
    this.closeTreeModal();
    window.appState.updateActiveProject({ familyTrees: trees });
  }

  deleteTree(treeId) {
    const trees = this.getTrees();
    const tree = trees.find(item => item.id === treeId);
    if (!tree || !confirm('Excluir a árvore “' + tree.name + '” e todas as pessoas nela?')) return;
    const remaining = trees.filter(item => item.id !== treeId);
    if (this.selectedTreeId === treeId) this.selectedTreeId = null;
    window.appState.updateActiveProject({ familyTrees: remaining });
  }

  openModal(memberId) {
    const members = this.getMembers();
    const member = members.find(item => item.id === memberId);
    this.editingId = member ? member.id : null;
    this.form.reset();
    document.getElementById('family-member-id').value = member ? member.id : '';
    document.getElementById('family-member-name').value = member ? member.name : '';
    document.getElementById('family-member-role').value = member ? member.role || '' : '';
    document.getElementById('family-member-birth').value = member ? member.birth || '' : '';
    document.getElementById('family-member-death').value = member ? member.death || '' : '';
    document.getElementById('family-member-notes').value = member ? member.notes || '' : '';
    this.avatarData = member ? member.avatar || '' : '';
    this.updateAvatarPreview();
    document.getElementById('family-member-modal-title').textContent = member ? 'Editar pessoa' : 'Adicionar pessoa';
    document.getElementById('btn-save-family-member').textContent = member ? 'Salvar alterações' : 'Salvar pessoa';
    this.renderParentOptions(member);
    this.modal.classList.add('active');
    this.modal.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => document.getElementById('family-member-name')?.focus());
  }

  renderParentOptions(member) {
    const members = this.getMembers().filter(item => !member || item.id !== member.id);
    const descendants = member ? this.getDescendantIds(member.id) : new Set();
    if (!members.length) {
      this.parentOptions.innerHTML = '<span class="organization-empty-hint">Cadastre outra pessoa para definir progenitores.</span>';
      return;
    }
    this.parentOptions.innerHTML = members.map(person => {
      const disabled = descendants.has(person.id);
      const checked = member && member.parents.includes(person.id) && !disabled;
      return '<label class="family-parent-option ' + (disabled ? 'is-disabled' : '') + '">' +
        '<input type="checkbox" value="' + escapeHtml(person.id) + '" ' + (checked ? 'checked' : '') + ' ' + (disabled ? 'disabled' : '') + '>' +
        '<span>' + escapeHtml(person.name) + (person.role ? '<small>' + escapeHtml(person.role) + '</small>' : '') + '</span></label>';
    }).join('');
  }

  getDescendantIds(memberId) {
    const members = this.getMembers();
    const descendants = new Set();
    const queue = [memberId];
    while (queue.length) {
      const parentId = queue.shift();
      members.filter(item => item.parents.includes(parentId)).forEach(child => {
        if (!descendants.has(child.id)) {
          descendants.add(child.id);
          queue.push(child.id);
        }
      });
    }
    return descendants;
  }

  saveMember() {
    const project = window.appState.getActiveProject();
    if (!project) return;
    const members = this.getMembers();
    const id = this.editingId || ('family-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7));
    const existing = members.find(item => item.id === id);
    const parents = [...this.parentOptions.querySelectorAll('input:checked')].map(input => input.value).slice(0, 2);
    const member = {
      id,
      name: document.getElementById('family-member-name').value.trim(),
      role: document.getElementById('family-member-role').value.trim(),
      birth: document.getElementById('family-member-birth').value.trim(),
      death: document.getElementById('family-member-death').value.trim(),
      avatar: this.avatarData,
      parents,
      notes: document.getElementById('family-member-notes').value.trim()
    };
    if (existing) Object.assign(existing, member);
    else members.push(member);
    const trees = this.getTrees();
    const tree = trees.find(item => item.id === this.selectedTreeId);
    if (!tree) return;
    tree.members = members;
    window.appState.updateActiveProject({ familyTrees: trees });
    this.closeModal();
  }

  deleteMember(memberId) {
    const members = this.getMembers();
    const member = members.find(item => item.id === memberId);
    if (!member || !confirm('Excluir ' + member.name + ' da árvore genealógica?')) return;
    const remaining = members.filter(item => item.id !== memberId);
    remaining.forEach(item => { item.parents = item.parents.filter(parentId => parentId !== memberId); });
    const tree = this.getCurrentTree();
    if (!tree) return;
    tree.members = remaining;
    window.appState.updateActiveProject({ familyTrees: this.getTrees() });
  }

  closeModal() {
    this.modal?.classList.remove('active');
    this.modal?.setAttribute('aria-hidden', 'true');
    this.editingId = null;
  }

  async loadAvatarFile(file) {
    if (!file.type.startsWith('image/')) return;
    if (file.size > 20 * 1024 * 1024) {
      alert('A imagem precisa ter menos de 20 MB.');
      return;
    }
    try {
      const source = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const image = new Image();
      image.src = source;
      await image.decode();
      const maxSize = 512;
      const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      this.avatarData = canvas.toDataURL('image/jpeg', 0.84);
      this.updateAvatarPreview();
    } catch (error) {
      console.error('Não foi possível carregar o retrato da pessoa.', error);
      alert('Não foi possível abrir esta imagem. Tente outro arquivo.');
    }
  }

  updateAvatarPreview() {
    if (!this.avatarPreview || !this.avatarPlaceholder) return;
    this.avatarPreview.hidden = !this.avatarData;
    this.avatarPlaceholder.hidden = Boolean(this.avatarData);
    if (this.avatarData) this.avatarPreview.src = this.avatarData;
    else this.avatarPreview.removeAttribute('src');
  }

  generationFor(member, members, cache, visiting) {
    if (cache.has(member.id)) return cache.get(member.id);
    if (visiting.has(member.id)) return 0;
    const nextVisiting = new Set(visiting);
    nextVisiting.add(member.id);
    const parents = member.parents.map(id => members.find(item => item.id === id)).filter(Boolean);
    const level = parents.length ? Math.max(...parents.map(parent => this.generationFor(parent, members, cache, nextVisiting))) + 1 : 0;
    cache.set(member.id, level);
    return level;
  }

  render() {
    if (!this.generationsEl) return;
    const project = window.appState.getActiveProject();
    const trees = this.getTrees();
    if (project?.id !== this.selectedProjectId) {
      this.selectedProjectId = project?.id || null;
      this.selectedTreeId = null;
    }
    const selectedTree = trees.find(tree => tree.id === this.selectedTreeId) || null;
    this.galleryView.hidden = Boolean(selectedTree);
    this.detailView.hidden = !selectedTree;
    this.renderGallery(trees);
    if (!selectedTree) {
      this.generationsEl.innerHTML = '';
      this.linesSvg.innerHTML = '';
      this.stage.style.minWidth = '';
      this.stage.style.minHeight = '';
      return;
    }
    document.getElementById('family-tree-title').textContent = selectedTree.name;
    const members = this.getMembers();
    if (this.countEl) this.countEl.textContent = members.length + (members.length === 1 ? ' pessoa' : ' pessoas');
    if (!members.length) {
      this.generationsEl.innerHTML = '<div class="organization-empty"><span class="organization-empty-icon">' + iconSvg('tree') + '</span><h3>Esta linhagem começa aqui</h3><p>Adicione pessoas e conecte seus progenitores para visualizar as gerações.</p><button type="button" class="btn btn-primary" data-family-action="new">Adicionar primeira pessoa</button></div>';
      this.linesSvg.innerHTML = '';
      this.stage.style.minWidth = '';
      this.stage.style.minHeight = '';
      return;
    }
    const cache = new Map();
    const levels = new Map();
    members.forEach(member => {
      const level = this.generationFor(member, members, cache, new Set());
      if (!levels.has(level)) levels.set(level, []);
      levels.get(level).push(member);
    });
    const orderedLevels = [...levels.keys()].sort((a, b) => a - b);
    this.generationsEl.innerHTML = orderedLevels.map((level, index) => {
      const people = levels.get(level).map(person => {
        const parents = person.parents.map(id => members.find(item => item.id === id)).filter(Boolean);
        const dates = person.birth || person.death ? '<span class="family-person-dates">' + escapeHtml(person.birth || '?') + (person.death ? ' — ' + escapeHtml(person.death) : '') + '</span>' : '';
        const portrait = person.avatar
          ? '<img src="' + escapeHtml(person.avatar) + '" alt="Retrato de ' + escapeHtml(person.name) + '">'
          : '<span>' + escapeHtml((person.name || '?').trim().charAt(0).toUpperCase()) + '</span>';
        return '<article class="family-person-card" data-family-person="' + escapeHtml(person.id) + '">' +
          '<div class="family-person-portrait" aria-hidden="true">' + portrait + '</div>' +
          '<div class="family-person-content"><h3>' + escapeHtml(person.name) + '</h3>' +
          (person.role ? '<span class="family-person-role">' + escapeHtml(person.role) + '</span>' : '') + dates +
          (person.notes ? '<p>' + escapeHtml(person.notes) + '</p>' : '') + '</div>' +
          '<div class="family-person-actions"><button type="button" data-family-action="edit" data-member-id="' + escapeHtml(person.id) + '" aria-label="Editar ' + escapeHtml(person.name) + '" title="Editar">' + iconSvg('edit') + '</button>' +
          '<button type="button" data-family-action="delete" data-member-id="' + escapeHtml(person.id) + '" aria-label="Excluir ' + escapeHtml(person.name) + '" title="Excluir">' + iconSvg('close') + '</button></div></article>';
      }).join('');
      return '<section class="family-generation" aria-label="Geração ' + (index + 1) + '">' +
        '<div class="family-generation-heading"><span>Geração ' + (index + 1) + '</span><small>' + levels.get(level).length + ' pessoas</small></div>' +
        '<div class="family-generation-list">' + people + '</div></section>';
    }).join('');
    this.stage.style.minWidth = Math.max(760, ...[...levels.values()].map(items => items.length * 190 + (items.length - 1) * 54 + 64)) + 'px';
    this.stage.style.minHeight = Math.max(500, (orderedLevels.length * 240) + 64) + 'px';
    requestAnimationFrame(() => this.drawConnections());
  }

  renderGallery(trees) {
    if (!this.galleryEl) return;
    if (!trees.length) {
      this.galleryEl.innerHTML = '<div class="organization-empty family-tree-gallery-empty"><span class="organization-empty-icon">' + iconSvg('tree') + '</span><h3>Suas linhagens começam aqui</h3><p>Crie uma árvore para organizar os personagens e relações de uma família.</p><button type="button" class="btn btn-primary" data-family-tree-action="create">+ Criar primeira árvore</button></div>';
      return;
    }
    this.galleryEl.innerHTML = trees.map(tree => {
      const members = Array.isArray(tree.members) ? tree.members : [];
      const portrait = members.find(member => member.avatar)?.avatar;
      const preview = portrait
        ? '<img class="family-tree-card-preview" src="' + escapeHtml(portrait) + '" alt="">'
        : '<span class="family-tree-card-mark" aria-hidden="true">' + iconSvg('tree') + '</span>';
      const peopleCount = members.length + (members.length === 1 ? ' pessoa' : ' pessoas');
      return '<article class="family-tree-gallery-card" data-family-tree-id="' + escapeHtml(tree.id) + '">' +
        '<div class="family-tree-card-art">' + preview + '<span class="family-tree-card-branch" aria-hidden="true">⌁</span></div>' +
        '<div class="family-tree-card-body"><span class="family-tree-card-count">' + peopleCount + '</span><h3>' + escapeHtml(tree.name) + '</h3>' +
        (tree.description ? '<p>' + escapeHtml(tree.description) + '</p>' : '<p class="family-tree-card-muted">Linhagem familiar</p>') +
        '<button type="button" class="family-tree-card-open" data-family-tree-action="open" data-tree-id="' + escapeHtml(tree.id) + '">Abrir árvore ' + iconSvg('arrow-right') + '</button></div>' +
        '<button type="button" class="family-tree-card-delete" data-family-tree-action="delete" data-tree-id="' + escapeHtml(tree.id) + '" aria-label="Excluir árvore ' + escapeHtml(tree.name) + '" title="Excluir árvore">' + iconSvg('close') + '</button>' +
        '</article>';
    }).join('');
    this.galleryEl.querySelector('[data-family-tree-action="create"]')?.addEventListener('click', () => this.openTreeModal());
  }

  drawConnections() {
    if (!this.stage || !this.linesSvg || !this.generationsEl?.children.length) return;
    const stageRect = this.stage.getBoundingClientRect();
    const width = Math.max(this.stage.scrollWidth, stageRect.width);
    const height = Math.max(this.stage.scrollHeight, this.generationsEl.scrollHeight);
    this.linesSvg.setAttribute('width', width);
    this.linesSvg.setAttribute('height', height);
    this.linesSvg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
    const members = this.getMembers();
    const cards = [...this.generationsEl.querySelectorAll('[data-family-person]')];
    const cardFor = id => cards.find(node => node.dataset.familyPerson === id);
    const groups = new Map();
    members.forEach(child => {
      const parents = child.parents.filter(id => members.some(item => item.id === id));
      if (!parents.length || !cardFor(child.id)) return;
      const key = parents.slice().sort().join('|');
      if (!groups.has(key)) groups.set(key, { parents, children: [] });
      groups.get(key).children.push(child);
    });
    const paths = [];
    groups.forEach(group => {
      const parentRects = group.parents.map(id => cardFor(id)?.getBoundingClientRect()).filter(Boolean);
      const childRects = group.children.map(item => cardFor(item.id)?.getBoundingClientRect()).filter(Boolean);
      if (!parentRects.length || !childRects.length) return;
      const parentY = Math.max(...parentRects.map(rect => rect.bottom - stageRect.top));
      const childY = Math.min(...childRects.map(rect => rect.top - stageRect.top));
      const junctionY = parentY + Math.max(22, (childY - parentY) / 2);
      const parentCenters = parentRects.map(rect => rect.left + rect.width / 2 - stageRect.left);
      const childCenters = childRects.map(rect => rect.left + rect.width / 2 - stageRect.left);
      const allCenters = parentCenters.concat(childCenters);
      const minX = Math.min(...allCenters);
      const maxX = Math.max(...allCenters);
      parentCenters.forEach(x => paths.push('<path class="family-tree-connector" d="M ' + x + ' ' + parentY + ' V ' + junctionY + '"/>'));
      paths.push('<path class="family-tree-connector" d="M ' + minX + ' ' + junctionY + ' H ' + maxX + '"/>');
      childCenters.forEach(x => paths.push('<path class="family-tree-connector" d="M ' + x + ' ' + junctionY + ' V ' + (childY - 4) + '"/>'));
    });
    this.linesSvg.innerHTML = paths.join('');
  }

  announce(message) {
    const hint = document.querySelector('.family-tree-hint');
    if (!hint) return;
    hint.textContent = message;
    clearTimeout(this.hintTimeout);
    this.hintTimeout = setTimeout(() => { hint.textContent = 'Escolha até dois progenitores ao cadastrar cada pessoa.'; }, 2400);
  }
}

window.FamilyTreeModule = FamilyTreeModule;
