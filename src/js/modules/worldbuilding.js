/**
 * MÓDULO 3: WORLDBUILDING & SISTEMA DE MAGIAS
 */

class WorldbuildingModule {
  constructor() {
    this.currentSubtab = 'world'; // 'world' ou 'spells'
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

    // Campos de Worldbuilding
    this.loreFields = ['politica', 'leis', 'bioma', 'clima', 'economia', 'religiao', 'geografia'];
  }

  bindEvents() {
    this.subtabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.subtabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentSubtab = btn.dataset.subtab;
        
        if (this.currentSubtab === 'world') {
          this.worldContainer.style.display = 'grid';
          this.spellsContainer.style.display = 'none';
        } else {
          this.worldContainer.style.display = 'none';
          this.spellsContainer.style.display = 'block';
          this.renderSpells();
        }
      });
    });

    // Auto-save para os campos de Worldbuilding
    this.loreFields.forEach(field => {
      const el = document.getElementById(`wb-${field}`);
      if (el) {
        el.addEventListener('input', () => {
          const proj = window.appState.getActiveProject();
          if (!proj) return;
          if (!proj.world) proj.world = {};
          proj.world[field] = el.value;
          window.appState.updateActiveProject({ world: proj.world });
        });
      }
    });

    // Modal de Nova Magia
    if (this.btnNewSpell) {
      this.btnNewSpell.addEventListener('click', () => {
        this.formSpell.reset();
        this.modalSpell.classList.add('active');
      });
    }

    if (this.btnCloseSpellModal) this.btnCloseSpellModal.addEventListener('click', () => this.modalSpell.classList.remove('active'));
    if (this.btnCancelSpellModal) this.btnCancelSpellModal.addEventListener('click', () => this.modalSpell.classList.remove('active'));

    if (this.formSpell) {
      this.formSpell.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSaveSpell();
      });
    }

    window.appState.subscribe(() => {
      this.loadWorldData();
      if (this.currentSubtab === 'spells') this.renderSpells();
    });
  }

  loadWorldData() {
    const proj = window.appState.getActiveProject();
    if (!proj || !proj.world) return;

    this.loreFields.forEach(field => {
      const el = document.getElementById(`wb-${field}`);
      if (el) el.value = proj.world[field] || '';
    });
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

    if (!name) {
      alert('Informe o nome da magia.');
      return;
    }

    if (!proj.spells) proj.spells = [];

    proj.spells.push({
      id: 'sp-' + Date.now(),
      name,
      cost,
      range,
      components,
      effect,
      lore
    });

    window.appState.updateActiveProject({ spells: proj.spells });
    this.modalSpell.classList.remove('active');
    this.renderSpells();
  }

  renderSpells() {
    if (!this.spellsGrid) return;
    const proj = window.appState.getActiveProject();
    if (!proj || !proj.spells || proj.spells.length === 0) {
      this.spellsGrid.innerHTML = '<p class="empty-state">Nenhuma magia cadastrada. Clique em "+ Nova Magia" para registrar feitiços e rituais.</p>';
      return;
    }

    this.spellsGrid.innerHTML = proj.spells.map(spell => `
      <div class="spell-card">
        <div class="spell-card-header">
          <h4 class="spell-name">✨ ${escapeHtml(spell.name)}</h4>
        </div>
        <div class="spell-meta-tags">
          ${spell.cost ? `<span class="spell-tag">Custo: ${escapeHtml(spell.cost)}</span>` : ''}
          ${spell.range ? `<span class="spell-tag">Alcance: ${escapeHtml(spell.range)}</span>` : ''}
          ${spell.components ? `<span class="spell-tag">Comp: ${escapeHtml(spell.components)}</span>` : ''}
        </div>
        <p class="spell-effect"><strong>Efeito:</strong> ${escapeHtml(spell.effect || 'Não especificado.')}</p>
        ${spell.lore ? `<p class="spell-lore">"${escapeHtml(spell.lore)}"` : ''}
      </div>
    `).join('');
  }
}

window.WorldbuildingModule = WorldbuildingModule;

