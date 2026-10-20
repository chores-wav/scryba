/**
 * MÓDULO 4: PERSONAGENS ADAPTATIVO (LIVRO vs RPG / PJ vs NPC)
 */

class CharactersModule {
  constructor() {
    this.currentFilter = 'all'; // 'all', 'pj', 'npc'
    this.initElements();
    this.bindEvents();
  }

  initElements() {
    this.gridEl = document.getElementById('characters-grid');
    this.btnNewChar = document.getElementById('btn-new-character');
    this.filterButtons = document.querySelectorAll('.char-filter-btn');
    this.modal = document.getElementById('modal-character');
    this.form = document.getElementById('form-character');
    this.btnCloseModal = document.getElementById('btn-close-char-modal');
    this.btnCancelModal = document.getElementById('btn-cancel-char-modal');
    this.rpgFieldsContainer = document.getElementById('char-rpg-fields');
    this.bookFieldsContainer = document.getElementById('char-book-fields');
    this.charTypeSelect = document.getElementById('char-subtype-select');
  }

  bindEvents() {
    if (this.btnNewChar) {
      this.btnNewChar.addEventListener('click', () => this.openModal());
    }

    if (this.btnCloseModal) this.btnCloseModal.addEventListener('click', () => this.closeModal());
    if (this.btnCancelModal) this.btnCancelModal.addEventListener('click', () => this.closeModal());

    this.filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentFilter = btn.dataset.filter;
        this.renderGrid();
      });
    });

    if (this.form) {
      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSaveCharacter();
      });
    }

    window.appState.subscribe(() => {
      this.renderGrid();
    });
  }

  openModal() {
    const proj = window.appState.getActiveProject();
    const isRpg = proj && proj.type === 'rpg';

    this.form.reset();
    
    // Alterna visualização dos campos conforme o tipo do projeto (Livro vs RPG)
    if (this.rpgFieldsContainer) {
      this.rpgFieldsContainer.style.display = isRpg ? 'block' : 'none';
    }
    if (this.bookFieldsContainer) {
      this.bookFieldsContainer.style.display = isRpg ? 'none' : 'block';
    }

    this.modal.classList.add('active');
  }

  closeModal() {
    this.modal.classList.remove('active');
  }

  handleSaveCharacter() {
    const proj = window.appState.getActiveProject();
    if (!proj) return;

    const isRpg = proj.type === 'rpg';
    const name = document.getElementById('char-name').value.trim();
    const role = document.getElementById('char-role').value.trim();
    const summary = document.getElementById('char-summary').value.trim();

    if (!name) {
      alert('Informe o nome do personagem.');
      return;
    }

    if (!proj.characters) proj.characters = [];

    if (isRpg) {
      const subType = this.charTypeSelect ? this.charTypeSelect.value : 'pj';
      const stats = {
        for: parseInt(document.getElementById('stat-for').value) || 10,
        des: parseInt(document.getElementById('stat-des').value) || 10,
        con: parseInt(document.getElementById('stat-con').value) || 10,
        int: parseInt(document.getElementById('stat-int').value) || 10,
        sab: parseInt(document.getElementById('stat-sab').value) || 10,
        car: parseInt(document.getElementById('stat-car').value) || 10,
      };
      const skills = document.getElementById('char-skills').value.trim();
      const equipment = document.getElementById('char-equip').value.trim();
      const notes = document.getElementById('char-notes').value.trim();

      proj.characters.push({
        id: 'char-' + Date.now(),
        name,
        role: role || 'Aventureiro',
        type: 'rpg',
        subType,
        avatar: subType === 'pj' ? '🛡️' : '👤',
        summary,
        stats,
        skills,
        equipment,
        notes
      });
    } else {
      const arc = document.getElementById('char-arc').value.trim();
      const details = document.getElementById('char-details').value.trim();

      proj.characters.push({
        id: 'char-' + Date.now(),
        name,
        role: role || 'Personagem',
        type: 'narrative',
        avatar: '✍️',
        summary,
        arc,
        details
      });
    }

    window.appState.updateActiveProject({ characters: proj.characters });
    this.closeModal();
    this.renderGrid();
  }

  renderGrid() {
    if (!this.gridEl) return;
    const proj = window.appState.getActiveProject();
    if (!proj || !proj.characters) {
      this.gridEl.innerHTML = '<p class="empty-state">Nenhum personagem cadastrado.</p>';
      return;
    }

    let chars = proj.characters;
    if (this.currentFilter === 'pj') {
      chars = chars.filter(c => c.subType === 'pj');
    } else if (this.currentFilter === 'npc') {
      chars = chars.filter(c => c.subType === 'npc');
    }

    if (chars.length === 0) {
      this.gridEl.innerHTML = '<p class="empty-state">Nenhum personagem nesta categoria.</p>';
      return;
    }

    this.gridEl.innerHTML = chars.map(char => {
      const isRpg = char.type === 'rpg';
      const badge = isRpg 
        ? (char.subType === 'pj' ? '<span class="badge badge-pj">PJ</span>' : '<span class="badge badge-npc">NPC</span>')
        : '<span class="badge badge-book">Narrativa</span>';

      let statsSnippet = '';
      if (isRpg && char.stats) {
        statsSnippet = `
          <div class="rpg-stats-grid">
            <div class="rpg-stat-box"><span class="rpg-stat-label">FOR</span><div class="rpg-stat-val">${char.stats.for}</div></div>
            <div class="rpg-stat-box"><span class="rpg-stat-label">DES</span><div class="rpg-stat-val">${char.stats.des}</div></div>
            <div class="rpg-stat-box"><span class="rpg-stat-label">CON</span><div class="rpg-stat-val">${char.stats.con}</div></div>
            <div class="rpg-stat-box"><span class="rpg-stat-label">INT</span><div class="rpg-stat-val">${char.stats.int}</div></div>
            <div class="rpg-stat-box"><span class="rpg-stat-label">SAB</span><div class="rpg-stat-val">${char.stats.sab}</div></div>
            <div class="rpg-stat-box"><span class="rpg-stat-label">CAR</span><div class="rpg-stat-val">${char.stats.car}</div></div>
          </div>
        `;
      }

      return `
        <div class="character-card">
          <div class="character-card-top">
            <div class="char-avatar">${char.avatar || '👤'}</div>
            <div style="flex: 1; overflow: hidden;">
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <h4 class="char-info-name">${escapeHtml(char.name)}</h4>
                ${badge}
              </div>
              <span class="char-info-role">${escapeHtml(char.role)}</span>
            </div>
          </div>
          <p class="character-card-summary">${escapeHtml(char.summary || 'Sem resumo.')}</p>
          ${statsSnippet}
        </div>
      `;
    }).join('');
  }
}

window.CharactersModule = CharactersModule;

