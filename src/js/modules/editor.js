/**
 * MÓDULO 7: EDITOR DE TEXTO PRINCIPAL (AVANÇADO ESTILO WATTPAD & NOTION)
 * Suporte a barra de formatação rica, drag & drop de capítulos, status e temas visuais.
 */

class EditorModule {
  constructor() {
    this.activeChapterId = null;
    this.loadedProjectId = null;
    this.saveTimeout = null;
    this.draggedIndex = null;
    this.currentTheme = localStorage.getItem('scryba_editor_theme') || 'dark';
    this.currentFont = localStorage.getItem('scryba_editor_font') || 'lora';

    this.initElements();
    this.bindEvents();
    this.applyTheme(this.currentTheme);
    this.applyFont(this.currentFont);
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
    this.saveHistoryButton = document.getElementById('btn-open-save-history');
    this.saveHistoryModal = document.getElementById('modal-save-history');
    this.saveHistoryList = document.getElementById('save-history-list');

    // Botão Modo Foco
    this.btnFocusMode = document.getElementById('btn-editor-focus');
    this.btnToggleFormatting = document.getElementById('btn-toggle-formatting');
    this.formattingPanel = document.getElementById('editor-formatting-panel');

    // Botões de Formatação
    this.fmtButtons = document.querySelectorAll('.fmt-btn');

    // Seletor de Temas
    this.themeButtons = document.querySelectorAll('.theme-opt-btn');
    this.fontSelect = document.getElementById('editor-font-select');

    // Exportação
    this.btnExportChapter = document.getElementById('btn-export-chapter');
    this.btnExportBook = document.getElementById('btn-export-book');
    this.exportMenus = document.querySelectorAll('.editor-export-menu-wrap');
    this.textColorInput = document.getElementById('editor-text-color');
    this.highlightColorInput = document.getElementById('editor-highlight-color');
    this.fontSizeSelect = document.getElementById('editor-font-size');
    this.lineSpacingSelect = document.getElementById('editor-line-spacing');
    this.savedSelectionRange = null;
    this.publicationModal = document.getElementById('modal-publication-export');
    this.publicationForm = document.getElementById('form-publication-export');
    this.publicationPreviewModal = document.getElementById('modal-publication-preview');
    this.publicationPreviewFrame = document.getElementById('publication-preview-frame');
    this.pendingExport = null;
  }

  bindEvents() {
    this.saveHistoryButton?.addEventListener('click', () => this.openSaveHistory());
    document.getElementById('btn-close-save-history')?.addEventListener('click', () => this.closeSaveHistory());
    this.saveHistoryModal?.addEventListener('click', event => {
      if (event.target === this.saveHistoryModal) this.closeSaveHistory();
    });
    this.saveHistoryList?.addEventListener('click', event => {
      const button = event.target.closest('[data-save-version]');
      if (button) this.restoreSaveVersion(button.dataset.saveVersion);
    });

    this.btnToggleFormatting?.addEventListener('click', () => {
      const isOpening = this.formattingPanel?.hidden ?? true;
      if (this.formattingPanel) this.formattingPanel.hidden = !isOpening;
      this.btnToggleFormatting.setAttribute('aria-expanded', String(isOpening));
      this.btnToggleFormatting.classList.toggle('is-open', isOpening);
      this.btnToggleFormatting.setAttribute('aria-label', isOpening ? 'Fechar ferramentas do editor' : 'Abrir ferramentas do editor');
    });

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
      this.contentEditable.addEventListener('dragover', event => {
        if (event.dataTransfer?.types?.includes('Files')) {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
          this.contentEditable.classList.add('is-image-drag-over');
        }
      });
      this.contentEditable.addEventListener('dragleave', event => {
        if (!event.relatedTarget || !this.contentEditable.contains(event.relatedTarget)) {
          this.contentEditable.classList.remove('is-image-drag-over');
        }
      });
      this.contentEditable.addEventListener('drop', event => this.handleImageDrop(event));

      // Atalhos de teclado familiares
      this.contentEditable.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
          if (e.key === 'b' || e.key === 'B') {
            e.preventDefault();
            this.execFormat('bold');
          } else if (e.key === 'i' || e.key === 'I') {
            e.preventDefault();
            this.execFormat('italic');
          } else if (e.key === 'u' || e.key === 'U') {
            e.preventDefault();
            this.execFormat('underline');
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

    this.fontSelect?.addEventListener('change', () => this.applyFont(this.fontSelect.value));

    // Exportações Rápidas
    this.exportMenus.forEach(wrap => {
      const toggle = wrap.querySelector('.editor-export-toggle');
      const menu = wrap.querySelector('.editor-export-menu');
      toggle?.addEventListener('click', () => {
        const shouldOpen = menu.hidden;
        this.closeExportMenus();
        menu.hidden = !shouldOpen;
        toggle.setAttribute('aria-expanded', String(shouldOpen));
      });
      wrap.querySelectorAll('[data-export-format]').forEach(button => {
        button.addEventListener('click', () => {
          menu.hidden = true;
          toggle?.setAttribute('aria-expanded', 'false');
          this.openPublicationExport(button.dataset.exportTarget, button.dataset.exportFormat);
        });
      });
    });
    document.addEventListener('click', event => {
      if (!event.target.closest('.editor-export-menu-wrap')) this.closeExportMenus();
      if (this.formattingPanel && !this.formattingPanel.hidden && !event.target.closest('.editor-top-controls')) {
        this.formattingPanel.hidden = true;
        this.btnToggleFormatting?.setAttribute('aria-expanded', 'false');
        this.btnToggleFormatting?.setAttribute('aria-label', 'Abrir ferramentas do editor');
        this.btnToggleFormatting?.classList.remove('is-open');
      }
    });

    this.contentEditable?.addEventListener('mouseup', () => this.rememberSelection());
    this.contentEditable?.addEventListener('keyup', () => this.rememberSelection());
    [this.textColorInput, this.highlightColorInput].forEach(input => {
      input?.addEventListener('pointerdown', () => this.rememberSelection());
    });
    this.textColorInput?.addEventListener('input', () => this.applyColor('foreColor', this.textColorInput.value));
    this.highlightColorInput?.addEventListener('input', () => this.applyColor('hiliteColor', this.highlightColorInput.value));
    this.fontSizeSelect?.addEventListener('change', () => this.execFormat('fontSize', this.fontSizeSelect.value));
    this.lineSpacingSelect?.addEventListener('change', () => this.applyLineSpacing(this.lineSpacingSelect.value));

    const closePublication = () => this.closePublicationExport();
    document.getElementById('btn-close-publication-export')?.addEventListener('click', closePublication);
    document.getElementById('btn-cancel-publication-export')?.addEventListener('click', closePublication);
    document.getElementById('btn-preview-publication')?.addEventListener('click', () => this.openPublicationPreview());
    document.getElementById('btn-close-publication-preview')?.addEventListener('click', () => this.closePublicationPreview());
    this.publicationPreviewModal?.addEventListener('click', event => {
      if (event.target === this.publicationPreviewModal) this.closePublicationPreview();
    });
    this.publicationModal?.addEventListener('click', event => {
      if (event.target === this.publicationModal) closePublication();
    });
    this.publicationForm?.addEventListener('submit', event => {
      event.preventDefault();
      const settings = this.readPublicationSettings();
      const project = window.appState.getActiveProject();
      if (project) {
        project.publicationSettings = settings;
        window.appState.updateActiveProject({ publicationSettings: settings });
      }
      const pending = this.pendingExport;
      closePublication();
      if (pending) this.generateExportDocument(pending.target, pending.format, settings);
    });

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
      if (e.key === 'Escape' && this.formattingPanel && !this.formattingPanel.hidden) {
        this.formattingPanel.hidden = true;
        this.btnToggleFormatting?.setAttribute('aria-expanded', 'false');
        this.btnToggleFormatting?.setAttribute('aria-label', 'Abrir ferramentas do editor');
        this.btnToggleFormatting?.classList.remove('is-open');
      }
      if (e.key === 'Escape' && this.publicationModal?.classList.contains('active')) this.closePublicationExport();
      if (e.key === 'Escape' && this.publicationPreviewModal?.classList.contains('active')) this.closePublicationPreview();
      if (e.key === 'Escape' && this.saveHistoryModal?.classList.contains('active')) this.closeSaveHistory();
    });

    // Inscrição no Estado Global
    window.appState.subscribe(() => {
      this.loadActiveProjectData();
    });
  }

  // Executa comandos de formatação no editor rico
  execFormat(command, value = null) {
    if (!this.contentEditable) return;
    if (command === 'createLink') {
      value = prompt('Endereço do link (URL):', 'https://');
      if (!value) return;
    }
    this.contentEditable.focus();
    document.execCommand(command, false, value);
    this.updateStats();
    this.triggerAutoSave();
  }

  rememberSelection() {
    const selection = window.getSelection();
    if (selection?.rangeCount && this.contentEditable?.contains(selection.anchorNode)) {
      this.savedSelectionRange = selection.getRangeAt(0).cloneRange();
    }
  }

  applyColor(command, color) {
    this.contentEditable?.focus();
    const selection = window.getSelection();
    if (this.savedSelectionRange && selection) {
      selection.removeAllRanges();
      selection.addRange(this.savedSelectionRange);
    }
    document.execCommand(command, false, color);
    const input = command === 'foreColor' ? this.textColorInput : this.highlightColorInput;
    input?.parentElement?.style.setProperty('--editor-color-indicator', color);
    this.rememberSelection();
    this.triggerAutoSave();
  }

  applyLineSpacing(value) {
    const selection = window.getSelection();
    const node = selection?.anchorNode;
    let block = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
    block = block?.closest('p,h1,h2,h3,blockquote,li,div');
    if (!block || !this.contentEditable?.contains(block)) {
      this.contentEditable?.focus();
      document.execCommand('formatBlock', false, 'p');
      const nextNode = window.getSelection()?.anchorNode;
      block = (nextNode?.nodeType === Node.ELEMENT_NODE ? nextNode : nextNode?.parentElement)?.closest('p,h1,h2,h3,blockquote,li,div');
    }
    if (block && this.contentEditable?.contains(block)) {
      block.style.lineHeight = value;
      this.triggerAutoSave();
    }
  }

  closeExportMenus() {
    this.exportMenus.forEach(wrap => {
      const menu = wrap.querySelector('.editor-export-menu');
      const toggle = wrap.querySelector('.editor-export-toggle');
      if (menu) menu.hidden = true;
      toggle?.setAttribute('aria-expanded', 'false');
    });
  }

  openPublicationExport(target, format) {
    const project = window.appState.getActiveProject();
    if (!project) return;
    this.pendingExport = { target, format };
    const settings = { ...this.defaultPublicationSettings(), ...(project.publicationSettings || {}) };
    const values = {
      trim: settings.trim, font: settings.font, fontSize: settings.fontSize, leading: settings.leading,
      margin: settings.margin, gutter: settings.gutter, author: settings.author, publisher: settings.publisher,
      year: settings.year, subtitle: settings.subtitle, edition: settings.edition, isbn: settings.isbn, dedication: settings.dedication, epigraph: settings.epigraph, copyright: settings.copyright,
      pageNumbers: settings.pageNumbers, runningHeader: settings.runningHeader, toc: settings.toc, chapterBreak: settings.chapterBreak
    };
    Object.entries(values).forEach(([key, value]) => {
      const field = document.getElementById(`publication-${key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`);
      if (!field) return;
      if (field.type === 'checkbox') field.checked = Boolean(value);
      else field.value = value ?? '';
    });
    const bookOnly = this.publicationModal?.querySelectorAll('.publication-book-only') || [];
    bookOnly.forEach(element => { element.hidden = target !== 'book'; });
    const formatLabel = format === 'pdf' ? 'PDF' : 'Word (.docx)';
    const targetLabel = target === 'book' ? 'livro inteiro' : 'capítulo atual';
    document.getElementById('publication-export-scope').textContent = `Preparando ${targetLabel} para exportar em ${formatLabel}.`;
    document.getElementById('btn-confirm-publication-export').textContent = `Gerar ${format === 'pdf' ? 'PDF' : 'Word'}`;
    this.publicationModal?.classList.add('active');
    this.publicationModal?.setAttribute('aria-hidden', 'false');
    document.getElementById('publication-trim')?.focus();
  }

  closePublicationExport() {
    this.publicationModal?.classList.remove('active');
    this.publicationModal?.setAttribute('aria-hidden', 'true');
    this.pendingExport = null;
  }

  defaultPublicationSettings() {
    return { trim: 'a5', font: 'literary', fontSize: '11', leading: '1.5', margin: '2', gutter: '0.5', author: '', publisher: '', year: String(new Date().getFullYear()), subtitle: '', edition: '', isbn: '', dedication: '', epigraph: '', copyright: '', pageNumbers: true, runningHeader: true, toc: true, chapterBreak: true };
  }

  readPublicationSettings() {
    const defaults = this.defaultPublicationSettings();
    const get = key => document.getElementById(`publication-${key}`);
    const number = (key, min, max, fallback) => {
      const value = Number(get(key)?.value);
      return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : Number(fallback);
    };
    return {
      trim: get('trim')?.value || defaults.trim,
      font: get('font')?.value || defaults.font,
      fontSize: get('font-size')?.value || defaults.fontSize,
      leading: get('leading')?.value || defaults.leading,
      margin: number('margin', 1, 4, defaults.margin),
      gutter: number('gutter', 0, 2.5, defaults.gutter),
      author: get('author')?.value.trim() || '', publisher: get('publisher')?.value.trim() || '',
      year: get('year')?.value.trim() || defaults.year, subtitle: get('subtitle')?.value.trim() || '',
      edition: get('edition')?.value.trim() || '', isbn: get('isbn')?.value.trim() || '', dedication: get('dedication')?.value.trim() || '',
      epigraph: get('epigraph')?.value.trim() || '', copyright: get('copyright')?.value.trim() || '',
      pageNumbers: Boolean(get('page-numbers')?.checked), runningHeader: Boolean(get('running-header')?.checked),
      toc: Boolean(get('toc')?.checked), chapterBreak: Boolean(get('chapter-break')?.checked)
    };
  }

  openPublicationPreview() {
    const pending = this.pendingExport;
    if (!pending || !this.publicationPreviewFrame) return;
    const settings = this.readPublicationSettings();
    const parts = this.buildExportParts(pending.target, settings);
    if (!parts) return;
    this.publicationPreviewFrame.srcdoc = this.buildExportHtml(parts.title, parts.content, { ...settings, hideFirstPage: parts.isBook });
    this.publicationPreviewModal?.classList.add('active');
    this.publicationPreviewModal?.setAttribute('aria-hidden', 'false');
  }

  closePublicationPreview() {
    this.publicationPreviewModal?.classList.remove('active');
    this.publicationPreviewModal?.setAttribute('aria-hidden', 'true');
    if (this.publicationPreviewFrame) this.publicationPreviewFrame.srcdoc = '';
  }

  async handleImageDrop(event) {
    if (event.dataTransfer?.types?.includes('Files')) event.preventDefault();
    const files = [...(event.dataTransfer?.files || [])].filter(file =>
      file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg|avif)$/i.test(file.name || '')
    );
    this.contentEditable.classList.remove('is-image-drag-over');
    if (!files.length) return;
    const imageSources = await Promise.all(files.map(file => this.getDroppedImageUrl(file)));
    const range = document.caretRangeFromPoint?.(event.clientX, event.clientY);
    const selection = window.getSelection();
    if (range && this.contentEditable.contains(range.commonAncestorContainer)) {
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      const endRange = document.createRange();
      endRange.selectNodeContents(this.contentEditable);
      endRange.collapse(false);
      selection.removeAllRanges();
      selection.addRange(endRange);
    }
    this.contentEditable.focus();
    for (const src of imageSources) {
      document.execCommand('insertImage', false, src);
    }
    this.updateStats();
    this.triggerAutoSave();
  }

  getDroppedImageUrl(file) {
    try {
      if (window.nativeAPI?.getDroppedFileUrl) return Promise.resolve(window.nativeAPI.getDroppedFileUrl(file));
    } catch (error) {
      console.warn('Falha ao acessar caminho da imagem; usando uma cópia incorporada.', error);
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
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

  applyFont(fontName) {
    const families = {
      lora: '"Lora", Georgia, serif',
      inter: '"Inter", Arial, sans-serif',
      atkinson: '"Atkinson Hyperlegible", Arial, sans-serif',
      opendyslexic: '"OpenDyslexic", "Comic Sans MS", sans-serif',
      lexend: '"Lexend", Arial, sans-serif',
      merriweather: '"Merriweather", Georgia, serif',
      playfair: '"Playfair Display", Georgia, serif',
      'eb-garamond': '"EB Garamond", Georgia, serif',
      cormorant: '"Cormorant Garamond", Georgia, serif',
      cinzel: '"Cinzel", Georgia, serif',
      montserrat: '"Montserrat", Arial, sans-serif',
      nunito: '"Nunito", Arial, sans-serif',
      roboto: '"Roboto", Arial, sans-serif',
      'open-sans': '"Open Sans", Arial, sans-serif',
      'fira-sans': '"Fira Sans", Arial, sans-serif',
      georgia: 'Georgia, serif',
      arial: 'Arial, sans-serif',
      verdana: 'Verdana, sans-serif',
      trebuchet: '"Trebuchet MS", sans-serif',
      times: '"Times New Roman", serif',
      courier: '"Courier New", monospace',
      'roboto-mono': '"Roboto Mono", monospace'
    };
    const selectedFont = Object.hasOwn(families, fontName) ? fontName : 'lora';
    this.currentFont = selectedFont;
    localStorage.setItem('scryba_editor_font', selectedFont);
    const family = families[selectedFont];
    if (this.contentEditable) this.contentEditable.style.fontFamily = family;
    if (this.inputTitle) this.inputTitle.style.fontFamily = family;
    if (this.fontSelect) this.fontSelect.value = selectedFont;
  }

  // Carrega os dados do projeto ativo
  loadActiveProjectData() {
    const proj = window.appState.getActiveProject();
    if (!proj) return;

    if (!proj.chapters || proj.chapters.length === 0) {
      proj.chapters = [{ id: 'ch-1', title: 'Capítulo 1', content: '<p></p>', wordCount: 0, status: 'draft' }];
    }

    const projectChanged = this.loadedProjectId !== proj.id;
    if (projectChanged || !this.activeChapterId || !proj.chapters.find(c => c.id === this.activeChapterId)) {
      this.activeChapterId = proj.chapters[0].id;
    }

    this.loadedProjectId = proj.id;
    this.renderChaptersList();
    const activeChapter = proj.chapters.find(chapter => chapter.id === this.activeChapterId);
    const contentChanged = activeChapter && this.contentEditable && this.contentEditable.innerHTML !== (activeChapter.content || '<p></p>');
    const titleChanged = activeChapter && this.inputTitle && this.inputTitle.value !== (activeChapter.title || '');
    if (projectChanged || contentChanged || titleChanged) this.loadCurrentChapter();
  }

  // Renderiza a lista lateral com Drag & Drop, Status e Ações
  renderChaptersList() {
    const proj = window.appState.getActiveProject();
    if (!proj || !this.chapterListEl) return;

    this.chapterListEl.innerHTML = proj.chapters.map((ch, index) => {
      const isActive = ch.id === this.activeChapterId;
      const count = ch.wordCount || 0;
      const status = ch.status || 'draft';

      let statusLabel = `${iconSvg('note')} Rascunho`;
      let statusClass = 'status-draft';
      if (status === 'review') {
        statusLabel = `${iconSvg('search')} Em Revisão`;
        statusClass = 'status-review';
      } else if (status === 'done') {
        statusLabel = `${iconSvg('check')} Finalizado`;
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
              <button type="button" class="btn-chapter-action btn-rename-ch" data-id="${ch.id}" title="Renomear capítulo" aria-label="Renomear capítulo">${iconSvg('edit')}</button>
              <button type="button" class="btn-chapter-action delete btn-delete-ch" data-id="${ch.id}" title="Excluir capítulo" aria-label="Excluir capítulo">${iconSvg('trash')}</button>
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

    return window.appState.updateActiveProject({ chapters: proj.chapters });
  }

  triggerAutoSave() {
    window.appState?.setSaveStatus('pending');
    clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.saveCurrentChapterDirectly();
      this.renderChaptersList();
    }, 400);
  }

  async openSaveHistory() {
    const project = window.appState.getActiveProject();
    if (!project?.folderPath || !window.nativeAPI?.listProjectVersions) {
      window.alert('O histórico de versões fica disponível para projetos salvos na pasta do Scryba.');
      return;
    }
    this.saveHistoryModal?.classList.add('active');
    this.saveHistoryModal?.setAttribute('aria-hidden', 'false');
    if (this.saveHistoryList) this.saveHistoryList.innerHTML = '<p class="save-history-message">Carregando versões…</p>';
    try {
      const result = await window.nativeAPI.listProjectVersions(project.folderPath);
      if (!result?.success) throw new Error(result?.error || 'Não foi possível carregar o histórico.');
      if (!result.versions?.length) {
        this.saveHistoryList.innerHTML = '<p class="save-history-message">Ainda não há versões anteriores. O histórico começa a ser criado conforme você salva alterações.</p>';
        return;
      }
      this.saveHistoryList.innerHTML = result.versions.map(version => {
        const date = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(version.savedAt));
        return `<article class="save-history-entry"><div><strong>${escapeHtml(version.title)}</strong><span>${date} · ${version.chapterCount} capítulo(s)</span></div><button type="button" class="btn btn-secondary" data-save-version="${escapeHtml(version.fileName)}">Restaurar</button></article>`;
      }).join('');
    } catch (error) {
      this.saveHistoryList.innerHTML = `<p class="save-history-message has-error">${escapeHtml(error.message)}</p>`;
    }
  }

  closeSaveHistory() {
    this.saveHistoryModal?.classList.remove('active');
    this.saveHistoryModal?.setAttribute('aria-hidden', 'true');
  }

  async restoreSaveVersion(fileName) {
    const project = window.appState.getActiveProject();
    if (!project?.folderPath || !window.nativeAPI?.restoreProjectVersion) return;
    if (!window.confirm('Restaurar esta versão? O estado atual será guardado no histórico antes da recuperação.')) return;
    try {
      const result = await window.nativeAPI.restoreProjectVersion({ folderPath: project.folderPath, fileName });
      if (!result?.success) throw new Error(result?.error || 'Não foi possível restaurar esta versão.');
      const projectIndex = window.appState.projects.findIndex(item => item.id === project.id);
      const restoredProject = { ...result.projectData, folderPath: project.folderPath };
      if (projectIndex >= 0) window.appState.projects[projectIndex] = restoredProject;
      window.appState.activeProject = restoredProject;
      window.appState.saveProjectsList();
      window.appState.setSaveStatus('saved', result.savedAt);
      window.appState.notify();
      this.closeSaveHistory();
    } catch (error) {
      window.alert(`Não foi possível restaurar a versão: ${error.message}`);
    }
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
  async generateExportDocument(target, format, settings) {
    const project = window.appState.getActiveProject();
    if (!project?.chapters?.length) return;
    this.saveCurrentChapterDirectly();
    const parts = this.buildExportParts(target, settings);
    if (!parts) return;
    const { title, content, fileBase, isBook } = parts;
    const html = this.buildExportHtml(title, content, { ...settings, hideFirstPage: isBook });
    if (format === 'word') {
      const model = this.buildDocxModel(content, settings);
      if (!window.nativeAPI?.exportWord) {
        alert('A exportação Word .docx está disponível na versão desktop do Scryba.');
        return;
      }
      try {
        const result = await window.nativeAPI.exportWord({
          title, fileName: `${fileBase}.docx`, blocks: model,
          settings: this.toDocxSettings(settings, isBook)
        });
        if (!result?.success && !result?.canceled) alert(`Não foi possível exportar o Word: ${result?.error || 'erro desconhecido'}`);
      } catch (error) {
        alert(`Não foi possível exportar o Word: ${error.message}`);
      }
      return;
    }
    if (format === 'pdf') {
      if (!window.nativeAPI?.exportPdf) {
        alert('A exportação em PDF está disponível na versão desktop do Scryba.');
        return;
      }
      try {
        const result = await window.nativeAPI.exportPdf({ html, fileName: `${fileBase}.pdf` });
        if (!result?.success && !result?.canceled) alert(`Não foi possível exportar o PDF: ${result?.error || 'erro desconhecido'}`);
      } catch (error) {
        alert(`Não foi possível exportar o PDF: ${error.message}`);
      }
    }
  }

  buildExportParts(target, settings) {
    const project = window.appState.getActiveProject();
    if (!project?.chapters?.length) return null;
    const current = project.chapters.find(chapter => chapter.id === this.activeChapterId);
    const isBook = target === 'book';
    if (!isBook && !current) return null;

    const safeTitle = String(project.title || 'Livro');
    let title;
    let content;
    let fileBase;
    if (isBook) {
      title = safeTitle;
      content = this.buildBookFrontMatter(project, settings) + project.chapters.map((chapter, index) =>
        `<section class="book-chapter" id="chapter-${index + 1}"><h1 class="chapter-heading">Capítulo ${index + 1}: ${escapeHtml(chapter.title || `Capítulo ${index + 1}`)}</h1>${this.sanitizeExportContent(chapter.content || '')}</section>`
      ).join('');
      fileBase = `${slugify(safeTitle || 'livro')}_completo`;
    } else {
      title = current.title || 'Capítulo';
      content = `<h1 class="chapter-title">${escapeHtml(title)}</h1>${this.sanitizeExportContent(current.content || '')}`;
      fileBase = slugify(title || 'capitulo');
    }
    return { title, content, fileBase, isBook };
  }

  buildBookFrontMatter(project, settings) {
    const title = escapeHtml(project.title || 'Livro');
    const author = escapeHtml(settings.author || '');
    let html = `<section class="book-cover"><div><h1 class="book-title">${title}</h1>`;
    if (settings.subtitle) html += `<p class="book-description">${escapeHtml(settings.subtitle)}</p>`;
    if (author) html += `<p class="book-author">${author}</p>`;
    if (settings.publisher) html += `<p class="book-publisher">${escapeHtml(settings.publisher)}</p>`;
    if (settings.year) html += `<p class="book-year">${escapeHtml(settings.year)}</p>`;
    html += '</div></section>';
    const copyright = settings.copyright || `© ${settings.year || new Date().getFullYear()}${settings.author ? ` ${settings.author}` : ''}. Todos os direitos reservados.`;
    html += `<section class="book-copyright"><p>${escapeHtml(copyright)}</p>${settings.publisher ? `<p>${escapeHtml(settings.publisher)}</p>` : ''}${settings.edition ? `<p>${escapeHtml(settings.edition)}</p>` : ''}${settings.isbn ? `<p>ISBN ${escapeHtml(settings.isbn)}</p>` : ''}</section>`;
    if (settings.dedication) html += `<section class="book-dedication"><p>${escapeHtml(settings.dedication).replace(/\n/g, '<br>')}</p></section>`;
    if (settings.epigraph) html += `<section class="book-epigraph"><blockquote>${escapeHtml(settings.epigraph).replace(/\n/g, '<br>')}</blockquote></section>`;
    if (settings.toc) {
      html += '<section class="book-toc"><h1>Sumário</h1><ol>' + project.chapters.map((chapter, index) =>
        `<li><a href="#chapter-${index + 1}">Capítulo ${index + 1}: ${escapeHtml(chapter.title || `Capítulo ${index + 1}`)}</a></li>`
      ).join('') + '</ol></section>';
    }
    return html;
  }

  buildExportHtml(title, content, settings) {
    const dimensions = {
      a5: [14.8, 21], 'six-by-nine': [15.24, 22.86], 'five-five-by-eight-five': [13.97, 21.59], a4: [21, 29.7]
    };
    const [width, height] = dimensions[settings.trim] || dimensions.a5;
    const fonts = { literary: 'Georgia, "Times New Roman", serif', garamond: '"EB Garamond", Garamond, serif', times: '"Times New Roman", serif', arial: 'Arial, sans-serif', dyslexic: '"OpenDyslexic", sans-serif' };
    const margin = Math.max(1, Number(settings.margin) || 2);
    const gutter = Math.max(0, Number(settings.gutter) || 0);
    const font = fonts[settings.font] || fonts.literary;
    const pageBoxes = `${settings.runningHeader ? '@top-center { content: "' + escapeCss(title) + '"; font: 8pt Arial, sans-serif; color: #777; }' : ''} ${settings.pageNumbers ? '@bottom-center { content: counter(page); font: 9pt Arial, sans-serif; color: #555; }' : ''}`;
    const pageRules = `@page { size: ${width}cm ${height}cm; margin: ${margin}cm; ${pageBoxes} } @page:left { margin-left: ${margin + gutter}cm; margin-right: ${margin}cm; } @page:right { margin-left: ${margin}cm; margin-right: ${margin + gutter}cm; }`;
    return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
      <style>
        ${pageRules}
        * { box-sizing: border-box; }
        body { color: #202124; font: ${Number(settings.fontSize) || 11}pt/${Number(settings.leading) || 1.5} ${font}; }
        h1, h2, h3 { line-height: 1.25; page-break-after: avoid; }
        h1 { font-size: 22pt; }
        h2 { font-size: 17pt; }
        h3 { font-size: 14pt; }
        p { margin: 0 0 0.8em; orphans: 3; widows: 3; }
        blockquote { margin: 1em 1.4em; padding-left: 1em; border-left: 3px solid #999; color: #555; }
        img { max-width: 100%; height: auto; }
        ul, ol { padding-left: 1.5em; }
        .book-cover, .book-copyright, .book-dedication, .book-epigraph { min-height: ${height - margin * 2}cm; display: flex; align-items: center; justify-content: center; text-align: center; page-break-after: always; }
        .book-title { margin: 0 0 1em; font-size: 30pt; }
        .book-author { margin-top: 3em; }
        .book-publisher, .book-year { margin: 0.4em; color: #555; }
        .book-description { color: #555; margin-bottom: 3em; }
        .book-toc { page-break-after: always; }
        .book-toc li { margin: 0.6em 0; }
        .book-toc a { color: inherit; text-decoration: none; }
        ${settings.chapterBreak ? '.book-toc + .book-chapter, .book-chapter + .book-chapter { page-break-before: always; }' : '.book-chapter { page-break-before: auto; }'}
        .chapter-heading { text-align: center; margin: 2em 0 2.5em; }
        .book-chapter p { text-indent: 1.2em; }
        .book-chapter p:first-of-type { text-indent: 0; }
        ${settings.hideFirstPage ? '@page:first { @top-center { content: none; } @bottom-center { content: none; } }' : ''}
        @media screen { body { width: ${width}cm; min-height: ${height}cm; margin: 24px auto; padding: ${margin}cm ${margin + gutter}cm; background: #fff; box-shadow: 0 6px 36px rgba(0,0,0,.24); } .book-cover, .book-copyright, .book-dedication, .book-epigraph, .book-toc { min-height: ${height - margin * 2}cm; } .book-chapter { min-height: ${height - margin * 2}cm; padding-top: 0.6cm; } .book-chapter + .book-chapter, .book-toc + .book-chapter { margin-top: 1.2cm; border-top: 1px dashed #c8c4bd; } }
      </style></head><body>${content}</body></html>`;
  }

  toDocxSettings(settings, isBook) {
    const dimensions = { a5: [14.8, 21], 'six-by-nine': [15.24, 22.86], 'five-five-by-eight-five': [13.97, 21.59], a4: [21, 29.7] };
    const [width, height] = dimensions[settings.trim] || dimensions.a5;
    return {
      widthTwips: Math.round(width / 2.54 * 1440), heightTwips: Math.round(height / 2.54 * 1440),
      marginTwips: Math.round((Number(settings.margin) || 2) / 2.54 * 1440),
      gutterTwips: Math.round((Number(settings.gutter) || 0) / 2.54 * 1440),
      font: ({ literary: 'Georgia', garamond: 'Garamond', times: 'Times New Roman', arial: 'Arial', dyslexic: 'OpenDyslexic' })[settings.font] || 'Georgia',
      fontSizeHalfPoints: Math.round((Number(settings.fontSize) || 11) * 2),
      leadingTwips: Math.round((Number(settings.leading) || 1.5) * 240),
      pageNumbers: Boolean(settings.pageNumbers), runningHeader: Boolean(settings.runningHeader), chapterBreak: Boolean(settings.chapterBreak), hideFirstPage: Boolean(isBook)
    };
  }

  buildDocxModel(html, settings) {
    const parsed = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
    const blocks = [];
    const getRuns = (node, marks = {}) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.nodeValue ? [{ text: node.nodeValue, ...marks }] : [];
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return [];
      if (node.tagName === 'BR') return [{ text: '\n', ...marks }];
      if (node.tagName === 'IMG') return [{ image: node.currentSrc || node.src, alt: node.alt || '', width: node.naturalWidth || node.width || 600, height: node.naturalHeight || node.height || 400, ...marks }];
      const style = node.style || {};
      const next = {
        ...marks,
        bold: marks.bold || ['B', 'STRONG'].includes(node.tagName) || style.fontWeight === 'bold' || Number(style.fontWeight) >= 600,
        italic: marks.italic || ['I', 'EM'].includes(node.tagName) || style.fontStyle === 'italic',
        underline: marks.underline || node.tagName === 'U' || style.textDecoration.includes('underline'),
        strike: marks.strike || ['S', 'STRIKE', 'DEL'].includes(node.tagName) || style.textDecoration.includes('line-through'),
        color: style.color || marks.color || '',
        highlight: style.backgroundColor || marks.highlight || '',
        size: style.fontSize || (node.getAttribute('size') ? ({ 1: '8pt', 2: '10pt', 3: '12pt', 4: '14pt', 5: '18pt', 6: '24pt', 7: '36pt' })[node.getAttribute('size')] : '') || marks.size || '',
        font: style.fontFamily || marks.font || '',
        href: marks.href || ''
      };
      const children = [...node.childNodes].flatMap(child => getRuns(child, node.tagName === 'A' ? { ...next, href: '' } : next));
      const link = node.tagName === 'A' ? node.getAttribute('href') : '';
      if (link && !link.startsWith('#')) children.push({ text: ` (${link})` });
      return children;
    };
    const visit = node => {
      [...node.childNodes].forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) {
          if (child.nodeValue.trim()) blocks.push({ type: 'paragraph', runs: [{ text: child.nodeValue.trim() }] });
          return;
        }
        if (child.nodeType !== Node.ELEMENT_NODE) return;
        const frontSection = child.classList.contains('book-cover') || child.classList.contains('book-copyright') || child.classList.contains('book-dedication') || child.classList.contains('book-epigraph') || child.classList.contains('book-toc');
        const chapterSection = child.classList.contains('book-chapter');
        if (blocks.length && (frontSection || (chapterSection && settings.chapterBreak))) {
          blocks.push({ type: 'pageBreak' });
        }
        if (child.classList.contains('book-toc')) {
          blocks.push({ type: 'toc' });
          return;
        }
        const tag = child.tagName;
        if (tag === 'IMG') {
          blocks.push({ type: 'paragraph', align: 'center', noIndent: true, runs: getRuns(child) });
          return;
        }
        if (['P', 'H1', 'H2', 'H3', 'H4', 'BLOCKQUOTE', 'LI'].includes(tag)) {
          const style = child.style || {};
          const blockType = tag === 'H1' && child.classList.contains('chapter-heading') ? 'chapterHeading'
            : tag === 'H1' && child.closest('.book-cover') ? 'title'
              : tag === 'H1' && child.closest('.book-toc') ? 'tocHeading'
                : tag.startsWith('H') ? 'heading' : tag === 'LI' ? 'listItem' : 'paragraph';
          const section = child.closest('.book-cover, .book-copyright, .book-dedication, .book-epigraph');
          const align = style.textAlign || (section ? 'center' : '');
          let runs = getRuns(child);
          if (tag === 'LI') {
            const siblings = [...child.parentElement.children].filter(item => item.tagName === 'LI');
            const prefix = child.parentElement.tagName === 'OL' ? `${siblings.indexOf(child) + 1}. ` : '• ';
            runs = [{ text: prefix }, ...runs];
          }
          const lineHeight = Number.parseFloat(style.lineHeight);
          const textIndent = Number.parseFloat(style.textIndent);
          const previousBlock = blocks[blocks.length - 1];
          const noIndent = Boolean(section) || (tag === 'P' && previousBlock?.type === 'chapterHeading');
          blocks.push({ type: blockType, level: Number(tag.slice(1)) || 1, align, indent: tag === 'BLOCKQUOTE', noIndent, lineHeight: Number.isFinite(lineHeight) ? lineHeight : null, textIndent: Number.isFinite(textIndent) ? textIndent : null, runs });
        } else if (tag === 'BR') blocks.push({ type: 'paragraph', runs: [{ text: '' }] });
        else visit(child);
      });
    };
    visit(parsed.body);
    return blocks;
  }

  sanitizeExportContent(content) {
    const parsed = new DOMParser().parseFromString(`<body>${content}</body>`, 'text/html');
    parsed.body.querySelectorAll('script,iframe,object,embed,form').forEach(element => element.remove());
    parsed.body.querySelectorAll('*').forEach(element => {
      [...element.attributes].forEach(attribute => {
        if (/^on/i.test(attribute.name) || ((attribute.name === 'href' || attribute.name === 'src') && /^\s*javascript:/i.test(attribute.value))) {
          element.removeAttribute(attribute.name);
        }
      });
    });
    return parsed.body.innerHTML;
  }

  downloadDocument(fileName, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
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

function escapeCss(str) {
  return String(str || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\r\n\f]/g, ' ');
}

window.EditorModule = EditorModule;
