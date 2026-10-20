/**
 * MÓDULO DE ANOTAÇÕES RÁPIDAS (BLOCO DE NOTAS SIMPLES E INDEPENDENTE)
 */

class NotesModule {
  constructor() {
    this.activeNoteId = null;
    this.saveTimeout = null;
    this.searchQuery = '';

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    this.notesListEl = document.getElementById('notes-list');
    this.btnNewNote = document.getElementById('btn-new-note');
    this.searchInput = document.getElementById('notes-search-input');
    this.titleField = document.getElementById('note-title-field');
    this.contentField = document.getElementById('note-content-field');
    this.btnDeleteNote = document.getElementById('btn-delete-current-note');
    this.saveStatusEl = document.getElementById('note-save-status');
  }

  bindEvents() {
    if (this.btnNewNote) {
      this.btnNewNote.addEventListener('click', () => this.handleNewNote());
    }

    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderNotesList();
      });
    }

    if (this.titleField) {
      this.titleField.addEventListener('input', () => this.triggerAutoSave());
    }

    if (this.contentField) {
      this.contentField.addEventListener('input', () => this.triggerAutoSave());
    }

    if (this.btnDeleteNote) {
      this.btnDeleteNote.addEventListener('click', () => this.handleDeleteCurrentNote());
    }

    window.appState.subscribe(() => {
      this.loadProjectNotes();
    });
  }

  loadProjectNotes() {
    const proj = window.appState.getActiveProject();
    if (!proj) return;

    if (!proj.notes || proj.notes.length === 0) {
      proj.notes = [
        {
          id: 'note-1',
          title: 'Primeira Anotação',
          content: 'Use este bloco para rabiscar ideias de cenas, ganchos de RPG, nomes de personagens ou lembretes rápidos!',
          updatedAt: new Date().toISOString()
        }
      ];
    }

    if (!this.activeNoteId || !proj.notes.find(n => n.id === this.activeNoteId)) {
      this.activeNoteId = proj.notes[0].id;
    }

    this.renderNotesList();
    this.loadCurrentNote();
  }

  renderNotesList() {
    const proj = window.appState.getActiveProject();
    if (!proj || !this.notesListEl) return;

    let notes = proj.notes || [];

    if (this.searchQuery) {
      notes = notes.filter(n =>
        n.title.toLowerCase().includes(this.searchQuery) ||
        (n.content && n.content.toLowerCase().includes(this.searchQuery))
      );
    }

    if (notes.length === 0) {
      this.notesListEl.innerHTML = `
        <div style="padding: 24px 12px; text-align: center; color: var(--text-faint); font-size: 0.8rem;">
          Nenhuma anotação encontrada.
        </div>
      `;
      return;
    }

    this.notesListEl.innerHTML = notes.map(note => {
      const isActive = note.id === this.activeNoteId;
      const preview = note.content ? note.content.replace(/\n/g, ' ').substring(0, 48) : 'Anotação vazia...';
      const date = new Date(note.updatedAt || Date.now()).toLocaleDateString();

      return `
        <div class="note-item-card ${isActive ? 'active' : ''}" data-id="${note.id}">
          <div class="note-item-title">${escapeHtml(note.title || 'Sem título')}</div>
          <div class="note-item-preview">${escapeHtml(preview)}</div>
          <div class="note-item-date">${date}</div>
        </div>
      `;
    }).join('');

    this.notesListEl.querySelectorAll('.note-item-card').forEach(card => {
      card.addEventListener('click', () => {
        this.saveCurrentNoteDirectly();
        this.activeNoteId = card.dataset.id;
        this.renderNotesList();
        this.loadCurrentNote();
      });
    });
  }

  loadCurrentNote() {
    const proj = window.appState.getActiveProject();
    if (!proj) return;
    const current = (proj.notes || []).find(n => n.id === this.activeNoteId);
    if (!current) return;

    if (this.titleField) this.titleField.value = current.title || '';
    if (this.contentField) this.contentField.value = current.content || '';
  }

  saveCurrentNoteDirectly() {
    const proj = window.appState.getActiveProject();
    if (!proj || !proj.notes) return;
    const current = proj.notes.find(n => n.id === this.activeNoteId);
    if (!current) return;

    current.title = this.titleField ? this.titleField.value.trim() || 'Sem título' : current.title;
    current.content = this.contentField ? this.contentField.value : current.content;
    current.updatedAt = new Date().toISOString();

    window.appState.updateActiveProject({ notes: proj.notes });
  }

  triggerAutoSave() {
    if (this.saveStatusEl) {
      this.saveStatusEl.textContent = 'Salvando...';
      this.saveStatusEl.style.color = '#f59e0b';
    }

    clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.saveCurrentNoteDirectly();
      this.renderNotesList();
      if (this.saveStatusEl) {
        this.saveStatusEl.textContent = '● Salvo';
        this.saveStatusEl.style.color = '#10b981';
      }
    }, 400);
  }

  handleNewNote() {
    const proj = window.appState.getActiveProject();
    if (!proj) return;

    if (!proj.notes) proj.notes = [];

    const newNote = {
      id: 'note-' + Date.now(),
      title: `Nova Nota ${proj.notes.length + 1}`,
      content: '',
      updatedAt: new Date().toISOString()
    };

    proj.notes.unshift(newNote);
    this.activeNoteId = newNote.id;
    window.appState.updateActiveProject({ notes: proj.notes });
    this.renderNotesList();
    this.loadCurrentNote();
    if (this.titleField) this.titleField.focus();
  }

  handleDeleteCurrentNote() {
    const proj = window.appState.getActiveProject();
    if (!proj || !proj.notes) return;

    if (proj.notes.length <= 1) {
      alert('Você precisa ter pelo menos uma anotação.');
      return;
    }

    const current = proj.notes.find(n => n.id === this.activeNoteId);
    const title = current ? current.title : 'esta nota';

    if (confirm(`Deseja excluir a anotação "${title}"?`)) {
      proj.notes = proj.notes.filter(n => n.id !== this.activeNoteId);
      this.activeNoteId = proj.notes[0].id;
      window.appState.updateActiveProject({ notes: proj.notes });
      this.renderNotesList();
      this.loadCurrentNote();
    }
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

window.NotesModule = NotesModule;

