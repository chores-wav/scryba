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
    this.settingsModal = document.getElementById('modal-settings');
    this.settingsTheme = document.getElementById('settings-app-theme');
    this.settingsFont = document.getElementById('settings-editor-font');
    this.settingsCollapse = document.getElementById('settings-collapse-sidebar');
    this.storageOverlay = document.getElementById('storage-setup-overlay');
    this.storageSetupButton = document.getElementById('btn-select-initial-storage');
    this.storageSetupStatus = document.getElementById('storage-setup-status');
    this.storagePathLabel = document.getElementById('settings-storage-path');
    this.storageSettingsStatus = document.getElementById('settings-storage-status');
    this.changeStorageButton = document.getElementById('btn-change-storage-location');
    this.appStarted = false;

    this.navItems = document.querySelectorAll('.nav-item');
    this.viewSections = document.querySelectorAll('.view-section');

    this.bindNavigation();
    this.bindSettings();
    this.bindKeyboardShortcuts();
  }

  bindKeyboardShortcuts() {
    document.addEventListener('keydown', async event => {
      if (!(event.ctrlKey || event.metaKey) || event.shiftKey || event.altKey || event.key.toLowerCase() !== 's') return;
      event.preventDefault();

      let result;
      if (this.currentView === 'editor' && window.editorModule) {
        clearTimeout(window.editorModule.saveTimeout);
        result = await window.editorModule.saveCurrentChapterDirectly();
      }
      if (!result) result = await window.appState.saveActiveProject();
      if (result && !result.success) console.error('Falha ao salvar pelo atalho:', result.error);
    });
  }

  bindNavigation() {
    // Recolher / Expandir Sidebar no Workspace
    if (this.btnToggleSidebar) {
      this.btnToggleSidebar.addEventListener('click', () => {
        this.sidebar.classList.toggle('collapsed');
        const collapsed = this.sidebar.classList.contains('collapsed');
        localStorage.setItem('scryba_collapse_sidebar', String(collapsed));
        if (this.settingsCollapse) this.settingsCollapse.checked = collapsed;
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

  bindSettings() {
    const openButtons = [
      document.getElementById('btn-open-settings'),
      document.getElementById('btn-home-settings')
    ];
    const closeButton = document.getElementById('btn-close-settings');
    const resetButton = document.getElementById('btn-reset-settings');
    const openAboutButton = document.getElementById('btn-open-about');
    const backAboutButton = document.getElementById('btn-back-about');
    const openTutorialButton = document.getElementById('btn-open-tutorial');
    const backTutorialButton = document.getElementById('btn-back-tutorial');
    const settingsMainContent = document.getElementById('settings-main-content');
    const settingsAboutView = document.getElementById('settings-about-view');
    const settingsTutorialView = document.getElementById('settings-tutorial-view');
    const availableThemes = ['dark', 'light', 'cyberpunk', 'medieval', 'witchcraft', 'vampire', 'steampunk'];
    const storedTheme = localStorage.getItem('scryba_app_theme') || 'dark';
    const savedTheme = availableThemes.includes(storedTheme) ? storedTheme : 'dark';
    const savedFont = localStorage.getItem('scryba_editor_font') || 'lora';
    const collapseSidebar = localStorage.getItem('scryba_collapse_sidebar') === 'true';

    this.storageSetupButton?.addEventListener('click', () => this.chooseStorageLocation(true));
    this.changeStorageButton?.addEventListener('click', () => this.chooseStorageLocation(false));

    document.documentElement.dataset.appTheme = savedTheme;
    if (this.settingsTheme) this.settingsTheme.value = savedTheme;
    if (this.settingsFont) this.settingsFont.value = savedFont;
    if (this.settingsCollapse) this.settingsCollapse.checked = collapseSidebar;
    if (collapseSidebar) this.sidebar?.classList.add('collapsed');

    const openSettings = () => {
      if (!this.settingsModal) return;
      this.settingsModal.classList.remove('is-showing-tutorial');
      if (settingsMainContent) settingsMainContent.hidden = false;
      if (settingsAboutView) settingsAboutView.hidden = true;
      if (settingsTutorialView) settingsTutorialView.hidden = true;
      this.settingsModal.classList.add('active');
      this.settingsModal.setAttribute('aria-hidden', 'false');
      this.settingsTheme?.focus();
    };
    openButtons.forEach(button => button?.addEventListener('click', openSettings));
    openAboutButton?.addEventListener('click', () => {
      this.settingsModal?.classList.remove('is-showing-tutorial');
      if (settingsMainContent) settingsMainContent.hidden = true;
      if (settingsAboutView) settingsAboutView.hidden = false;
      if (settingsTutorialView) settingsTutorialView.hidden = true;
      backAboutButton?.focus();
    });
    backAboutButton?.addEventListener('click', () => {
      this.settingsModal?.classList.remove('is-showing-tutorial');
      if (settingsAboutView) settingsAboutView.hidden = true;
      if (settingsMainContent) settingsMainContent.hidden = false;
      openAboutButton?.focus();
    });
    openTutorialButton?.addEventListener('click', () => {
      this.settingsModal?.classList.add('is-showing-tutorial');
      if (settingsMainContent) settingsMainContent.hidden = true;
      if (settingsAboutView) settingsAboutView.hidden = true;
      if (settingsTutorialView) settingsTutorialView.hidden = false;
      settingsTutorialView?.querySelector('summary')?.focus();
    });
    backTutorialButton?.addEventListener('click', () => {
      this.settingsModal?.classList.remove('is-showing-tutorial');
      if (settingsTutorialView) settingsTutorialView.hidden = true;
      if (settingsMainContent) settingsMainContent.hidden = false;
      openTutorialButton?.focus();
    });
    settingsTutorialView?.querySelectorAll('[data-tutorial-action]').forEach(button => {
      button.addEventListener('click', () => {
        const expand = button.dataset.tutorialAction === 'expand';
        settingsTutorialView.querySelectorAll('details').forEach(section => { section.open = expand; });
      });
    });
    const closeSettings = () => {
      this.settingsModal?.classList.remove('is-showing-tutorial');
      this.settingsModal?.classList.remove('active');
      this.settingsModal?.setAttribute('aria-hidden', 'true');
      if (settingsAboutView) settingsAboutView.hidden = true;
      if (settingsTutorialView) settingsTutorialView.hidden = true;
      if (settingsMainContent) settingsMainContent.hidden = false;
    };
    closeButton?.addEventListener('click', closeSettings);
    this.settingsModal?.addEventListener('click', event => {
      if (event.target === this.settingsModal) closeSettings();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && this.settingsModal?.classList.contains('active')) closeSettings();
    });

    this.settingsTheme?.addEventListener('change', () => {
      const theme = availableThemes.includes(this.settingsTheme.value) ? this.settingsTheme.value : 'dark';
      document.documentElement.dataset.appTheme = theme;
      localStorage.setItem('scryba_app_theme', theme);
    });
    this.settingsFont?.addEventListener('change', () => {
      localStorage.setItem('scryba_editor_font', this.settingsFont.value);
      window.editorModule?.applyFont(this.settingsFont.value);
    });
    this.settingsCollapse?.addEventListener('change', () => {
      const collapsed = this.settingsCollapse.checked;
      this.sidebar?.classList.toggle('collapsed', collapsed);
      localStorage.setItem('scryba_collapse_sidebar', String(collapsed));
    });
    resetButton?.addEventListener('click', () => {
      localStorage.removeItem('scryba_app_theme');
      localStorage.removeItem('scryba_editor_font');
      localStorage.removeItem('scryba_collapse_sidebar');
      document.documentElement.dataset.appTheme = 'dark';
      if (this.settingsTheme) this.settingsTheme.value = 'dark';
      if (this.settingsFont) this.settingsFont.value = 'lora';
      if (this.settingsCollapse) this.settingsCollapse.checked = false;
      this.sidebar?.classList.remove('collapsed');
      window.editorModule?.applyFont('lora');
    });
  }

  getManagedProjectFolder(storagePath, project) {
    return managedProjectFolder(storagePath, project.title, project.id, window.appState?.projects || []);
  }

  async chooseStorageLocation(isInitialSetup) {
    const button = isInitialSetup ? this.storageSetupButton : this.changeStorageButton;
    const status = isInitialSetup ? this.storageSetupStatus : this.storageSettingsStatus;
    if (!window.nativeAPI?.selectStorageLocation) {
      if (status) status.textContent = 'A escolha de pasta está disponível na versão desktop do Scryba.';
      else alert('A escolha de pasta está disponível na versão desktop do Scryba.');
      return;
    }
    if (button) button.disabled = true;
    if (status) status.textContent = 'Escolha uma pasta gravável no computador…';
    try {
      const selection = await window.nativeAPI.selectStorageLocation();
      if (!selection?.success || !selection.path) {
        if (status && !selection?.canceled) status.textContent = selection?.error || 'Não foi possível validar essa pasta. Escolha outra.';
        return;
      }
      if (isInitialSetup) await this.restoreProjectsFromStorage(selection.path);
      const applied = await this.applyStorageLocation(selection.path, status);
      if (applied) {
        if (this.storagePathLabel) this.storagePathLabel.textContent = selection.path;
        this.storageOverlay.hidden = true;
        this.appRoot?.removeAttribute('inert');
        this.finishStartup();
      }
    } catch (error) {
      const message = 'Falha ao configurar o armazenamento: ' + error.message;
      if (status) status.textContent = message;
      else alert(message);
    } finally {
      if (button) button.disabled = false;
      if (status && status.textContent === 'Escolha uma pasta gravável no computador…') {
        status.textContent = isInitialSetup ? 'Selecione uma pasta para continuar.' : '';
      }
    }
  }

  async applyStorageLocation(storagePath, status = this.storageSetupStatus) {
    const projects = window.appState?.projects || [];
    const previousPaths = projects.map(project => project.folderPath || '');
    try {
      for (let index = 0; index < projects.length; index += 1) {
        const project = projects[index];
        const oldFolderPath = project.folderPath;
        project.folderPath = this.getManagedProjectFolder(storagePath, project);
        if (status) status.textContent = `Salvando projeto ${index + 1} de ${projects.length}…`;
        const saved = window.nativeAPI.renameProjectFolder
          ? await window.nativeAPI.renameProjectFolder({ storagePath, oldFolderPath, projectData: project })
          : await window.nativeAPI.saveProject({ folderPath: project.folderPath, projectData: project });
        if (!saved?.success) throw new Error(saved?.error || `Não foi possível salvar “${project.title}”.`);
        if (saved.folderPath) project.folderPath = saved.folderPath;
      }
      const entries = projects.map(project => ({ id: project.id, title: project.title, type: project.type, folderPath: project.folderPath }));
      const indexSaved = await window.nativeAPI.saveStorageIndex(storagePath, entries);
      if (!indexSaved?.success) throw new Error(indexSaved?.error || 'Não foi possível criar o índice de projetos.');
      const configured = await window.nativeAPI.setStorageLocation(storagePath);
      if (!configured?.success) throw new Error(configured?.error || 'Não foi possível definir a pasta padrão.');
      window.appStorageLocation = storagePath;
      window.appState?.saveProjectsList();
      if (status) status.textContent = '';
      return true;
    } catch (error) {
      projects.forEach((project, index) => { project.folderPath = previousPaths[index]; });
      if (status) status.textContent = 'Não foi possível concluir a configuração. ' + error.message;
      else alert('Não foi possível trocar a pasta de armazenamento. ' + error.message);
      return false;
    }
  }

  async initializeStorage() {
    if (!window.nativeAPI?.getStorageLocation) {
      if (this.storageSetupStatus) this.storageSetupStatus.textContent = 'O armazenamento obrigatório exige a versão desktop do Scryba.';
      return false;
    }
    try {
      const configured = await window.nativeAPI.getStorageLocation();
      if (configured?.path) {
        window.appStorageLocation = configured.path;
        if (this.storagePathLabel) this.storagePathLabel.textContent = configured.path;
        await this.restoreProjectsFromStorage(configured.path);
        this.storageOverlay.hidden = true;
        this.appRoot?.removeAttribute('inert');
        this.finishStartup();
        return true;
      }
      if (this.storageSetupStatus && configured?.error) this.storageSetupStatus.textContent = configured.error + ' Escolha uma nova pasta para continuar.';
    } catch (error) {
      if (this.storageSetupStatus) this.storageSetupStatus.textContent = 'Não foi possível verificar a pasta de armazenamento. ' + error.message;
    }
    this.storageOverlay.hidden = false;
    return false;
  }

  async restoreProjectsFromStorage(storagePath) {
    const localProjects = window.appState?.projects || [];
    const localById = new Map(localProjects.map(project => [project.id, project]));
    const indexResult = await window.nativeAPI.loadStorageIndex(storagePath);
    const entries = indexResult?.success && Array.isArray(indexResult.projects) ? indexResult.projects : [];
    const restored = [];
    const restoredIds = new Set();
    for (const entry of entries) {
      if (!entry?.folderPath) continue;
      const resolvedFolderPath = entry.folderPath.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(entry.folderPath) || entry.folderPath.startsWith('\\\\')
        ? entry.folderPath
        : `${String(storagePath).replace(/[\\/]+$/, '')}/${entry.folderPath}`;
      const result = await window.nativeAPI.loadProject(resolvedFolderPath);
      if (result?.success && result.data?.id) {
        const project = result.data;
        project.folderPath = this.getManagedProjectFolder(storagePath, project);
        const saved = window.nativeAPI.renameProjectFolder
          ? await window.nativeAPI.renameProjectFolder({ storagePath, oldFolderPath: resolvedFolderPath, projectData: project })
          : await window.nativeAPI.saveProject({ folderPath: project.folderPath, projectData: project });
        if (saved?.success) {
          if (saved.folderPath) project.folderPath = saved.folderPath;
          restored.push(project);
          restoredIds.add(project.id);
        } else {
          console.error(`Não foi possível copiar o projeto "${project.title}" para o armazenamento selecionado:`, saved?.error);
        }
      } else if (localById.has(entry.id)) {
        const fallback = { ...localById.get(entry.id) };
        fallback.folderPath = this.getManagedProjectFolder(storagePath, fallback);
        const saved = await window.nativeAPI.saveProject({ folderPath: fallback.folderPath, projectData: fallback });
        if (saved?.success) {
          restored.push(fallback);
          restoredIds.add(fallback.id);
        }
      }
    }

    // Mescla projetos que ainda estão na lista local (incluindo os exemplos) com
    // os encontrados no armazenamento. Cada projeto ausente é copiado para a
    // pasta escolhida, mesmo quando o arquivo original está em outro caminho.
    for (const localProject of localProjects) {
      if (restoredIds.has(localProject.id)) continue;
      let project = { ...localProject };
      let sourceFolderPath = localProject.folderPath;
      if (localProject.folderPath) {
        const result = await window.nativeAPI.loadProject(localProject.folderPath);
        if (result?.success && result.data?.id === localProject.id) {
          project = result.data;
          sourceFolderPath = localProject.folderPath;
        } else {
          sourceFolderPath = '';
        }
      }
      project.folderPath = this.getManagedProjectFolder(storagePath, project);
      const saved = sourceFolderPath && window.nativeAPI.renameProjectFolder
        ? await window.nativeAPI.renameProjectFolder({ storagePath, oldFolderPath: sourceFolderPath, projectData: project })
        : await window.nativeAPI.saveProject({ folderPath: project.folderPath, projectData: project });
      if (saved?.success) {
        if (saved.folderPath) project.folderPath = saved.folderPath;
        restored.push(project);
        restoredIds.add(project.id);
      } else {
        console.error(`Não foi possível copiar o projeto "${project.title}" para o armazenamento selecionado:`, saved?.error);
      }
    }

    await window.appState.restoreProjectsFromDisk(restored);
    if (indexResult?.success === false) console.error('Não foi possível ler o índice de projetos:', indexResult.error);
  }

  finishStartup() {
    if (this.appStarted) return;
    this.appStarted = true;
    this.navigate('dashboard');
    window.appState.notify();
  }

  navigate(viewId) {
    if (viewId === 'audio' && window.appState.getActiveProject()?.type !== 'rpg') viewId = 'editor';
    this.currentView = viewId;

    // Alternância de modo: Tela Inicial (Home) vs Espaço de Trabalho (Workspace)
    if (viewId === 'dashboard') {
      this.appRoot.classList.add('in-home');
      this.appRoot.classList.remove('in-workspace');
    } else {
      this.appRoot.classList.remove('in-home');
      this.appRoot.classList.add('in-workspace');
    }
    window.diceRoller?.updateVisibility();
    window.audioPad?.updateVisibility();

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
      audio: 'Pad de Áudio',
      canvas: 'Mapa Mental',
      'family-tree': 'Árvore Genealógica',
      timeline: 'Linha do Tempo'
    };

    if (this.headerTitle) {
      this.headerTitle.textContent = titles[viewId] || 'Scryba';
    }

    // Trigger render específico se necessário
    if (viewId === 'canvas' && window.diagramModule) {
      setTimeout(() => window.diagramModule.render(), 50);
    }
    if (viewId === 'moodboard' && window.moodboardModule) {
      setTimeout(() => window.moodboardModule.renderGrid(), 50);
    }
    if (viewId === 'audio' && window.audioPad) {
      setTimeout(() => window.audioPad.render(), 50);
    }
    if (viewId === 'family-tree' && window.familyTreeModule) {
      setTimeout(() => window.familyTreeModule.render(), 50);
    }
    if (viewId === 'timeline' && window.timelineModule) {
      setTimeout(() => window.timelineModule.render(), 50);
    }
  }

  updateProjectHeader() {
    const proj = window.appState.getActiveProject();
    if (!proj) return;

    const isBook = proj.type === 'book';
    const audioNavItem = document.querySelector('.nav-item[data-view="audio"]');
    if (audioNavItem) audioNavItem.hidden = proj.type !== 'rpg';
    if (proj.type !== 'rpg' && this.currentView === 'audio') this.navigate('editor');
    const badgeHtml = isBook
      ? `<span class="badge badge-book">${iconSvg('book')} Livro</span>`
      : `<span class="badge badge-rpg">${iconSvg('dice')} RPG</span>`;

    if (this.sidebarProjTitle) this.sidebarProjTitle.textContent = proj.title;
    if (this.sidebarProjBadge) this.sidebarProjBadge.innerHTML = badgeHtml;
    if (this.headerBadge) this.headerBadge.innerHTML = badgeHtml;
  }
}

// Inicialização da Aplicação após carregamento do DOM
document.addEventListener('DOMContentLoaded', async () => {
  const launchScreen = document.getElementById('app-launch-screen');
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const launchDuration = prefersReducedMotion ? 60 : 1480;
  window.setTimeout(() => {
    launchScreen?.classList.add('is-leaving');
    launchScreen?.setAttribute('aria-hidden', 'true');
    window.setTimeout(() => launchScreen?.remove(), prefersReducedMotion ? 80 : 560);
  }, launchDuration);

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
  window.familyTreeModule = new window.FamilyTreeModule();
  window.timelineModule = new window.TimelineModule();
  window.diceRoller = new window.DiceRollerModule();
  window.audioPad = new window.AudioPadModule();

  // Carrega e atualiza a versão atual na interface
  if (window.nativeAPI && window.nativeAPI.getAppVersion) {
    window.nativeAPI.getAppVersion().then(version => {
      if (version) {
        document.querySelectorAll('.app-version-tag').forEach(el => {
          el.textContent = `v${version}`;
        });
        const aboutVersion = document.getElementById('settings-about-version');
        if (aboutVersion) aboutVersion.textContent = `v${version}`;
      }
    });
  }

  // A interface permanece bloqueada até confirmar o armazenamento obrigatório.
  await window.appRouter.initializeStorage();
});
