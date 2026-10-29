/**
 * MÓDULO 3: WORLDBUILDING & SISTEMA DE MAGIAS
 */

class WorldbuildingModule {
  constructor() {
    this.currentSubtab = 'world';
    this.topics = [
      { id: 'politica', icon: 'building', title: 'Política & Governo', description: 'Governantes, impérios, coroas rivais e organizações de poder.' },
      { id: 'leis', icon: 'scales', title: 'Leis & Justiça', description: 'Leis, costumes, crimes, punições e sistemas de justiça.' },
      { id: 'bioma', icon: 'mountain', title: 'Bioma & Fauna', description: 'Vegetação, ecossistemas, criaturas e monstros.' },
      { id: 'clima', icon: 'snowflake', title: 'Clima & Estações', description: 'Estações, fenômenos naturais e condições climáticas.' },
      { id: 'economia', icon: 'coin', title: 'Economia & Comércio', description: 'Moedas, rotas mercantis, recursos e ofícios.' },
      { id: 'religiao', icon: 'sparkles', title: 'Religião & Deuses', description: 'Cultos, panteões, tradições, profecias e heresias.' },
      { id: 'geografia', icon: 'map', title: 'Geografia & Fronteiras', description: 'Regiões, cidades, marcos naturais e fronteiras.' }
    ];
    this.editingEntryId = null;
    this.initElements();
    this.bindEvents();
  }

  initElements() {
    this.subtabBtns = document.querySelectorAll('.world-subtab');
    this.worldContainer = document.getElementById('world-lore-container');
    this.spellsContainer = document.getElementById('world-spells-container');
    this.spellsGrid = document.getElementById('spells-grid');
    this.btnNewSpell = document.getElementById('btn-new-spell');
    this.modalSpell = document.getElementById('modal-spell');
    this.formSpell = document.getElementById('form-spell');
    this.btnCloseSpellModal = document.getElementById('btn-close-spell-modal');
    this.btnCancelSpellModal = document.getElementById('btn-cancel-spell-modal');
    this.spellModalTitle = document.getElementById('spell-modal-title');
    this.spellId = document.getElementById('spell-id');
    this.spellType = document.getElementById('spell-type');
    this.btnSaveSpell = document.getElementById('btn-save-spell');
    this.editingSpellId = null;
    this.spellDetailModal = document.getElementById('modal-spell-detail');
    this.topicModal = document.getElementById('modal-world-topic');
    this.topicModalTitle = document.getElementById('world-topic-modal-title');
    this.topicModalDescription = document.getElementById('world-topic-modal-description');
    this.topicEntryId = document.getElementById('world-topic-entry-id');
    this.topicEntryTitle = document.getElementById('world-topic-entry-title');
    this.topicEntryNotes = document.getElementById('world-topic-entry-notes');
    this.topicEntryList = document.getElementById('world-topic-entry-list');
    this.topicGalleryView = document.getElementById('world-topic-gallery-view');
    this.topicEditorView = document.getElementById('world-topic-editor-view');
    this.btnNewTopicEntry = document.getElementById('btn-new-world-topic-entry');
    this.btnBackTopicGallery = document.getElementById('btn-back-world-topic-gallery');
    this.btnSaveTopicEntry = document.getElementById('btn-save-world-topic-entry');
    this.btnCancelTopicEntry = document.getElementById('btn-cancel-world-topic-entry');
    this.activeTopicId = null;
  }

  bindEvents() {
    this.subtabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.subtabBtns.forEach(item => item.classList.remove('active'));
        btn.classList.add('active');
        this.currentSubtab = btn.dataset.subtab;
        this.worldContainer.style.display = this.currentSubtab === 'world' ? 'grid' : 'none';
        this.spellsContainer.style.display = this.currentSubtab === 'spells' ? 'block' : 'none';
        if (this.currentSubtab === 'spells') this.renderSpells();
      });
    });

    this.worldContainer.addEventListener('click', event => {
      const card = event.target.closest('[data-world-topic]');
      if (card) this.openTopic(card.dataset.worldTopic);
    });

    document.getElementById('btn-close-world-topic').addEventListener('click', () => this.closeTopic());
    this.topicModal.addEventListener('click', event => {
      if (event.target === this.topicModal) this.closeTopic();
      const button = event.target.closest('[data-topic-entry-action]');
      if (!button) return;
      const { topicEntryAction: action, entryId } = button.dataset;
      if (action === 'open') this.editTopicEntry(entryId);
      if (action === 'delete') this.deleteTopicEntry(entryId);
    });
    this.topicEntryList.addEventListener('keydown', event => {
      if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-topic-entry-action="open"]')) {
        event.preventDefault();
        this.editTopicEntry(event.target.dataset.entryId);
      }
    });
    this.btnSaveTopicEntry.addEventListener('click', () => this.saveTopicEntry());
    this.btnCancelTopicEntry.addEventListener('click', () => this.showTopicGallery());
    this.btnNewTopicEntry.addEventListener('click', () => this.showTopicEditor());
    this.btnBackTopicGallery.addEventListener('click', () => this.showTopicGallery());
    this.topicEntryTitle.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.saveTopicEntry();
      }
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && this.topicModal.classList.contains('active')) this.closeTopic();
    });

    if (this.btnNewSpell) this.btnNewSpell.addEventListener('click', () => {
      this.openSpellForm();
    });
    if (this.btnCloseSpellModal) this.btnCloseSpellModal.addEventListener('click', () => this.modalSpell.classList.remove('active'));
    if (this.btnCancelSpellModal) this.btnCancelSpellModal.addEventListener('click', () => this.modalSpell.classList.remove('active'));
    if (this.modalSpell) this.modalSpell.addEventListener('click', event => {
      if (event.target === this.modalSpell) this.modalSpell.classList.remove('active');
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && this.modalSpell.classList.contains('active')) this.modalSpell.classList.remove('active');
      if (event.key === 'Escape' && this.spellDetailModal.classList.contains('active')) this.closeSpellDetail();
    });
    document.getElementById('btn-close-spell-detail').addEventListener('click', () => this.closeSpellDetail());
    this.spellDetailModal.addEventListener('click', event => {
      if (event.target === this.spellDetailModal) this.closeSpellDetail();
    });
    if (this.formSpell) this.formSpell.addEventListener('submit', event => {
      event.preventDefault();
      this.handleSaveSpell();
    });
    if (this.spellsGrid) this.spellsGrid.addEventListener('click', event => {
      const button = event.target.closest('[data-spell-action]');
      if (button) {
        if (button.dataset.spellAction === 'edit') this.openSpellForm(button.dataset.spellId);
        if (button.dataset.spellAction === 'delete') this.deleteSpell(button.dataset.spellId);
        return;
      }
      const card = event.target.closest('[data-spell-id]');
      if (card) this.openSpellDetail(card.dataset.spellId);
    });
    if (this.spellsGrid) this.spellsGrid.addEventListener('keydown', event => {
      if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-spell-id][role="button"]')) {
        event.preventDefault();
        this.openSpellDetail(event.target.dataset.spellId);
      }
    });

    window.appState.subscribe(() => {
      this.loadWorldData();
      if (this.currentSubtab === 'spells') this.renderSpells();
      if (this.activeTopicId) this.renderTopicEntries();
    });
  }

  getEntries(world, topicId, migrate = false) {
    if (!world.topicEntries || typeof world.topicEntries !== 'object' || Array.isArray(world.topicEntries)) {
      world.topicEntries = {};
    }
    if (!Array.isArray(world.topicEntries[topicId])) {
      const oldNote = typeof world[topicId] === 'string' ? world[topicId].trim() : '';
      world.topicEntries[topicId] = oldNote && migrate ? [{
        id: `legacy-${topicId}`,
        title: 'Anotação existente',
        description: oldNote
      }] : [];
    }
    return world.topicEntries[topicId];
  }

  loadWorldData() {
    const proj = window.appState.getActiveProject();
    this.renderWorldTopics(proj && proj.world ? proj.world : {});
  }

  renderWorldTopics(world) {
    if (!this.worldContainer) return;
    this.worldContainer.innerHTML = this.topics.map(topic => {
      const entries = Array.isArray(world.topicEntries?.[topic.id]) ? world.topicEntries[topic.id] : [];
      const preview = entries.length ? escapeHtml(entries[0].title || entries[0].description || 'Item sem título') : 'Clique para adicionar seus primeiros itens.';
      return `
        <button type="button" class="world-topic-card" data-world-topic="${topic.id}" aria-label="Abrir ${escapeHtml(topic.title)}">
          <span class="world-topic-card-top"><span class="world-topic-icon">${iconSvg(topic.icon)}</span><span class="world-topic-entry-count">${entries.length} ${entries.length === 1 ? 'item' : 'itens'}</span></span>
          <span class="world-topic-header">${escapeHtml(topic.title)}</span>
          <span class="world-topic-description">${escapeHtml(topic.description)}</span>
          <span class="world-topic-preview">${preview}</span>
          <span class="world-topic-open-label">Abrir ${escapeHtml(topic.title)} <span aria-hidden="true">→</span></span>
        </button>`;
    }).join('');
  }

  openTopic(topicId) {
    const topic = this.topics.find(item => item.id === topicId);
    const proj = window.appState.getActiveProject();
    if (!topic || !proj) return;
    if (!proj.world) proj.world = {};
    this.activeTopicId = topicId;
    const entries = this.getEntries(proj.world, topicId, true);
    window.appState.updateActiveProject({ world: proj.world });
    this.topicModalTitle.textContent = topic.title;
    this.topicModalDescription.textContent = topic.description;
    this.resetTopicEntryForm();
    this.renderTopicEntries(entries);
    this.topicModal.classList.add('active');
    this.topicModal.setAttribute('aria-hidden', 'false');
    this.showTopicGallery();
  }

  closeTopic() {
    this.topicModal.classList.remove('active');
    this.topicModal.setAttribute('aria-hidden', 'true');
    this.activeTopicId = null;
  }

  renderTopicEntries(entries) {
    if (!this.activeTopicId || !this.topicEntryList) return;
    if (!entries) {
      const proj = window.appState.getActiveProject();
      entries = proj?.world ? this.getEntries(proj.world, this.activeTopicId) : [];
    }
    this.topicEntryList.innerHTML = entries.length ? entries.map(entry => `
      <article class="world-topic-entry-card" data-topic-entry-action="open" data-entry-id="${escapeHtml(entry.id)}" tabindex="0" role="button" aria-label="Abrir ${escapeHtml(entry.title || 'item sem título')}">
        <span class="world-topic-entry-card-icon">${iconSvg('note')}</span>
        <div class="world-topic-entry-content">
          <h5>${escapeHtml(entry.title || 'Item sem título')}</h5>
          ${entry.description ? `<p>${escapeHtml(entry.description).replace(/\n/g, '<br>')}</p>` : '<p class="world-topic-entry-empty">Sem detalhes adicionais.</p>'}
        </div>
        <div class="world-topic-entry-buttons">
          <button type="button" class="btn btn-ghost world-topic-delete" data-topic-entry-action="delete" data-entry-id="${escapeHtml(entry.id)}">Remover</button>
        </div>
      </article>`).join('') : `<div class="world-topic-empty"><span>${iconSvg('note')}</span><p>Nenhum item cadastrado ainda.</p><small>Use “Criar item” para adicionar o primeiro.</small></div>`;
    this.renderWorldTopics(window.appState.getActiveProject()?.world || {});
  }

  saveTopicEntry() {
    const title = this.topicEntryTitle.value.trim();
    if (!title) {
      this.topicEntryTitle.focus();
      return;
    }
    const proj = window.appState.getActiveProject();
    if (!proj || !this.activeTopicId) return;
    const entries = this.getEntries(proj.world || (proj.world = {}), this.activeTopicId);
    const description = this.topicEntryNotes.value.trim();
    if (this.editingEntryId) {
      const entry = entries.find(item => item.id === this.editingEntryId);
      if (entry) Object.assign(entry, { title, description });
    } else {
      entries.push({ id: `wb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, title, description });
    }
    window.appState.updateActiveProject({ world: proj.world });
    this.resetTopicEntryForm();
    this.renderTopicEntries(entries);
    this.showTopicGallery();
  }

  editTopicEntry(entryId) {
    const proj = window.appState.getActiveProject();
    const entry = proj?.world ? this.getEntries(proj.world, this.activeTopicId).find(item => item.id === entryId) : null;
    if (!entry) return;
    this.showTopicEditor();
    this.editingEntryId = entryId;
    this.topicEntryId.value = entryId;
    this.topicEntryTitle.value = entry.title || '';
    this.topicEntryNotes.value = entry.description || '';
    this.btnSaveTopicEntry.textContent = 'Salvar alterações';
    this.btnCancelTopicEntry.hidden = false;
    this.topicEntryTitle.focus();
  }

  showTopicEditor() {
    if (!this.editingEntryId) this.resetTopicEntryForm();
    this.topicGalleryView.hidden = true;
    this.topicEditorView.hidden = false;
    this.topicEntryTitle.focus();
  }

  showTopicGallery() {
    this.resetTopicEntryForm();
    this.topicEditorView.hidden = true;
    this.topicGalleryView.hidden = false;
  }

  deleteTopicEntry(entryId) {
    const proj = window.appState.getActiveProject();
    if (!proj?.world || !this.activeTopicId) return;
    const entries = this.getEntries(proj.world, this.activeTopicId);
    const index = entries.findIndex(item => item.id === entryId);
    if (index === -1) return;
    entries.splice(index, 1);
    window.appState.updateActiveProject({ world: proj.world });
    if (this.editingEntryId === entryId) this.resetTopicEntryForm();
    this.renderTopicEntries(entries);
  }

  resetTopicEntryForm() {
    this.editingEntryId = null;
    this.topicEntryId.value = '';
    this.topicEntryTitle.value = '';
    this.topicEntryNotes.value = '';
    this.btnSaveTopicEntry.textContent = 'Adicionar item';
    this.btnCancelTopicEntry.hidden = true;
  }

  handleSaveSpell() {
    const proj = window.appState.getActiveProject();
    if (!proj) return;
    const name = document.getElementById('spell-name').value.trim();
    const cost = document.getElementById('spell-cost').value.trim();
    const range = document.getElementById('spell-range').value.trim();
    const components = document.getElementById('spell-components').value.trim();
    const effect = document.getElementById('spell-effect').value.trim();
    const lore = document.getElementById('spell-lore').value.trim();
    const type = this.spellType.value;
    const school = document.getElementById('spell-school').value.trim();
    const level = document.getElementById('spell-level').value.trim();
    const duration = document.getElementById('spell-duration').value.trim();
    const castingTime = document.getElementById('spell-casting-time').value.trim();
    const concentration = document.getElementById('spell-concentration').checked;
    if (!name) return alert('Informe o nome da magia.');
    if (!proj.spells) proj.spells = [];
    const spellData = { name, type, school, level, duration, castingTime, concentration, cost, range, components, effect, lore };
    if (this.editingSpellId) {
      const spell = proj.spells.find(item => item.id === this.editingSpellId);
      if (spell) Object.assign(spell, spellData);
    } else {
      proj.spells.push({ id: `sp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, ...spellData });
    }
    window.appState.updateActiveProject({ spells: proj.spells });
    this.modalSpell.classList.remove('active');
    this.editingSpellId = null;
    this.renderSpells();
  }

  openSpellForm(spellId = null) {
    this.formSpell.reset();
    this.editingSpellId = spellId;
    const proj = window.appState.getActiveProject();
    const spell = spellId ? proj?.spells?.find(item => item.id === spellId) : null;
    this.spellId.value = spell?.id || '';
    this.spellModalTitle.textContent = spell ? 'Editar registro do Grimório' : 'Novo registro do Grimório';
    this.btnSaveSpell.textContent = spell ? 'Salvar alterações' : 'Salvar registro';
    if (spell) {
      document.getElementById('spell-name').value = spell.name || '';
      this.spellType.value = spell.type === 'ritual' ? 'ritual' : 'magia';
      document.getElementById('spell-school').value = spell.school || '';
      document.getElementById('spell-level').value = spell.level || '';
      document.getElementById('spell-cost').value = spell.cost || '';
      document.getElementById('spell-range').value = spell.range || '';
      document.getElementById('spell-duration').value = spell.duration || '';
      document.getElementById('spell-casting-time').value = spell.castingTime || '';
      document.getElementById('spell-components').value = spell.components || '';
      document.getElementById('spell-effect').value = spell.effect || '';
      document.getElementById('spell-lore').value = spell.lore || '';
      document.getElementById('spell-concentration').checked = Boolean(spell.concentration);
    }
    this.modalSpell.classList.add('active');
  }

  deleteSpell(spellId) {
    const proj = window.appState.getActiveProject();
    if (!proj?.spells) return;
    const spell = proj.spells.find(item => item.id === spellId);
    if (!spell || !window.confirm(`Remover "${spell.name}" do Grimório?`)) return;
    proj.spells = proj.spells.filter(spell => spell.id !== spellId);
    window.appState.updateActiveProject({ spells: proj.spells });
    this.renderSpells();
  }

  openSpellDetail(spellId) {
    const proj = window.appState.getActiveProject();
    const spell = proj?.spells?.find(item => item.id === spellId);
    if (!spell) return;
    const isRitual = spell.type === 'ritual';
    document.getElementById('spell-detail-emblem').innerHTML = iconSvg(isRitual ? 'wand' : 'sparkles');
    document.getElementById('spell-detail-type').textContent = isRitual ? 'Ritual' : 'Magia';
    document.getElementById('spell-detail-name').textContent = spell.name || 'Sem nome';
    document.getElementById('spell-detail-school').textContent = spell.school || (isRitual ? 'Ritual arcano' : 'Registro do grimório');
    document.getElementById('spell-detail-level').textContent = spell.level || spell.cost || 'Sem círculo';
    const stats = [
      ['Tempo de conjuração', spell.castingTime || '—', 'clock'],
      ['Componentes', spell.components || '—', 'potion'],
      ['Alcance', spell.range || '—', 'compass'],
      ['Duração', spell.duration || '—', 'clock']
    ];
    document.getElementById('spell-detail-stats').innerHTML = stats.map(([label, value, icon]) => `
      <div class="spell-detail-stat"><span class="spell-detail-stat-icon">${iconSvg(icon)}</span><span><small>${label}</small><strong>${escapeHtml(value)}</strong></span></div>`).join('');    document.getElementById('spell-detail-effect').textContent = spell.effect || 'Nenhum efeito ou regra foi descrito.';
    const lore = document.getElementById('spell-detail-lore');
    lore.hidden = !spell.lore;
    lore.textContent = spell.lore || '';
    document.getElementById('spell-detail-tags').innerHTML = [
      spell.concentration ? `<span class="spell-detail-tag concentration">${iconSvg('target')} Concentração</span>` : '',
      isRitual ? `<span class="spell-detail-tag ritual">${iconSvg('wand')} Ritual</span>` : '',
      spell.cost && spell.level ? `<span class="spell-detail-tag">Custo: ${escapeHtml(spell.cost)}</span>` : ''
    ].filter(Boolean).join('');
    this.spellDetailModal.classList.add('active');
    this.spellDetailModal.setAttribute('aria-hidden', 'false');
  }

  closeSpellDetail() {
    this.spellDetailModal.classList.remove('active');
    this.spellDetailModal.setAttribute('aria-hidden', 'true');
  }

  renderSpells() {
    if (!this.spellsGrid) return;
    const proj = window.appState.getActiveProject();
    if (!proj?.spells?.length) {
      this.spellsGrid.innerHTML = `<div class="spell-empty-state"><span>${iconSvg('sparkles')}</span><h4>Seu grimório está vazio</h4><p>Registre magias e rituais para manter as regras e a história do seu mundo reunidas.</p></div>`;
      return;
    }
    this.spellsGrid.innerHTML = proj.spells.map(spell => `
      <article class="spell-card" data-spell-id="${escapeHtml(spell.id)}" tabindex="0" role="button" aria-label="Abrir ${escapeHtml(spell.name)}">
        <div class="spell-card-header"><h4 class="spell-name">${iconSvg(spell.type === 'ritual' ? 'wand' : 'sparkles')} ${escapeHtml(spell.name)}</h4><span class="spell-type-tag">${spell.type === 'ritual' ? 'Ritual' : 'Magia'}</span></div>
        <div class="spell-meta-tags">
          ${spell.cost ? `<span class="spell-tag">Custo: ${escapeHtml(spell.cost)}</span>` : ''}
          ${spell.range ? `<span class="spell-tag">Alcance: ${escapeHtml(spell.range)}</span>` : ''}
          ${spell.components ? `<span class="spell-tag">Comp: ${escapeHtml(spell.components)}</span>` : ''}
        </div>
        <p class="spell-effect"><strong>Efeito:</strong> ${escapeHtml(spell.effect || 'Não especificado.')}</p>
        ${spell.lore ? `<p class="spell-lore">"${escapeHtml(spell.lore)}"</p>` : ''}
        <div class="spell-card-actions">
          <button type="button" class="btn btn-ghost" data-spell-action="edit" data-spell-id="${escapeHtml(spell.id)}">Editar</button>
          <button type="button" class="btn btn-ghost spell-delete" data-spell-action="delete" data-spell-id="${escapeHtml(spell.id)}">Remover</button>
        </div>
      </article>`).join('');
  }
}

window.WorldbuildingModule = WorldbuildingModule;
