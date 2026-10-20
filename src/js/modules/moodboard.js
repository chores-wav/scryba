/**
 * MÓDULO 2: MURAL VISUAL DE ESTÉTICA (MOODBOARD)
 */

class MoodboardModule {
  constructor() {
    this.initElements();
    this.bindEvents();
  }

  initElements() {
    this.grid = document.getElementById('moodboard-grid');
    this.btnAddItem = document.getElementById('btn-add-moodboard');
    this.modal = document.getElementById('modal-moodboard');
    this.form = document.getElementById('form-moodboard');
    this.btnCloseModal = document.getElementById('btn-close-moodboard-modal');
    this.btnCancelModal = document.getElementById('btn-cancel-moodboard-modal');
    this.inputTitle = document.getElementById('mb-title');
    this.inputUrl = document.getElementById('mb-url');
    this.inputNotes = document.getElementById('mb-notes');
    this.btnBrowseLocal = document.getElementById('btn-browse-image');
  }

  bindEvents() {
    if (this.btnAddItem) {
      this.btnAddItem.addEventListener('click', () => {
        this.form.reset();
        this.modal.classList.add('active');
      });
    }

    if (this.btnCloseModal) this.btnCloseModal.addEventListener('click', () => this.modal.classList.remove('active'));
    if (this.btnCancelModal) this.btnCancelModal.addEventListener('click', () => this.modal.classList.remove('active'));

    // Selecionar imagem local do PC pelo Electron
    if (this.btnBrowseLocal) {
      this.btnBrowseLocal.addEventListener('click', async () => {
        if (window.nativeAPI && window.nativeAPI.selectImage) {
          const res = await window.nativeAPI.selectImage();
          if (res.success && res.filePath) {
            this.inputUrl.value = res.filePath;
          }
        }
      });
    }

    if (this.form) {
      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSaveItem();
      });
    }

    window.appState.subscribe(() => {
      this.renderGrid();
    });
  }

  handleSaveItem() {
    const proj = window.appState.getActiveProject();
    if (!proj) return;

    const title = this.inputTitle.value.trim();
    let url = this.inputUrl.value.trim();
    const notes = this.inputNotes.value.trim();

    if (!url) {
      alert('Informe a URL da imagem ou selecione um arquivo local.');
      return;
    }

    // Se for caminho do Windows local, formata se necessário
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('file://')) {
      url = 'file:///' + url.replace(/\\/g, '/');
    }

    if (!proj.moodboard) proj.moodboard = [];

    proj.moodboard.push({
      id: 'mb-' + Date.now(),
      title: title || 'Inspiração Visual',
      url,
      notes
    });

    window.appState.updateActiveProject({ moodboard: proj.moodboard });
    this.modal.classList.remove('active');
    this.renderGrid();
  }

  renderGrid() {
    if (!this.grid) return;
    const proj = window.appState.getActiveProject();
    if (!proj || !proj.moodboard || proj.moodboard.length === 0) {
      this.grid.innerHTML = '<p class="empty-state">Nenhuma imagem no mural. Clique em "+ Adicionar Imagem" para montar a estética visual do seu mundo.</p>';
      return;
    }

    this.grid.innerHTML = proj.moodboard.map(item => `
      <div class="moodboard-item">
        <img class="moodboard-img" src="${item.url}" alt="${escapeHtml(item.title)}" onerror="this.src='https://via.placeholder.com/400x300?text=Imagem+Nao+Encontrada'">
        <div class="moodboard-caption">
          <strong>${escapeHtml(item.title)}</strong>
          ${item.notes ? `<p>${escapeHtml(item.notes)}</p>` : ''}
        </div>
      </div>
    `).join('');
  }
}

window.MoodboardModule = MoodboardModule;

