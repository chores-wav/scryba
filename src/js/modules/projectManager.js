/**
 * MÓDULO 1: GESTÃO DE PROJETOS E TELA INICIAL (SCRYBA)
 * Controla a tela inicial minimalista, lista interna de projetos e modal de criação.
 */

class ProjectManager {
  constructor() {
    this.libraryFilter = 'all'; // 'all', 'book', 'rpg'
    this.librarySearch = '';
    this.initElements();
    this.bindEvents();
  }

  initElements() {
    // Botões Principais da Tela Inicial (Scryba)
    this.btnHomeNewProject = document.getElementById('btn-home-new-project');
    this.btnHomeProjectsList = document.getElementById('btn-home-projects-list');
    this.recentsContainer = document.getElementById('scryba-recents-list');

    // Botão na Sidebar
    this.btnSidebarNewProject = document.getElementById('btn-open-new-project');

    // Modal Novo Projeto
    this.modalNewProject = document.getElementById('modal-new-project');
    this.btnCloseNewModal = document.getElementById('btn-close-project-modal');
    this.btnCancelNewModal = document.getElementById('btn-cancel-project-modal');
    this.formNewProject = document.getElementById('form-new-project');

    // Campos do formulário Novo Projeto
    this.inputName = document.getElementById('proj-name');
    this.inputFolder = document.getElementById('proj-folder');
    this.btnBrowseFolder = document.getElementById('btn-browse-folder');
    this.typeCards = document.querySelectorAll('.type-option-card');
    this.inputDescription = document.getElementById('proj-desc');
    this.selectedType = 'book';

    // Modal Lista de Projetos (Biblioteca Interna)
    this.modalProjectsList = document.getElementById('modal-projects-list');
    this.btnCloseProjectsModal = document.getElementById('btn-close-projects-modal');
    this.btnCancelProjectsModal = document.getElementById('btn-cancel-projects-modal');
    this.btnProjectsModalCreate = document.getElementById('btn-projects-modal-create');
    this.projectsSearchInput = document.getElementById('projects-search-input');
    this.projectFilterPills = document.querySelectorAll('.project-filter-pill');
    this.modalProjectsEntries = document.getElementById('modal-projects-entries');
  }

  bindEvents() {
    // Ação: + Novo Projeto (Tela Inicial e Sidebar)
    const handleOpenNewModal = () => this.openNewModal();
    if (this.btnHomeNewProject) this.btnHomeNewProject.addEventListener('click', handleOpenNewModal);
    if (this.btnSidebarNewProject) this.btnSidebarNewProject.addEventListener('click', handleOpenNewModal);

    // Ação: Abrir Modal "Lista de Projetos"
    if (this.btnHomeProjectsList) {
      this.btnHomeProjectsList.addEventListener('click', () => {
        this.openProjectsListModal();
      });
    }

    // Fechar Modal Novo Projeto
    if (this.btnCloseNewModal) this.btnCloseNewModal.addEventListener('click', () => this.closeNewModal());
    if (this.btnCancelNewModal) this.btnCancelNewModal.addEventListener('click', () => this.closeNewModal());

    // Fechar Modal Lista de Projetos
    if (this.btnCloseProjectsModal) this.btnCloseProjectsModal.addEventListener('click', () => this.closeProjectsListModal());
    if (this.btnCancelProjectsModal) this.btnCancelProjectsModal.addEventListener('click', () => this.closeProjectsListModal());

    // Botão "+ Novo Projeto" de dentro da Lista de Projetos
    if (this.btnProjectsModalCreate) {
      this.btnProjectsModalCreate.addEventListener('click', () => {
        this.closeProjectsListModal();
        this.openNewModal();
      });
    }

    // Busca na Lista de Projetos
    if (this.projectsSearchInput) {
      this.projectsSearchInput.addEventListener('input', (e) => {
        this.librarySearch = e.target.value.toLowerCase().trim();
        this.renderProjectsListModal();
      });
    }

    // Filtros por Categoria (Todos / Livros / RPG)
    this.projectFilterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        this.projectFilterPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.libraryFilter = pill.dataset.filter;
        this.renderProjectsListModal();
      });
    });

    // Seleção de Pasta Nativa do Windows via Electron
    if (this.btnBrowseFolder) {
      this.btnBrowseFolder.addEventListener('click', async () => {
        if (window.nativeAPI && window.nativeAPI.selectDirectory) {
          const res = await window.nativeAPI.selectDirectory();
          if (res.success && res.path) {
            this.inputFolder.value = res.path;
          }
        } else {
          alert('Seleção nativa de pasta disponível quando rodando no Electron.');
        }
      });
    }

    // Seleção visual do tipo de projeto (Livro vs RPG)
    this.typeCards.forEach(card => {
      card.addEventListener('click', () => {
        this.typeCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedType = card.dataset.type;
      });
    });

    // Submissão do Formulário de Criação
    if (this.formNewProject) {
      this.formNewProject.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleCreateProject();
      });
    }

    // Atualização reativa de listas
    window.appState.subscribe(() => {
      this.renderRecentProjects();
      this.renderProjectsListModal();
    });
  }

  // --- MODAL NOVO PROJETO ---
  openNewModal(prefilledFolder = '') {
    if (this.formNewProject) this.formNewProject.reset();
    if (prefilledFolder) this.inputFolder.value = prefilledFolder;
    this.selectedType = 'book';
    this.typeCards.forEach(c => {
      c.classList.toggle('selected', c.dataset.type === 'book');
    });
    this.modalNewProject.classList.add('active');
    setTimeout(() => this.inputName.focus(), 100);
  }

  closeNewModal() {
    this.modalNewProject.classList.remove('active');
  }

  handleCreateProject() {
    const title = this.inputName.value.trim();
    const folderPath = this.inputFolder.value.trim();
    const description = this.inputDescription.value.trim();

    if (!title) {
      alert('Por favor, informe o nome do projeto.');
      return;
    }

    const newProj = window.appState.createProject({
      title,
      folderPath,
      type: this.selectedType,
      description
    });

    this.closeNewModal();

    if (newProj.type === 'book') {
      window.appRouter.navigate('planner');
    } else {
      window.appRouter.navigate('editor');
    }
  }

  // --- MODAL LISTA DE PROJETOS ---
  openProjectsListModal() {
    this.modalProjectsList.classList.add('active');
    if (this.projectsSearchInput) {
      this.projectsSearchInput.value = '';
      this.librarySearch = '';
    }
    this.renderProjectsListModal();
  }

  closeProjectsListModal() {
    this.modalProjectsList.classList.remove('active');
  }

  renderProjectsListModal() {
    if (!this.modalProjectsEntries) return;

    let projects = window.appState.getProjects(this.libraryFilter);

    // Filtra pelo campo de pesquisa
    if (this.librarySearch) {
      projects = projects.filter(p => 
        p.title.toLowerCase().includes(this.librarySearch) ||
        (p.description && p.description.toLowerCase().includes(this.librarySearch))
      );
    }

    if (projects.length === 0) {
      this.modalProjectsEntries.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
          <div style="font-size: 2.2rem; margin-bottom: 8px;">📂</div>
          <p style="font-size: 0.95rem; font-weight: 500;">Nenhum projeto encontrado</p>
          <span style="font-size: 0.8rem; color: var(--text-faint);">Tente outro termo de busca ou crie um novo projeto.</span>
        </div>
      `;
      return;
    }

    this.modalProjectsEntries.innerHTML = projects.map(proj => {
      const isBook = proj.type === 'book';
      const icon = isBook ? '📜' : '🎲';
      const badgeClass = isBook ? 'badge-book' : 'badge-rpg';
      const badgeText = isBook ? 'LIVRO' : 'RPG';
      const chapterCount = proj.chapters ? proj.chapters.length : 0;
      const charCount = proj.characters ? proj.characters.length : 0;

      return `
        <div class="project-list-entry" data-id="${proj.id}">
          <div class="project-list-entry-header">
            <div class="project-list-entry-left">
              <div class="project-list-entry-icon">${icon}</div>
              <div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span class="project-list-entry-title">${escapeHtml(proj.title)}</span>
                  <span class="badge ${badgeClass}">${badgeText}</span>
                </div>
                <div style="font-size: 0.73rem; color: var(--text-faint); margin-top: 2px;">
                  Atualizado em ${new Date(proj.updatedAt || proj.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
            <button class="btn-icon btn-delete-proj" data-id="${proj.id}" title="Excluir projeto" style="color: var(--text-faint);">
              🗑️
            </button>
          </div>

          <p class="project-list-entry-desc">${escapeHtml(proj.description || 'Sem descrição cadastrada.')}</p>

          <div class="project-list-entry-footer">
            <div style="display: flex; gap: 14px;">
              <span>📝 ${chapterCount} ${isBook ? 'Capítulos' : 'Anotações'}</span>
              <span>👤 ${charCount} Personagens</span>
            </div>
            <button class="btn btn-secondary btn-open-project" data-id="${proj.id}" style="padding: 5px 12px; font-size: 0.82rem;">
              Abrir Projeto ➔
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Eventos dos botões de abrir
    this.modalProjectsEntries.querySelectorAll('.btn-open-project').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const projId = btn.dataset.id;
        this.openProjectById(projId);
      });
    });

    // Clique direto no card também abre
    this.modalProjectsEntries.querySelectorAll('.project-list-entry').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-delete-proj')) return;
        const projId = card.dataset.id;
        this.openProjectById(projId);
      });
    });

    // Eventos de exclusão
    this.modalProjectsEntries.querySelectorAll('.btn-delete-proj').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const projId = btn.dataset.id;
        const proj = window.appState.projects.find(p => p.id === projId);
        const name = proj ? proj.title : 'este projeto';
        if (confirm(`Tem certeza que deseja excluir "${name}"? Esta ação não pode ser desfeita.`)) {
          window.appState.deleteProject(projId);
        }
      });
    });
  }

  openProjectById(projId) {
    window.appState.setActiveProject(projId);
    this.closeProjectsListModal();
    window.appRouter.navigate('editor');
  }

  // --- PROJETOS RECENTES NO DASHBOARD ---
  renderRecentProjects() {
    if (!this.recentsContainer) return;
    const projects = window.appState.getProjects('all').slice(0, 3);

    if (projects.length === 0) {
      this.recentsContainer.innerHTML = `
        <div style="color: var(--text-faint); font-size: 0.82rem; padding: 12px;">
          Nenhum projeto recente. Crie um novo para começar.
        </div>
      `;
      return;
    }

    this.recentsContainer.innerHTML = projects.map(proj => {
      const isBook = proj.type === 'book';
      const icon = isBook ? '📜' : '🎲';
      const badgeClass = isBook ? 'badge-book' : 'badge-rpg';
      const badgeText = isBook ? 'LIVRO' : 'RPG';

      return `
        <div class="scryba-recent-card" data-id="${proj.id}" title="Abrir ${escapeHtml(proj.title)}">
          <div class="scryba-recent-info">
            <div class="scryba-recent-icon">${icon}</div>
            <span class="scryba-recent-title">${escapeHtml(proj.title)}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="scryba-recent-badge ${badgeClass}">${badgeText}</span>
            <span class="scryba-recent-arrow">➔</span>
          </div>
        </div>
      `;
    }).join('');

    this.recentsContainer.querySelectorAll('.scryba-recent-card').forEach(card => {
      card.addEventListener('click', () => {
        const projId = card.dataset.id;
        this.openProjectById(projId);
      });
    });
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

window.ProjectManager = ProjectManager;
