/**
 * MÓDULO 6: PLANEJADOR DE PROJETOS (FOCADO EM LIVROS)
 */

class PlannerModule {
  constructor() {
    this.editingActId = null;
    this.editingPlannedChapterId = null;
    this.initElements();
    this.bindEvents();
  }

  initElements() {
    // Metas
    this.goalWordsEl = document.getElementById('planner-goal-words');
    this.remainingWordsEl = document.getElementById('planner-remaining-words');
    this.currentWordsEl = document.getElementById('planner-current-words');
    this.progressFillEl = document.getElementById('planner-progress-fill');
    this.progressTrackEl = this.progressFillEl?.parentElement;
    this.progressPercentEl = document.getElementById('planner-progress-percent');
    this.chapterCountEl = document.getElementById('planner-chapter-count');
    this.chapterCountLabelEl = document.getElementById('planner-count-label');
    this.progressTitleEl = document.getElementById('planner-progress-title');
    this.goalScopeNoteEl = document.getElementById('planner-goal-scope-note');
    this.wordGoalPanel = document.getElementById('planner-word-goal-panel');
    this.wordGoalAction = document.getElementById('planner-word-goal-action');
    this.goalsBanner = document.getElementById('planner-goals-banner');
    this.btnEditGoal = document.getElementById('btn-edit-word-goal');
    this.goalModal = document.getElementById('modal-planner-goal');
    this.goalForm = document.getElementById('form-planner-goal');
    this.goalInput = document.getElementById('planner-goal-input');

    // Temas
    this.genresContainer = document.getElementById('planner-genres-container');
    this.btnAddGenre = document.getElementById('btn-add-genre');
    this.genreModal = document.getElementById('modal-planner-genre');
    this.genreForm = document.getElementById('form-planner-genre');
    this.genreInput = document.getElementById('planner-genre-input');
    this.genresTitle = document.getElementById('planner-genres-title');
    this.genreModalTitle = document.getElementById('planner-genre-modal-title');
    this.genreLabel = document.getElementById('planner-genre-label');
    this.genreHint = document.getElementById('planner-genre-hint');
    this.btnSaveGenre = document.getElementById('btn-save-planner-genre');

    // Estruturação Dupla (Atos e Capítulos)
    this.actsListEl = document.getElementById('planner-acts-list');
    this.chaptersListEl = document.getElementById('planner-chapters-overview');
    this.btnAddAct = document.getElementById('btn-add-act');
    this.actModal = document.getElementById('modal-planner-act');
    this.actForm = document.getElementById('form-planner-act');
    this.actNameInput = document.getElementById('planner-act-name');
    this.actDescInput = document.getElementById('planner-act-desc');
    this.actModalTitle = document.getElementById('planner-act-modal-title');
    this.actNameLabel = document.getElementById('planner-act-name-label');
    this.actSaveButton = document.getElementById('btn-save-planner-act');
    this.structureTitle = document.getElementById('planner-structure-title');
    this.actsHeading = document.getElementById('planner-acts-heading');
    this.chaptersHeading = document.getElementById('planner-chapters-heading');
    this.btnAddPlannedChapter = document.getElementById('btn-add-planned-chapter');
    this.plannedChapterModal = document.getElementById('modal-planner-chapter');
    this.plannedChapterForm = document.getElementById('form-planner-chapter');
    this.plannedChapterNameInput = document.getElementById('planner-chapter-name');
    this.plannedChapterGoalInput = document.getElementById('planner-chapter-goal');
    this.plannedChapterPlanInput = document.getElementById('planner-chapter-plan');
    this.plannedChapterModalTitle = document.getElementById('planner-chapter-modal-title');
    this.plannedChapterNameLabel = document.getElementById('planner-chapter-name-label');
    this.plannedChapterGoalField = document.querySelector('.planner-chapter-goal-field');
    this.plannedChapterGoalLabel = document.getElementById('planner-chapter-goal-label');
    this.plannedChapterPlanLabel = document.getElementById('planner-chapter-plan-label');
  }

  bindEvents() {
    if (this.btnEditGoal) {
      this.btnEditGoal.addEventListener('click', () => this.openGoalModal());
    }

    if (this.btnAddGenre) {
      this.btnAddGenre.addEventListener('click', () => this.openGenreModal());
    }

    if (this.goalForm) {
      this.goalForm.addEventListener('submit', event => {
        event.preventDefault();
        this.saveGoal();
      });
    }

    if (this.genreForm) {
      this.genreForm.addEventListener('submit', event => {
        event.preventDefault();
        this.saveGenre();
      });
    }

    [['goal', this.goalModal], ['genre', this.genreModal]].forEach(([kind, modal]) => {
      if (!modal) return;
      modal.addEventListener('click', event => {
        if (event.target === modal) this.closeActionModal(kind);
      });
    });

    ['btn-close-planner-goal', 'btn-cancel-planner-goal'].forEach(id => {
      document.getElementById(id)?.addEventListener('click', () => this.closeActionModal('goal'));
    });
    ['btn-close-planner-genre', 'btn-cancel-planner-genre'].forEach(id => {
      document.getElementById(id)?.addEventListener('click', () => this.closeActionModal('genre'));
    });

    if (this.btnAddAct) {
      this.btnAddAct.addEventListener('click', () => this.openActModal());
    }

    if (this.actForm) {
      this.actForm.addEventListener('submit', event => {
        event.preventDefault();
        this.saveAct();
      });
    }

    ['btn-close-planner-act', 'btn-cancel-planner-act'].forEach(id => {
      const button = document.getElementById(id);
      if (button) button.addEventListener('click', () => this.closeActModal());
    });

    if (this.actModal) {
      this.actModal.addEventListener('click', event => {
        if (event.target === this.actModal) this.closeActModal();
      });
    }

    if (this.btnAddPlannedChapter) {
      this.btnAddPlannedChapter.addEventListener('click', () => this.openPlannedChapterModal());
    }

    if (this.plannedChapterForm) {
      this.plannedChapterForm.addEventListener('submit', event => {
        event.preventDefault();
        this.savePlannedChapter();
      });
    }

    ['btn-close-planner-chapter', 'btn-cancel-planner-chapter'].forEach(id => {
      const button = document.getElementById(id);
      if (button) button.addEventListener('click', () => this.closePlannedChapterModal());
    });

    if (this.plannedChapterModal) {
      this.plannedChapterModal.addEventListener('click', event => {
        if (event.target === this.plannedChapterModal) this.closePlannedChapterModal();
      });
    }

    if (this.chaptersListEl) {
      this.chaptersListEl.addEventListener('click', event => {
        const actionButton = event.target.closest('[data-planned-chapter-action]');
        if (actionButton) {
          const id = actionButton.dataset.id;
          const action = actionButton.dataset.plannedChapterAction;
          if (action === 'delete') this.deletePlannedChapter(id);
          if (action === 'up') this.movePlannedChapter(id, -1);
          if (action === 'down') this.movePlannedChapter(id, 1);
          return;
        }
        const card = event.target.closest('[data-planned-chapter-id]');
        if (card) this.openPlannedChapterModal(card.dataset.plannedChapterId);
      });
      this.chaptersListEl.addEventListener('keydown', event => {
        if (event.target.matches('[data-planned-chapter-id]') && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          this.openPlannedChapterModal(event.target.dataset.plannedChapterId);
        }
      });
    }

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && this.actModal?.classList.contains('active')) {
        this.closeActModal();
      }
      if (event.key === 'Escape' && this.plannedChapterModal?.classList.contains('active')) {
        this.closePlannedChapterModal();
      }
      if (event.key === 'Escape' && this.goalModal?.classList.contains('active')) {
        this.closeActionModal('goal');
      }
      if (event.key === 'Escape' && this.genreModal?.classList.contains('active')) {
        this.closeActionModal('genre');
      }
    });

    if (this.actsListEl) {
      this.actsListEl.addEventListener('click', event => {
        const button = event.target.closest('[data-act-action]');
        if (!button) return;
        const actId = button.dataset.id;
        const action = button.dataset.actAction;
        if (action === 'edit') this.openActModal(actId);
        if (action === 'delete') this.deleteAct(actId);
        if (action === 'up') this.moveAct(actId, -1);
        if (action === 'down') this.moveAct(actId, 1);
      });
    }

    window.appState.subscribe(() => {
      this.render();
    });
  }

  openGoalModal() {
    const proj = window.appState.getActiveProject();
    if (!proj || !this.goalModal || !this.goalForm) return;
    this.goalInput.value = proj.planner?.wordGoal || 50000;
    this.goalModal.classList.add('active');
    requestAnimationFrame(() => this.goalInput.focus());
  }

  openGenreModal() {
    if (!this.genreModal || !this.genreForm) return;
    this.genreForm.reset();
    this.genreModal.classList.add('active');
    requestAnimationFrame(() => this.genreInput.focus());
  }

  closeActionModal(kind) {
    const modal = kind === 'goal' ? this.goalModal : this.genreModal;
    if (modal) modal.classList.remove('active');
  }

  saveGoal() {
    const proj = window.appState.getActiveProject();
    const goal = Number(this.goalInput.value);
    if (!proj) return;
    if (!Number.isSafeInteger(goal) || goal < 1) {
      alert('A meta deve ser um número inteiro maior que zero.');
      this.goalInput.focus();
      return;
    }
    if (!proj.planner) proj.planner = {};
    proj.planner.wordGoal = goal;
    window.appState.updateActiveProject({ planner: proj.planner });
    this.closeActionModal('goal');
  }

  saveGenre() {
    const proj = window.appState.getActiveProject();
    const genre = this.genreInput.value.trim();
    if (!proj || !genre) return;
    if (!proj.planner) proj.planner = {};
    const genres = this.getProjectGenres(proj.planner);
    const duplicate = genres.some(item => String(item).localeCompare(genre, 'pt-BR', { sensitivity: 'base' }) === 0);
    if (duplicate) {
      alert('Esse gênero já foi adicionado ao projeto.');
      this.genreInput.focus();
      return;
    }
    proj.planner.genres = [...genres, genre];
    window.appState.updateActiveProject({ planner: proj.planner });
    this.closeActionModal('genre');
  }

  getProjectGenres(planner) {
    return Array.isArray(planner.genres) ? planner.genres : [];
  }

  openActModal(actId = null) {
    const proj = window.appState.getActiveProject();
    if (!proj || !this.actModal || !this.actForm) return;
    const act = actId && proj.planner?.acts
      ? proj.planner.acts.find(item => item.id === actId)
      : null;
    this.editingActId = act ? act.id : null;
    this.actForm.reset();
    if (act) {
      this.actNameInput.value = act.name || '';
      this.actDescInput.value = act.desc || '';
    }
    const noun = proj.type === 'rpg' ? 'arco' : 'ato';
    this.actModalTitle.textContent = act ? `Editar ${noun}` : `Novo ${noun}`;
    this.actNameLabel.textContent = `Nome do ${noun} *`;
    this.actNameInput.placeholder = proj.type === 'rpg' ? 'Ex.: Arco da Ascensão do Rei Sombrio' : 'Ex.: Ato I — O chamado';
    this.actSaveButton.textContent = `Salvar ${noun}`;
    this.actModal.classList.add('active');
    requestAnimationFrame(() => this.actNameInput.focus());
  }

  closeActModal() {
    if (this.actModal) this.actModal.classList.remove('active');
    this.editingActId = null;
  }

  saveAct() {
    const proj = window.appState.getActiveProject();
    const name = this.actNameInput.value.trim();
    if (!proj || !name) return;
    if (!proj.planner) proj.planner = {};
    if (!Array.isArray(proj.planner.acts)) proj.planner.acts = [];

    const existingAct = this.editingActId
      ? proj.planner.acts.find(act => act.id === this.editingActId)
      : null;
    if (existingAct) {
      existingAct.name = name;
      existingAct.desc = this.actDescInput.value.trim();
    } else {
      proj.planner.acts.push({
        id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name,
        desc: this.actDescInput.value.trim()
      });
    }

    window.appState.updateActiveProject({ planner: proj.planner });
    this.closeActModal();
  }

  deleteAct(actId) {
    const proj = window.appState.getActiveProject();
    if (!proj?.planner?.acts) return;
    const act = proj.planner.acts.find(item => item.id === actId);
    const noun = proj.type === 'rpg' ? 'arco' : 'ato';
    if (!act || !confirm(`Excluir o ${noun} "${act.name}"?`)) return;
    proj.planner.acts = proj.planner.acts.filter(item => item.id !== actId);
    window.appState.updateActiveProject({ planner: proj.planner });
  }

  moveAct(actId, offset) {
    const proj = window.appState.getActiveProject();
    if (!proj?.planner?.acts) return;
    const index = proj.planner.acts.findIndex(act => act.id === actId);
    const target = index + offset;
    if (index < 0 || target < 0 || target >= proj.planner.acts.length) return;
    [proj.planner.acts[index], proj.planner.acts[target]] = [proj.planner.acts[target], proj.planner.acts[index]];
    window.appState.updateActiveProject({ planner: proj.planner });
  }

  openPlannedChapterModal(chapterId = null) {
    const proj = window.appState.getActiveProject();
    if (!proj || !this.plannedChapterModal || !this.plannedChapterForm) return;
    const plannedChapters = Array.isArray(proj.planner?.plannedChapters)
      ? proj.planner.plannedChapters
      : [];
    const chapter = chapterId
      ? plannedChapters.find(item => item.id === chapterId)
      : null;
    this.editingPlannedChapterId = chapter ? chapter.id : null;
    this.plannedChapterForm.reset();
    if (chapter) {
      this.plannedChapterNameInput.value = chapter.title || '';
      this.plannedChapterGoalInput.value = chapter.wordGoal ?? '';
      this.plannedChapterPlanInput.value = chapter.plan || '';
    }
    const isRpg = proj.type === 'rpg';
    this.plannedChapterModalTitle.textContent = chapter ? `Editar ${isRpg ? 'sessão' : 'planejamento'}` : `Planejar ${isRpg ? 'sessão' : 'capítulo'}`;
    this.plannedChapterNameInput.placeholder = isRpg ? 'Ex.: A chegada à Fortaleza Sombria' : 'Ex.: O chamado na floresta';
    this.plannedChapterPlanInput.placeholder = isRpg
      ? 'Anote cenas, encontros, desafios, pistas e acontecimentos importantes desta sessão.'
      : 'Anote cenas, acontecimentos, revelações e mudanças importantes.';
    this.plannedChapterNameLabel.textContent = `Título ${isRpg ? 'da sessão' : 'do capítulo'} *`;
    this.plannedChapterPlanLabel.textContent = `O que deve acontecer ${isRpg ? 'nesta sessão' : 'neste capítulo'}?`;
    this.plannedChapterGoalField.hidden = isRpg;
    this.plannedChapterModal.classList.add('active');
    requestAnimationFrame(() => this.plannedChapterNameInput.focus());
  }

  closePlannedChapterModal() {
    if (this.plannedChapterModal) this.plannedChapterModal.classList.remove('active');
    this.editingPlannedChapterId = null;
  }

  savePlannedChapter() {
    const proj = window.appState.getActiveProject();
    const title = this.plannedChapterNameInput.value.trim();
    const goalInput = this.plannedChapterGoalInput.value.trim();
    if (!proj || !title) return;

    let wordGoal = null;
    if (goalInput && proj.type !== 'rpg') {
      wordGoal = Number(goalInput);
      if (!Number.isSafeInteger(wordGoal) || wordGoal < 1) {
        alert('A meta do capítulo deve ser um número inteiro maior que zero.');
        this.plannedChapterGoalInput.focus();
        return;
      }
    }

    if (!proj.planner) proj.planner = {};
    if (!Array.isArray(proj.planner.plannedChapters)) proj.planner.plannedChapters = [];
    const existingChapter = this.editingPlannedChapterId
      ? proj.planner.plannedChapters.find(chapter => chapter.id === this.editingPlannedChapterId)
      : null;
    if (existingChapter) {
      existingChapter.title = title;
      existingChapter.wordGoal = wordGoal;
      existingChapter.plan = this.plannedChapterPlanInput.value.trim();
    } else {
      proj.planner.plannedChapters.push({
        id: `plan-ch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title,
        wordGoal,
        plan: this.plannedChapterPlanInput.value.trim()
      });
    }

    window.appState.updateActiveProject({ planner: proj.planner });
    this.closePlannedChapterModal();
  }

  deletePlannedChapter(chapterId) {
    const proj = window.appState.getActiveProject();
    if (!proj?.planner?.plannedChapters) return;
    const chapter = proj.planner.plannedChapters.find(item => item.id === chapterId);
    const noun = proj.type === 'rpg' ? 'sessão' : 'capítulo';
    if (!chapter || !confirm(`Excluir o planejamento de ${noun} "${chapter.title}"?`)) return;
    proj.planner.plannedChapters = proj.planner.plannedChapters.filter(item => item.id !== chapterId);
    window.appState.updateActiveProject({ planner: proj.planner });
  }

  movePlannedChapter(chapterId, offset) {
    const proj = window.appState.getActiveProject();
    if (!proj?.planner?.plannedChapters) return;
    const chapters = proj.planner.plannedChapters;
    const index = chapters.findIndex(chapter => chapter.id === chapterId);
    const target = index + offset;
    if (index < 0 || target < 0 || target >= chapters.length) return;
    [chapters[index], chapters[target]] = [chapters[target], chapters[index]];
    window.appState.updateActiveProject({ planner: proj.planner });
  }

  getChapterWordCount(chapter) {
    if (typeof chapter.content === 'string') {
      const textContainer = document.createElement('div');
      textContainer.innerHTML = chapter.content;
      const text = textContainer.innerText || textContainer.textContent || '';
      return text.trim().split(/\s+/).filter(Boolean).length;
    }
    const storedCount = Number(chapter.wordCount);
    return Number.isFinite(storedCount) && storedCount > 0 ? storedCount : 0;
  }

  render() {
    const proj = window.appState.getActiveProject();
    if (!proj) return;
    const isRpg = proj.type === 'rpg';
    this.updateStructureTerminology(isRpg);

    // Calcula total de palavras de todos os capítulos
    let totalWords = 0;
    const chapters = proj.chapters || [];
    chapters.forEach(ch => { totalWords += this.getChapterWordCount(ch); });

    const configuredGoal = Number(proj.planner && proj.planner.wordGoal);
    const goal = Number.isSafeInteger(configuredGoal) && configuredGoal > 0 ? configuredGoal : 50000;
    const percent = Math.min(100, Math.round((totalWords / goal) * 100));
    const plannedChapters = Array.isArray(proj.planner?.plannedChapters)
      ? proj.planner.plannedChapters
      : [];

    if (this.goalWordsEl) this.goalWordsEl.textContent = goal.toLocaleString();
    if (this.currentWordsEl) this.currentWordsEl.textContent = totalWords.toLocaleString();
    if (this.progressPercentEl) this.progressPercentEl.textContent = `${percent}%`;
    if (this.progressFillEl) this.progressFillEl.style.width = `${percent}%`;
    if (this.progressTrackEl) this.progressTrackEl.setAttribute('aria-valuenow', String(percent));
    if (this.remainingWordsEl) this.remainingWordsEl.textContent = Math.max(0, goal - totalWords).toLocaleString();
    if (this.chapterCountEl) this.chapterCountEl.textContent = plannedChapters.length;

    // Gêneros ficam em campo próprio; temas antigos permanecem preservados no projeto.
    if (this.genresContainer) {
      const genres = this.getProjectGenres(proj.planner || {});
      if (genres.length === 0) {
        this.genresContainer.innerHTML = `<span style="color: var(--text-faint); font-size: 0.85rem;">${isRpg ? 'Nenhum gênero de RPG adicionado.' : 'Nenhum gênero literário adicionado.'}</span>`;
      } else {
        this.genresContainer.innerHTML = genres.map((genre, idx) => `
          <div class="genre-chip">
            <span>${iconSvg(isRpg ? 'dice' : 'book')} ${escapeHtml(genre)}</span>
            <button type="button" class="btn-remove" data-idx="${idx}" aria-label="Remover gênero ${escapeHtml(genre)}" title="Remover gênero">${iconSvg('close')}</button>
          </div>
        `).join('');

        this.genresContainer.querySelectorAll('.btn-remove').forEach(btn => {
          btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.idx);
            if (!proj.planner) proj.planner = {};
            proj.planner.genres = this.getProjectGenres(proj.planner);
            proj.planner.genres.splice(idx, 1);
            window.appState.updateActiveProject({ planner: proj.planner });
          });
        });
      }
    }

    // Renderiza Atos
    if (this.actsListEl) {
      const acts = (proj.planner && proj.planner.acts) ? proj.planner.acts : [];
      if (acts.length === 0) {
        this.actsListEl.innerHTML = `<p class="empty-state" style="padding: 20px;">Nenhum ${isRpg ? 'arco' : 'ato'} cadastrado ainda.</p>`;
      } else {
        this.actsListEl.innerHTML = acts.map((act, index) => `
          <div class="act-card">
            <div class="act-card-heading">
              <span class="act-title">${escapeHtml(act.name)}</span>
              <div class="act-card-actions">
                <button type="button" class="act-action" data-act-action="up" data-id="${escapeHtml(act.id)}" title="Mover para cima" aria-label="Mover ${escapeHtml(act.name)} para cima" ${index === 0 ? 'disabled' : ''}>${iconSvg('arrow-right', 'icon-chevron-up')}</button>
                <button type="button" class="act-action" data-act-action="down" data-id="${escapeHtml(act.id)}" title="Mover para baixo" aria-label="Mover ${escapeHtml(act.name)} para baixo" ${index === acts.length - 1 ? 'disabled' : ''}>${iconSvg('arrow-right', 'icon-chevron-down')}</button>
                <button type="button" class="act-action" data-act-action="edit" data-id="${escapeHtml(act.id)}" title="Editar ${isRpg ? 'arco' : 'ato'}" aria-label="Editar ${escapeHtml(act.name)}">${iconSvg('edit')}</button>
                <button type="button" class="act-action is-danger" data-act-action="delete" data-id="${escapeHtml(act.id)}" title="Excluir ${isRpg ? 'arco' : 'ato'}" aria-label="Excluir ${escapeHtml(act.name)}">×</button>
              </div>
            </div>
            <p class="act-desc">${escapeHtml(act.desc || 'Sem descrição cadastrada.')}</p>
          </div>
        `).join('');
      }
    }

    // Renderiza planejamentos independentes dos capítulos do Editor
    if (this.chaptersListEl) {
      if (plannedChapters.length === 0) {
        this.chaptersListEl.innerHTML = `<div class="planner-chapters-empty"><span>${iconSvg(isRpg ? 'dice' : 'calendar')}</span><p>${isRpg ? 'Suas sessões planejadas aparecerão aqui.' : 'Seus capítulos planejados aparecerão aqui.'}</p><small>${isRpg ? 'Planeje os encontros sem alterar os capítulos do Editor.' : 'Crie um planejamento sem alterar o conteúdo do Editor.'}</small></div>`;
      } else {
        this.chaptersListEl.innerHTML = plannedChapters.map((chapter, index) => `
          <article class="planned-chapter-card" data-planned-chapter-id="${escapeHtml(chapter.id)}" tabindex="0" role="group" aria-label="${isRpg ? 'Sessão' : 'Planejamento'} ${escapeHtml(chapter.title)}. Pressione Enter para editar.">
            <div class="planned-chapter-card-main">
              <span class="planned-chapter-index">${String(index + 1).padStart(2, '0')}</span>
              <div class="planned-chapter-copy">
                <strong>${escapeHtml(chapter.title)}</strong>
                ${!isRpg ? `<span>${chapter.wordGoal ? `${Number(chapter.wordGoal).toLocaleString()} palavras de meta` : 'Sem meta de palavras'}</span>` : ''}
              </div>
              <div class="planned-chapter-actions">
                <button type="button" data-planned-chapter-action="up" data-id="${escapeHtml(chapter.id)}" aria-label="Mover ${isRpg ? 'sessão' : 'capítulo'} para cima" title="Mover para cima" ${index === 0 ? 'disabled' : ''}>${iconSvg('arrow-right', 'icon-chevron-up')}</button>
                <button type="button" data-planned-chapter-action="down" data-id="${escapeHtml(chapter.id)}" aria-label="Mover ${isRpg ? 'sessão' : 'capítulo'} para baixo" title="Mover para baixo" ${index === plannedChapters.length - 1 ? 'disabled' : ''}>${iconSvg('arrow-right', 'icon-chevron-down')}</button>
                <button type="button" class="is-danger" data-planned-chapter-action="delete" data-id="${escapeHtml(chapter.id)}" aria-label="Excluir ${isRpg ? 'sessão' : 'planejamento'}" title="Excluir">×</button>
              </div>
            </div>
            ${chapter.plan ? `<p>${escapeHtml(chapter.plan)}</p>` : `<p class="planned-chapter-placeholder">Clique para descrever o que acontece ${isRpg ? 'nesta sessão' : 'neste capítulo'}.</p>`}
          </article>
        `).join('');
      }
    }
  }

  updateStructureTerminology(isRpg) {
    const arcWord = isRpg ? 'Arco' : 'Ato';
    if (this.goalsBanner) this.goalsBanner.hidden = isRpg;
    if (this.genresTitle) this.genresTitle.innerHTML = `${iconSvg(isRpg ? 'dice' : 'book')} ${isRpg ? 'Gêneros de RPG' : 'Gêneros Literários'}`;
    if (this.btnAddGenre) this.btnAddGenre.textContent = isRpg ? '+ Adicionar Gênero de RPG' : '+ Adicionar Gênero';
    if (this.genreModalTitle) this.genreModalTitle.textContent = isRpg ? 'Adicionar gênero de RPG' : 'Adicionar gênero literário';
    if (this.genreLabel) this.genreLabel.textContent = isRpg ? 'Gênero de RPG' : 'Gênero literário';
    if (this.genreInput) this.genreInput.placeholder = isRpg
      ? 'Ex.: Alta fantasia, exploração de masmorras, horror cósmico'
      : 'Ex.: Fantasia, romance, ficção científica';
    if (this.genreHint) this.genreHint.textContent = isRpg
      ? 'Cadastre os estilos e subgêneros que definem sua campanha.'
      : 'Cadastre um ou mais gêneros que descrevem sua obra.';
    if (this.btnSaveGenre) this.btnSaveGenre.textContent = isRpg ? 'Adicionar gênero de RPG' : 'Adicionar gênero';
    if (this.chapterCountLabelEl) this.chapterCountLabelEl.textContent = isRpg ? 'Sessões Planejadas' : 'Capítulos Planejados';
    if (this.progressTitleEl) this.progressTitleEl.textContent = isRpg ? 'Progresso da Campanha' : 'Progresso do Manuscrito';
    if (this.goalScopeNoteEl) this.goalScopeNoteEl.textContent = isRpg
      ? 'A contagem usa os textos do Editor. As sessões planejadas ficam separadas.'
      : 'A contagem usa os textos do Editor. Os capítulos planejados ficam separados.';
    if (this.structureTitle) this.structureTitle.textContent = isRpg ? 'Estrutura da Campanha (Arcos e Sessões)' : 'Estrutura Dramática (Atos x Capítulos)';
    if (this.actsHeading) this.actsHeading.innerHTML = `${iconSvg(isRpg ? 'compass' : 'masks')} ${isRpg ? 'Arcos da Campanha' : 'Atos e Arcos Dramáticos'}`;
    if (this.chaptersHeading) this.chaptersHeading.innerHTML = `${iconSvg(isRpg ? 'dice' : 'calendar')} ${isRpg ? 'Sessões Planejadas' : 'Capítulos Planejados'}`;
    if (this.btnAddAct) this.btnAddAct.textContent = `+ Novo ${arcWord}`;
    if (this.btnAddPlannedChapter) this.btnAddPlannedChapter.textContent = isRpg ? '+ Nova Sessão' : '+ Novo Capítulo';
  }
}

window.PlannerModule = PlannerModule;

