class TimelineModule {
  constructor() {
    this.track = document.getElementById('timeline-track');
    this.summary = document.getElementById('timeline-summary');
    this.modal = document.getElementById('modal-timeline-event');
    this.form = document.getElementById('form-timeline-event');
    this.order = document.getElementById('timeline-order');
    this.editingId = null;
    this.bindEvents();
    this.render();
  }

  getEvents() {
    const project = window.appState.getActiveProject();
    if (!project) return [];
    if (!Array.isArray(project.timeline)) project.timeline = [];
    return project.timeline;
  }

  bindEvents() {
    document.getElementById('btn-add-timeline-event')?.addEventListener('click', () => this.openModal());
    document.getElementById('btn-close-timeline-event')?.addEventListener('click', () => this.closeModal());
    document.getElementById('btn-cancel-timeline-event')?.addEventListener('click', () => this.closeModal());
    this.form?.addEventListener('submit', event => {
      event.preventDefault();
      this.saveEvent();
    });
    this.order?.addEventListener('change', () => {
      localStorage.setItem('scryba_timeline_order', this.order.value);
      this.render();
    });
    this.track?.addEventListener('click', event => {
      const action = event.target.closest('[data-timeline-action]');
      if (!action) return;
      if (action.dataset.timelineAction === 'new') this.openModal();
      if (action.dataset.timelineAction === 'edit') this.openModal(action.dataset.eventId);
      if (action.dataset.timelineAction === 'delete') this.deleteEvent(action.dataset.eventId);
    });
    this.modal?.addEventListener('click', event => {
      if (event.target === this.modal) this.closeModal();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && this.modal?.classList.contains('active')) this.closeModal();
    });
    const savedOrder = localStorage.getItem('scryba_timeline_order');
    if (this.order && (savedOrder === 'asc' || savedOrder === 'desc')) this.order.value = savedOrder;
    window.appState.subscribe(() => this.render());
  }

  openModal(eventId) {
    const item = this.getEvents().find(event => event.id === eventId);
    this.editingId = item ? item.id : null;
    this.form.reset();
    document.getElementById('timeline-event-id').value = item ? item.id : '';
    document.getElementById('timeline-event-title').value = item ? item.title : '';
    document.getElementById('timeline-event-date').value = item ? item.date : '';
    document.getElementById('timeline-event-category').value = item ? item.category || '' : '';
    document.getElementById('timeline-event-location').value = item ? item.location || '' : '';
    document.getElementById('timeline-event-people').value = item ? item.people || '' : '';
    document.getElementById('timeline-event-description').value = item ? item.description || '' : '';
    document.getElementById('timeline-event-modal-title').textContent = item ? 'Editar evento' : 'Adicionar evento';
    document.getElementById('btn-save-timeline-event').textContent = item ? 'Salvar alterações' : 'Salvar evento';
    this.modal.classList.add('active');
    this.modal.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => document.getElementById('timeline-event-title')?.focus());
  }

  saveEvent() {
    const project = window.appState.getActiveProject();
    if (!project) return;
    const events = this.getEvents();
    const id = this.editingId || ('event-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7));
    const existing = events.find(event => event.id === id);
    const item = {
      id,
      title: document.getElementById('timeline-event-title').value.trim(),
      date: document.getElementById('timeline-event-date').value,
      category: document.getElementById('timeline-event-category').value.trim(),
      location: document.getElementById('timeline-event-location').value.trim(),
      people: document.getElementById('timeline-event-people').value.trim(),
      description: document.getElementById('timeline-event-description').value.trim()
    };
    if (existing) Object.assign(existing, item);
    else events.push(item);
    window.appState.updateActiveProject({ timeline: events });
    this.closeModal();
  }

  deleteEvent(eventId) {
    const events = this.getEvents();
    const item = events.find(event => event.id === eventId);
    if (!item || !confirm('Excluir o evento "' + item.title + '" da linha do tempo?')) return;
    window.appState.updateActiveProject({ timeline: events.filter(event => event.id !== eventId) });
  }

  closeModal() {
    this.modal?.classList.remove('active');
    this.modal?.setAttribute('aria-hidden', 'true');
    this.editingId = null;
  }

  formatDate(value) {
    if (!value) return 'Data não informada';
    const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!iso) return escapeHtml(value);
    return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }

  dateSortKey(value) {
    const text = (value || '').trim();
    const iso = text.match(/^(-?\d{1,6})(?:-(\d{2})-(\d{2}))?$/);
    if (iso) return Number(iso[1]) * 10000 + Number(iso[2] || 0) * 100 + Number(iso[3] || 0);
    const dmy = text.match(/(\d{1,2})[/.](\d{1,2})[/.](-?\d{1,6})/);
    if (dmy) return Number(dmy[3]) * 10000 + Number(dmy[2]) * 100 + Number(dmy[1]);
    const year = text.match(/-?\d{1,6}/);
    return year ? Number(year[0]) * 10000 : null;
  }

  render() {
    if (!this.track) return;
    const events = this.getEvents().slice().sort((a, b) => {
      const aKey = this.dateSortKey(a.date);
      const bKey = this.dateSortKey(b.date);
      const comparison = aKey !== null && bKey !== null
        ? aKey - bKey
        : aKey !== null ? -1 : bKey !== null ? 1 : (a.date || '').localeCompare(b.date || '');
      return this.order?.value === 'desc' ? -comparison : comparison;
    });
    const count = events.length;
    if (this.summary) this.summary.textContent = count ? count + (count === 1 ? ' acontecimento' : ' acontecimentos') : 'Nenhum evento cadastrado';
    if (!count) {
      this.track.innerHTML = '<div class="organization-empty"><span class="organization-empty-icon">◷</span><h3>Conte a história em ordem</h3><p>Registre acontecimentos importantes e veja como eles se conectam ao longo do tempo.</p><button type="button" class="btn btn-primary" data-timeline-action="new">Adicionar primeiro evento</button></div>';
      return;
    }
    this.track.innerHTML = '<div class="timeline-axis" aria-hidden="true"></div>' + events.map((item, index) => {
      const position = index % 2 ? 'lower' : 'upper';
      return '<article class="timeline-event timeline-event-' + position + '" data-event-id="' + escapeHtml(item.id) + '">' +
        '<div class="timeline-event-content timeline-event-content-' + position + '">' +
          '<div class="timeline-event-date">' + this.formatDate(item.date) + '</div>' +
          '<div class="timeline-event-card">' +
          (item.category ? '<span class="timeline-event-category">' + escapeHtml(item.category) + '</span>' : '') +
          '<h3>' + escapeHtml(item.title) + '</h3>' +
          (item.description ? '<p>' + escapeHtml(item.description) + '</p>' : '') +
          (item.location ? '<div class="timeline-event-detail"><span>⌖</span>' + escapeHtml(item.location) + '</div>' : '') +
          (item.people ? '<div class="timeline-event-detail"><span>' + iconSvg('users') + '</span>' + escapeHtml(item.people) + '</div>' : '') +
          '<div class="timeline-event-actions">' +
            '<button type="button" data-timeline-action="edit" data-event-id="' + escapeHtml(item.id) + '">Editar</button>' +
            '<button type="button" data-timeline-action="delete" data-event-id="' + escapeHtml(item.id) + '">Excluir</button>' +
          '</div>' +
          '</div>' +
        '</div>' +
        '<span class="timeline-event-marker" aria-hidden="true"></span>' +
        '</article>';
    }).join('');
  }
}

window.TimelineModule = TimelineModule;
