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

    this.modalEditProject = document.getElementById('modal-edit-project');
    this.formEditProject = document.getElementById('form-edit-project');
    this.inputEditProjectName = document.getElementById('edit-project-name');
    this.inputEditProjectDescription = document.getElementById('edit-project-description');
    this.btnCloseEditProject = document.getElementById('btn-close-edit-project');
    this.btnCancelEditProject = document.getElementById('btn-cancel-edit-project');
    this.editingProjectId = null;
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
    this.btnCloseEditProject?.addEventListener('click', () => this.closeEditProjectModal());
    this.btnCancelEditProject?.addEventListener('click', () => this.closeEditProjectModal());
    this.modalEditProject?.addEventListener('click', event => {
      if (event.target === this.modalEditProject) this.closeEditProjectModal();
    });
    this.formEditProject?.addEventListener('submit', event => {
      event.preventDefault();
      this.handleEditProject();
    });

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
  openNewModal() {
    if (this.formNewProject) this.formNewProject.reset();
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
    const description = this.inputDescription.value.trim();

    if (!title) {
      alert('Por favor, informe o nome do projeto.');
      return;
    }
    if (window.appState.projects.some(project => project.title.toLocaleLowerCase() === title.toLocaleLowerCase())) {
      alert('Já existe um projeto com esse nome. Escolha outro para manter a pasta de cada projeto identificável.');
      return;
    }

    const newProj = window.appState.createProject({
      title,
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
          <div style="font-size: 2.2rem; margin-bottom: 8px;">${iconSvg('library')}</div>
          <p style="font-size: 0.95rem; font-weight: 500;">Nenhum projeto encontrado</p>
          <span style="font-size: 0.8rem; color: var(--text-faint);">Tente outro termo de busca ou crie um novo projeto.</span>
        </div>
      `;
      return;
    }

    this.modalProjectsEntries.innerHTML = projects.map(proj => {
      const isBook = proj.type === 'book';
      const icon = iconSvg(isBook ? 'book' : 'dice');
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
            <button type="button" class="btn-icon btn-delete-proj" data-id="${proj.id}" title="Excluir projeto" aria-label="Excluir ${escapeHtml(proj.title)}" style="color: var(--text-faint);">
              ${iconSvg('trash')}
            </button>
            <button type="button" class="btn-icon btn-edit-proj" data-id="${proj.id}" title="Editar projeto" aria-label="Editar ${escapeHtml(proj.title)}">${iconSvg('edit')}</button>
          </div>

          <p class="project-list-entry-desc">${escapeHtml(proj.description || 'Sem descrição cadastrada.')}</p>

          <div class="project-list-entry-footer">
            <div style="display: flex; gap: 14px;">
              <span>${iconSvg(isBook ? 'book' : 'note')} ${chapterCount} ${isBook ? 'Capítulos' : 'Anotações'}</span>
              <span>${iconSvg('users')} ${charCount} Personagens</span>
            </div>
            <button class="btn btn-secondary btn-open-project" data-id="${proj.id}" style="padding: 5px 12px; font-size: 0.82rem;">
              Abrir Projeto ${iconSvg('arrow-right')}
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

    this.modalProjectsEntries.querySelectorAll('.btn-edit-proj').forEach(btn => {
      btn.addEventListener('click', event => {
        event.stopPropagation();
        this.openEditProjectModal(btn.dataset.id);
      });
    });

    // Clique direto no card também abre
    this.modalProjectsEntries.querySelectorAll('.project-list-entry').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-delete-proj, .btn-edit-proj')) return;
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

  openEditProjectModal(projectId) {
    const project = window.appState.projects.find(item => item.id === projectId);
    if (!project || !this.modalEditProject) return;
    this.editingProjectId = projectId;
    this.inputEditProjectName.value = project.title || '';
    this.inputEditProjectDescription.value = project.description || '';
    this.modalEditProject.classList.add('active');
    setTimeout(() => this.inputEditProjectName.focus(), 50);
  }

  closeEditProjectModal() {
    this.modalEditProject?.classList.remove('active');
    this.editingProjectId = null;
  }

  async handleEditProject() {
    if (!this.editingProjectId) return;
    const result = await window.appState.updateProjectDetails(this.editingProjectId, {
      title: this.inputEditProjectName.value,
      description: this.inputEditProjectDescription.value
    });
    if (!result.success) {
      alert(result.error);
      return;
    }
    this.closeEditProjectModal();
  }

  openProjectById(projId) {
    window.appState.setActiveProject(projId);
    this.closeProjectsListModal();
    window.appRouter.navigate('editor');
  }

  // --- PROJETOS RECENTES NO DASHBOARD ---
  renderRecentProjects() {
    if (!this.recentsContainer) return;
    const projects = window.appState.getProjects('all');

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
      const icon = iconSvg(isBook ? 'book' : 'dice');
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
            <span class="scryba-recent-arrow">${iconSvg('arrow-right')}</span>
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
