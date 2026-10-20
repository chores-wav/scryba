/**
 * APP.JS - CONTROLADOR MESTRE E ROTEADOR DE INTERFACE DO SCRYBA
 */

class AppRouter {
  constructor() {
    this.currentView = 'dashboard';
    this.appRoot = document.querySelector('.app-root');
    this.sidebar = document.getElementById('sidebar');
    this.btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
    this.brandHome = document.getElementById('brand-home');
    this.headerTitle = document.getElementById('header-view-title');
    this.headerBadge = document.getElementById('header-project-badge');
    this.sidebarProjTitle = document.getElementById('sidebar-active-project-title');
    this.sidebarProjBadge = document.getElementById('sidebar-active-project-badge');

    this.navItems = document.querySelectorAll('.nav-item');
    this.viewSections = document.querySelectorAll('.view-section');

    this.bindNavigation();
  }

  bindNavigation() {
    // Recolher / Expandir Sidebar no Workspace
    if (this.btnToggleSidebar) {
      this.btnToggleSidebar.addEventListener('click', () => {
        this.sidebar.classList.toggle('collapsed');
      });
    }

    // Clique na Logo na Sidebar retorna para a Tela Inicial (Dashboard)
    if (this.brandHome) {
      this.brandHome.addEventListener('click', () => {
        this.navigate('dashboard');
      });
    }

    // Itens de Navegação na Sidebar
    this.navItems.forEach(item => {
      item.addEventListener('click', () => {
        const targetView = item.dataset.view;
        if (targetView) this.navigate(targetView);
      });
    });

    // Inscrição no estado para atualizar título e badges
    window.appState.subscribe(() => {
      this.updateProjectHeader();
    });
  }

  navigate(viewId) {
    this.currentView = viewId;

    // Alternância de modo: Tela Inicial (Home) vs Espaço de Trabalho (Workspace)
    if (viewId === 'dashboard') {
      this.appRoot.classList.add('in-home');
      this.appRoot.classList.remove('in-workspace');
    } else {
      this.appRoot.classList.remove('in-home');
      this.appRoot.classList.add('in-workspace');
    }

    // Atualiza classes ativas na Sidebar
    this.navItems.forEach(item => {
      item.classList.toggle('active', item.dataset.view === viewId);
    });

    // Alterna a View visível
    this.viewSections.forEach(section => {
      section.classList.toggle('active', section.id === `view-${viewId}`);
    });

    // Atualiza cabeçalho do Workspace
    const titles = {
      dashboard: 'Início',
      editor: 'Editor de Escrita & Capítulos',
      notes: 'Anotações Rápidas & Ideias',
      planner: 'Planejador de Metas & Atos',
      characters: 'Galeria de Personagens',
      world: 'Worldbuilding & Magias',
      moodboard: 'Mural Visual de Estética',
      canvas: 'Grafo de Conexões e Relacionamentos'
    };

    if (this.headerTitle) {
      this.headerTitle.textContent = titles[viewId] || 'Scryba';
    }

    // Trigger render específico se necessário
    if (viewId === 'canvas' && window.diagramModule) {
      setTimeout(() => window.diagramModule.render(), 50);
    }
  }

  updateProjectHeader() {
    const proj = window.appState.getActiveProject();
    if (!proj) return;

    const isBook = proj.type === 'book';
    const badgeHtml = isBook
      ? '<span class="badge badge-book">📖 Livro</span>'
      : '<span class="badge badge-rpg">🎲 RPG</span>';

    if (this.sidebarProjTitle) this.sidebarProjTitle.textContent = proj.title;
    if (this.sidebarProjBadge) this.sidebarProjBadge.innerHTML = badgeHtml;
    if (this.headerBadge) this.headerBadge.innerHTML = badgeHtml;
  }
}

// Inicialização da Aplicação após carregamento do DOM
document.addEventListener('DOMContentLoaded', () => {
  window.appRouter = new AppRouter();

  // Inicializa os módulos organizados
  window.projectManager = new window.ProjectManager();
  window.editorModule = new window.EditorModule();
  window.notesModule = new window.NotesModule();
  window.charactersModule = new window.CharactersModule();
  window.worldbuildingModule = new window.WorldbuildingModule();
  window.moodboardModule = new window.MoodboardModule();
  window.diagramModule = new window.DiagramModule();
  window.plannerModule = new window.PlannerModule();

  // Começa por padrão na Tela Inicial minimalista
  window.appRouter.navigate('dashboard');
  window.appState.notify();
});
