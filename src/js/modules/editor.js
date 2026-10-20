/**
 * MÓDULO 7: EDITOR DE TEXTO PRINCIPAL (AVANÇADO ESTILO WATTPAD & NOTION)
 * Suporte a barra de formatação rica, drag & drop de capítulos, status e temas visuais.
 */

class EditorModule {
  constructor() {
    this.activeChapterId = null;
    this.saveTimeout = null;
    this.draggedIndex = null;
    this.currentTheme = localStorage.getItem('scryba_editor_theme') || 'dark';

    this.initElements();
    this.bindEvents();
    this.applyTheme(this.currentTheme);
  }

  initElements() {
    // Lista e ações de capítulos
    this.chapterListEl = document.getElementById('editor-chapter-list');
    this.btnNewChapter = document.getElementById('btn-new-chapter');

    // Folha e Título
    this.scrollContainer = document.getElementById('editor-scroll-container');
    this.inputTitle = document.getElementById('chapter-title-input');
    this.contentEditable = document.getElementById('chapter-content-editable');

    // Métricas ao vivo
    this.wordCountEl = document.getElementById('editor-word-count');
    this.charCountEl = document.getElementById('editor-char-count');
    this.readingTimeEl = document.getElementById('editor-reading-time');
    this.saveStatusEl = document.getElementById('editor-save-status');

    // Botão Modo Foco
    this.btnFocusMode = document.getElementById('btn-editor-focus');

    // Botões de Formatação
    this.fmtButtons = document.querySelectorAll('.fmt-btn');

    // Seletor de Temas
    this.themeButtons = document.querySelectorAll('.theme-opt-btn');

    // Exportação
    this.btnExportChapter = document.getElementById('btn-export-chapter');
    this.btnExportBook = document.getElementById('btn-export-book');
  }

  bindEvents() {
    // Adicionar Novo Capítulo
    if (this.btnNewChapter) {
      this.btnNewChapter.addEventListener('click', () => this.handleNewChapter());
    }

    // Título do Capítulo (Auto-save)
    if (this.inputTitle) {
      this.inputTitle.addEventListener('input', () => this.triggerAutoSave());
    }

    // Conteúdo Editável Rico
    if (this.contentEditable) {
      this.contentEditable.addEventListener('input', () => {
        this.updateStats();
        this.triggerAutoSave();
      });

      // Atalhos de teclado familiares
      this.contentEditable.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
          if (e.key === 'b' || e.key === 'B') {
            e.preventDefault();
            this.execFormat('bold');
          } else if (e.key === 'i' || e.key === 'I') {
            e.preventDefault();
            this.execFormat('italic');
          } else if (e.key === 's' || e.key === 'S') {
            e.preventDefault();
            this.saveCurrentChapterDirectly();
            if (this.saveStatusEl) {
              this.saveStatusEl.textContent = '● Salvo manualmente';
              this.saveStatusEl.style.color = '#10b981';
            }
          }
        }
      });
    }

    // Ações da Barra de Formatação
    this.fmtButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const cmd = btn.dataset.cmd;
        const val = btn.dataset.val || null;
        this.execFormat(cmd, val);
      });
    });

    // Alternar Temas de Escrita (Dark / Sépia / Pergaminho)
    this.themeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.dataset.theme;
        this.applyTheme(theme);
      });
    });

    // Exportações Rápidas
    if (this.btnExportChapter) {
      this.btnExportChapter.addEventListener('click', () => this.exportCurrentChapter());
    }
    if (this.btnExportBook) {
      this.btnExportBook.addEventListener('click', () => this.exportFullBook());
    }

    // Modo Foco
    if (this.btnFocusMode) {
      this.btnFocusMode.addEventListener('click', () => {
        document.body.classList.toggle('focus-mode');
      });
    }

    // Atalho ESC para sair do modo foco
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.body.classList.contains('focus-mode')) {
        document.body.classList.remove('focus-mode');
      }
    });

    // Inscrição no Estado Global
    window.appState.subscribe(() => {
      this.loadActiveProjectData();
    });
  }

  // Executa comandos de formatação no editor rico
  execFormat(command, value = null) {
    if (!this.contentEditable) return;
    this.contentEditable.focus();
    document.execCommand(command, false, value);
    this.updateStats();
    this.triggerAutoSave();
  }

  // Aplica o tema visual selecionado
  applyTheme(themeName) {
    this.currentTheme = themeName;
    localStorage.setItem('scryba_editor_theme', themeName);

    if (this.scrollContainer) {
      this.scrollContainer.classList.remove('theme-dark', 'theme-sepia', 'theme-parchment');
      this.scrollContainer.classList.add(`theme-${themeName}`);
    }

    this.themeButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === themeName);
    });
  }

  // Carrega os dados do projeto ativo
  loadActiveProjectData() {
    const proj = window.appState.getActiveProject();
    if (!proj) return;

    if (!proj.chapters || proj.chapters.length === 0) {
      proj.chapters = [{ id: 'ch-1', title: 'Capítulo 1', content: '<p></p>', wordCount: 0, status: 'draft' }];
    }

    if (!this.activeChapterId || !proj.chapters.find(c => c.id === this.activeChapterId)) {
      this.activeChapterId = proj.chapters[0].id;
    }

    this.renderChaptersList();
    this.loadCurrentChapter();
  }

  // Renderiza a lista lateral com Drag & Drop, Status e Ações
  renderChaptersList() {
    const proj = window.appState.getActiveProject();
    if (!proj || !this.chapterListEl) return;

    this.chapterListEl.innerHTML = proj.chapters.map((ch, index) => {
      const isActive = ch.id === this.activeChapterId;
      const count = ch.wordCount || 0;
      const status = ch.status || 'draft';

      let statusLabel = '📝 Rascunho';
      let statusClass = 'status-draft';
      if (status === 'review') {
        statusLabel = '🔍 Em Revisão';
        statusClass = 'status-review';
      } else if (status === 'done') {
        statusLabel = '✅ Finalizado';
        statusClass = 'status-done';
      }

      return `
        <div class="chapter-item ${isActive ? 'active' : ''}" 
             data-id="${ch.id}" 
             data-index="${index}" 
             draggable="true">
          
          <div class="chapter-item-top">
            <span class="chapter-drag-handle" title="Arraste para reordenar">⠿</span>
            <div class="chapter-title-wrapper" title="${escapeHtml(ch.title)}">
              <span>#${index + 1} ${escapeHtml(ch.title || 'Sem título')}</span>
            </div>
            <div class="chapter-actions">
              <button class="btn-chapter-action btn-rename-ch" data-id="${ch.id}" title="Renomear capítulo">✏️</button>
              <button class="btn-chapter-action delete btn-delete-ch" data-id="${ch.id}" title="Excluir capítulo">🗑️</button>
            </div>
          </div>

          <div class="chapter-item-bottom">
            <span class="chapter-status-tag ${statusClass}" data-id="${ch.id}" title="Clique para alterar status">
              ${statusLabel}
            </span>
            <span class="chapter-word-meta">${count.toLocaleString()} pal.</span>
          </div>

        </div>
      `;
    }).join('');

    this.bindChapterListInteractions();
  }

  bindChapterListInteractions() {
    const items = this.chapterListEl.querySelectorAll('.chapter-item');

    items.forEach(item => {
      // Clique para selecionar o capítulo
      item.addEventListener('click', (e) => {
        if (e.target.closest('.btn-chapter-action') || e.target.closest('.chapter-status-tag')) return;
        this.saveCurrentChapterDirectly();
        this.activeChapterId = item.dataset.id;
        this.renderChaptersList();
        this.loadCurrentChapter();
      });

      // --- DRAG & DROP PARA REORDENAR CAPÍTULOS ---
      item.addEventListener('dragstart', (e) => {
        this.draggedIndex = parseInt(item.dataset.index);
        item.style.opacity = '0.5';
        e.dataTransfer.effectAllowed = 'move';
      });

      item.addEventListener('dragend', () => {
        item.style.opacity = '1';
        items.forEach(el => el.classList.remove('drag-over'));
      });

      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        item.classList.add('drag-over');
      });

      item.addEventListener('dragleave', () => {
        item.classList.remove('drag-over');
      });

      item.addEventListener('drop', (e) => {
        e.preventDefault();
        item.classList.remove('drag-over');
        const targetIndex = parseInt(item.dataset.index);
        if (this.draggedIndex !== null && this.draggedIndex !== targetIndex) {
          this.reorderChapters(this.draggedIndex, targetIndex);
        }
      });
    });

    // Alterar Status ao clicar na tag
    this.chapterListEl.querySelectorAll('.chapter-status-tag').forEach(tag => {
      tag.addEventListener('click', (e) => {
        e.stopPropagation();
        const chId = tag.dataset.id;
        this.cycleChapterStatus(chId);
      });
    });

    // Renomear Capítulo
    this.chapterListEl.querySelectorAll('.btn-rename-ch').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const chId = btn.dataset.id;
        this.handleRenameChapter(chId);
      });
    });

    // Excluir Capítulo
    this.chapterListEl.querySelectorAll('.btn-delete-ch').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const chId = btn.dataset.id;
        this.handleDeleteChapter(chId);
      });
    });
  }

  // Reordenação do array de capítulos (Drag & Drop)
  reorderChapters(fromIndex, toIndex) {
    const proj = window.appState.getActiveProject();
    if (!proj || !proj.chapters) return;

    const [moved] = proj.chapters.splice(fromIndex, 1);
    proj.chapters.splice(toIndex, 0, moved);

    window.appState.updateActiveProject({ chapters: proj.chapters });
    this.renderChaptersList();
  }

  // Alterna o status: Rascunho -> Em Revisão -> Finalizado
  cycleChapterStatus(chId) {
    const proj = window.appState.getActiveProject();
    if (!proj) return;
    const ch = proj.chapters.find(c => c.id === chId);
    if (!ch) return;

    if (ch.status === 'draft') ch.status = 'review';
    else if (ch.status === 'review') ch.status = 'done';
    else ch.status = 'draft';

    window.appState.updateActiveProject({ chapters: proj.chapters });
    this.renderChaptersList();
  }

  handleRenameChapter(chId) {
    const proj = window.appState.getActiveProject();
    if (!proj) return;
    const ch = proj.chapters.find(c => c.id === chId);
    if (!ch) return;

    const newTitle = prompt('Novo título do capítulo:', ch.title);
    if (newTitle && newTitle.trim()) {
      ch.title = newTitle.trim();
      if (ch.id === this.activeChapterId && this.inputTitle) {
        this.inputTitle.value = ch.title;
      }
      window.appState.updateActiveProject({ chapters: proj.chapters });
      this.renderChaptersList();
    }
  }

  handleDeleteChapter(chId) {
    const proj = window.appState.getActiveProject();
    if (!proj || proj.chapters.length <= 1) {
      alert('Você precisa ter pelo menos um capítulo no projeto.');
      return;
    }

    const ch = proj.chapters.find(c => c.id === chId);
    const title = ch ? ch.title : 'este capítulo';

    if (confirm(`Deseja excluir "${title}"?`)) {
      proj.chapters = proj.chapters.filter(c => c.id !== chId);
      if (this.activeChapterId === chId) {
        this.activeChapterId = proj.chapters[0].id;
      }
      window.appState.updateActiveProject({ chapters: proj.chapters });
      this.renderChaptersList();
      this.loadCurrentChapter();
    }
  }

  loadCurrentChapter() {
    const proj = window.appState.getActiveProject();
    if (!proj) return;
    const current = proj.chapters.find(c => c.id === this.activeChapterId);
    if (!current) return;

    if (this.inputTitle) this.inputTitle.value = current.title || '';
    if (this.contentEditable) {
      this.contentEditable.innerHTML = current.content || '<p></p>';
    }
    this.updateStats();
  }

  saveCurrentChapterDirectly() {
    const proj = window.appState.getActiveProject();
    if (!proj) return;
    const current = proj.chapters.find(c => c.id === this.activeChapterId);
    if (!current) return;

    current.title = this.inputTitle ? this.inputTitle.value.trim() : current.title;
    current.content = this.contentEditable ? this.contentEditable.innerHTML : current.content;
    current.wordCount = this.calculateWordCount(this.contentEditable ? this.contentEditable.innerText : '');

    window.appState.updateActiveProject({ chapters: proj.chapters });
  }

  triggerAutoSave() {
    if (this.saveStatusEl) {
      this.saveStatusEl.textContent = 'Salvando...';
      this.saveStatusEl.style.color = '#f59e0b';
    }

    clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.saveCurrentChapterDirectly();
      this.renderChaptersList();
      if (this.saveStatusEl) {
        this.saveStatusEl.textContent = '● Salvo';
        this.saveStatusEl.style.color = '#10b981';
      }
    }, 400);
  }

  handleNewChapter() {
    const proj = window.appState.getActiveProject();
    if (!proj) return;

    const newIndex = proj.chapters.length + 1;
    const newChapter = {
      id: 'ch-' + Date.now(),
      title: `Capítulo ${newIndex}`,
      content: '<p></p>',
      wordCount: 0,
      status: 'draft'
    };

    proj.chapters.push(newChapter);
    this.activeChapterId = newChapter.id;
    window.appState.updateActiveProject({ chapters: proj.chapters });
    this.renderChaptersList();
    this.loadCurrentChapter();
    if (this.inputTitle) this.inputTitle.focus();
  }

  calculateWordCount(plainText) {
    if (!plainText) return 0;
    const words = plainText.trim().split(/\s+/).filter(Boolean);
    return words.length;
  }

  updateStats() {
    const text = this.contentEditable ? this.contentEditable.innerText : '';
    const words = this.calculateWordCount(text);
    const chars = text.length;
    const readingMinutes = Math.max(1, Math.ceil(words / 200));

    if (this.wordCountEl) this.wordCountEl.textContent = `${words.toLocaleString()} palavras`;
    if (this.charCountEl) this.charCountEl.textContent = `${chars.toLocaleString()} caracteres`;
    if (this.readingTimeEl) this.readingTimeEl.textContent = `~${readingMinutes} min de leitura`;
  }

  // --- EXPORTAÇÃO RÁPIDA (TXT / MD) ---
  exportCurrentChapter() {
    const proj = window.appState.getActiveProject();
    if (!proj) return;
    const current = proj.chapters.find(c => c.id === this.activeChapterId);
    if (!current) return;

    const fileName = `${slugify(current.title || 'capitulo')}.txt`;
    const text = `${current.title}\n\n${this.contentEditable ? this.contentEditable.innerText : ''}`;
    this.downloadFile(fileName, text);
  }

  exportFullBook() {
    const proj = window.appState.getActiveProject();
    if (!proj || !proj.chapters) return;

    let fullText = `${proj.title.toUpperCase()}\n`;
    if (proj.description) fullText += `${proj.description}\n`;
    fullText += `==============================================\n\n`;

    proj.chapters.forEach((ch, idx) => {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = ch.content || '';
      fullText += `### Capítulo ${idx + 1}: ${ch.title}\n\n`;
      fullText += `${tempDiv.innerText}\n\n`;
      fullText += `----------------------------------------------\n\n`;
    });

    const fileName = `${slugify(proj.title || 'livro')}_completo.txt`;
    this.downloadFile(fileName, fullText);
  }

  downloadFile(fileName, content) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

function slugify(text) {
  return text.toString().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .trim();
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

window.EditorModule = EditorModule;
