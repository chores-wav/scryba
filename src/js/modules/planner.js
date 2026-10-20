/**
 * MÓDULO 6: PLANEJADOR DE PROJETOS (FOCADO EM LIVROS)
 */

class PlannerModule {
  constructor() {
    this.initElements();
    this.bindEvents();
  }

  initElements() {
    // Metas
    this.goalWordsEl = document.getElementById('planner-goal-words');
    this.currentWordsEl = document.getElementById('planner-current-words');
    this.progressFillEl = document.getElementById('planner-progress-fill');
    this.progressPercentEl = document.getElementById('planner-progress-percent');
    this.chapterCountEl = document.getElementById('planner-chapter-count');
    this.btnEditGoal = document.getElementById('btn-edit-word-goal');

    // Temas
    this.themesContainer = document.getElementById('planner-themes-container');
    this.btnAddTheme = document.getElementById('btn-add-theme');

    // Estruturação Dupla (Atos e Capítulos)
    this.actsListEl = document.getElementById('planner-acts-list');
    this.chaptersListEl = document.getElementById('planner-chapters-overview');
    this.btnAddAct = document.getElementById('btn-add-act');
  }

  bindEvents() {
    if (this.btnEditGoal) {
      this.btnEditGoal.addEventListener('click', () => {
        const proj = window.appState.getActiveProject();
        if (!proj) return;
        const currentGoal = proj.planner ? proj.planner.wordGoal : 50000;
        const input = prompt('Defina sua meta de palavras para o livro:', currentGoal);
        if (input && !isNaN(input)) {
          if (!proj.planner) proj.planner = {};
          proj.planner.wordGoal = parseInt(input);
          window.appState.updateActiveProject({ planner: proj.planner });
          this.render();
        }
      });
    }

    if (this.btnAddTheme) {
      this.btnAddTheme.addEventListener('click', () => {
        const theme = prompt('Digite um novo tema central da história (ex: Vingança, Redenção, Segredos de Família):');
        if (theme && theme.trim()) {
          const proj = window.appState.getActiveProject();
          if (!proj) return;
          if (!proj.planner) proj.planner = {};
          if (!proj.planner.themes) proj.planner.themes = [];
          proj.planner.themes.push(theme.trim());
          window.appState.updateActiveProject({ planner: proj.planner });
          this.render();
        }
      });
    }

    if (this.btnAddAct) {
      this.btnAddAct.addEventListener('click', () => {
        const name = prompt('Nome do Ato (ex: Ato IV: O Clímax):');
        if (name && name.trim()) {
          const desc = prompt('Breve resumo deste Ato:') || '';
          const proj = window.appState.getActiveProject();
          if (!proj) return;
          if (!proj.planner) proj.planner = {};
          if (!proj.planner.acts) proj.planner.acts = [];
          proj.planner.acts.push({ id: 'act-' + Date.now(), name: name.trim(), desc: desc.trim() });
          window.appState.updateActiveProject({ planner: proj.planner });
          this.render();
        }
      });
    }

    window.appState.subscribe(() => {
      this.render();
    });
  }

  render() {
    const proj = window.appState.getActiveProject();
    if (!proj) return;

    // Calcula total de palavras de todos os capítulos
    let totalWords = 0;
    const chapters = proj.chapters || [];
    chapters.forEach(ch => {
      totalWords += ch.wordCount || 0;
    });

    const goal = (proj.planner && proj.planner.wordGoal) ? proj.planner.wordGoal : 50000;
    const percent = Math.min(100, Math.round((totalWords / goal) * 100));

    if (this.goalWordsEl) this.goalWordsEl.textContent = goal.toLocaleString();
    if (this.currentWordsEl) this.currentWordsEl.textContent = totalWords.toLocaleString();
    if (this.progressPercentEl) this.progressPercentEl.textContent = `${percent}%`;
    if (this.progressFillEl) this.progressFillEl.style.width = `${percent}%`;
    if (this.chapterCountEl) this.chapterCountEl.textContent = chapters.length;

    // Renderiza Temas
    if (this.themesContainer) {
      const themes = (proj.planner && proj.planner.themes) ? proj.planner.themes : [];
      if (themes.length === 0) {
        this.themesContainer.innerHTML = '<span style="color: var(--text-faint); font-size: 0.85rem;">Nenhum tema adicionado.</span>';
      } else {
        this.themesContainer.innerHTML = themes.map((theme, idx) => `
          <div class="theme-chip">
            <span>🏷️ ${escapeHtml(theme)}</span>
            <span class="btn-remove" data-idx="${idx}" title="Remover tema">✕</span>
          </div>
        `).join('');

        this.themesContainer.querySelectorAll('.btn-remove').forEach(btn => {
          btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.idx);
            proj.planner.themes.splice(idx, 1);
            window.appState.updateActiveProject({ planner: proj.planner });
            this.render();
          });
        });
      }
    }

    // Renderiza Atos
    if (this.actsListEl) {
      const acts = (proj.planner && proj.planner.acts) ? proj.planner.acts : [];
      if (acts.length === 0) {
        this.actsListEl.innerHTML = '<p class="empty-state" style="padding: 20px;">Nenhum ato cadastrado ainda.</p>';
      } else {
        this.actsListEl.innerHTML = acts.map(act => `
          <div class="act-card">
            <span class="act-title">${escapeHtml(act.name)}</span>
            <p class="act-desc">${escapeHtml(act.desc || 'Sem descrição cadastrada.')}</p>
          </div>
        `).join('');
      }
    }

    // Renderiza Visão de Capítulos ordenada (Estilo Wattpad)
    if (this.chaptersListEl) {
      if (chapters.length === 0) {
        this.chaptersListEl.innerHTML = '<p class="empty-state" style="padding: 20px;">Nenhum capítulo cadastrado.</p>';
      } else {
        this.chaptersListEl.innerHTML = chapters.map((ch, i) => `
          <div class="act-card" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;" data-id="${ch.id}">
            <div>
              <strong style="color: var(--text-main); font-size: 0.9rem;">#${i + 1} - ${escapeHtml(ch.title)}</strong>
              <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">${(ch.wordCount || 0).toLocaleString()} palavras</div>
            </div>
            <button class="btn btn-ghost" style="padding: 4px 8px; font-size: 0.8rem;">Editar ➔</button>
          </div>
        `).join('');

        this.chaptersListEl.querySelectorAll('.act-card').forEach(item => {
          item.addEventListener('click', () => {
            window.appRouter.navigate('editor');
          });
        });
      }
    }
  }
}

window.PlannerModule = PlannerModule;

