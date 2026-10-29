class DiceRollerModule {
  constructor() {
    this.root = document.getElementById('dice-roller');
    this.panel = document.getElementById('dice-roller-panel');
    this.openButton = document.getElementById('btn-open-dice');
    this.closeButton = document.getElementById('btn-dice-close');
    this.rollButton = document.getElementById('btn-roll-dice');
    this.clearButton = document.getElementById('btn-clear-dice');
    this.result = document.getElementById('dice-result');
    this.resultTotal = document.getElementById('dice-result-total');
    this.resultBreakdown = document.getElementById('dice-result-breakdown');
    this.historyList = document.getElementById('dice-history');
    this.historyOpenButton = document.getElementById('btn-open-dice-history');
    this.historyDialog = document.getElementById('dice-history-dialog');
    this.historyCloseButton = document.getElementById('btn-close-dice-history');
    this.historyFullList = document.getElementById('dice-history-full');
    this.history = [];
    this.selectedDice = new Map();
    this.projectId = null;
    this.bindEvents();
    this.updateVisibility();
    window.appState.subscribe(() => this.updateVisibility());
  }

  bindEvents() {
    this.openButton?.addEventListener('click', () => this.toggle());
    this.closeButton?.addEventListener('click', () => this.close());
    this.rollButton?.addEventListener('click', () => this.roll());
    this.root?.querySelectorAll('[data-dice-sides]').forEach(button => {
      button.addEventListener('click', () => this.appendDie(Number(button.dataset.diceSides)));
    });
    this.clearButton?.addEventListener('click', () => this.clearSelection());
    this.historyOpenButton?.addEventListener('click', () => this.openHistory());
    this.historyCloseButton?.addEventListener('click', () => this.closeHistory());
    this.historyDialog?.addEventListener('click', event => {
      if (event.target === this.historyDialog) this.closeHistory();
    });
    document.addEventListener('click', event => {
      if (this.isOpen() && !this.root?.contains(event.target)) this.close();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && this.isOpen()) this.close();
      if (event.key === 'Escape' && this.historyDialog && !this.historyDialog.hidden) this.closeHistory();
    });
  }

  updateVisibility() {
    const project = window.appState.getActiveProject();
    const isHome = window.appRouter?.appRoot?.classList.contains('in-home');
    const isRpg = project?.type === 'rpg' && !isHome;
    if (this.projectId !== project?.id) {
      this.projectId = project?.id || null;
      this.history = [];
      this.renderHistory();
      this.closeHistory();
    }
    if (this.root) this.root.hidden = !isRpg;
    if (!isRpg) this.close();
  }

  isOpen() {
    return Boolean(this.panel && !this.panel.hidden);
  }

  toggle() {
    if (this.isOpen()) this.close();
    else this.open();
  }

  open() {
    if (!this.panel || !this.root || this.root.hidden) return;
    this.clearSelection();
    this.panel.hidden = false;
    this.openButton?.setAttribute('aria-expanded', 'true');
  }

  close() {
    if (this.panel) this.panel.hidden = true;
    this.openButton?.setAttribute('aria-expanded', 'false');
  }

  openHistory() {
    if (!this.historyDialog || this.history.length < 3) return;
    this.historyDialog.hidden = false;
    this.renderFullHistory();
    this.historyCloseButton?.focus();
  }

  closeHistory() {
    if (this.historyDialog) this.historyDialog.hidden = true;
  }

  appendDie(sides) {
    if (![4, 6, 8, 10, 12, 20, 100].includes(sides)) return;
    const current = this.selectedDice.get(sides) || 0;
    if (current >= 100) return;
    this.selectedDice.set(sides, current + 1);
    this.renderSelection();
  }

  clearSelection() {
    this.selectedDice.clear();
    this.renderSelection();
    this.result?.classList.remove('is-error', 'is-rolling');
    if (this.resultTotal) this.resultTotal.textContent = '—';
    if (this.resultBreakdown) this.resultBreakdown.textContent = 'Nenhum dado selecionado.';
  }

  renderSelection() {
    this.root?.querySelectorAll('[data-dice-sides]').forEach(button => {
      const count = this.selectedDice.get(Number(button.dataset.diceSides)) || 0;
      const badge = button.querySelector('.dice-count');
      if (badge) badge.textContent = String(count);
      button.classList.toggle('is-selected', count > 0);
      button.setAttribute('aria-pressed', String(count > 0));
      button.setAttribute('aria-label', `Adicionar dado de ${button.dataset.diceSides} lados. Selecionados: ${count}`);
    });
  }

  roll() {
    const selected = [...this.selectedDice.entries()].filter(([, count]) => count > 0).sort((a, b) => a[0] - b[0]);
    this.result?.classList.remove('is-error', 'is-rolling');
    if (!selected.length) {
      this.result?.classList.add('is-error');
      this.resultTotal.textContent = '—';
      this.resultBreakdown.textContent = 'Selecione pelo menos um dado para rolar.';
      return;
    }
    try {
      const groups = selected.map(([sides, count]) => {
        const values = Array.from({ length: count }, () => this.randomInt(sides));
        return { sides, count, values, subtotal: values.reduce((sum, value) => sum + value, 0) };
      });
      const total = groups.reduce((sum, group) => sum + group.subtotal, 0);
      const expression = groups.map(group => `${group.count}d${group.sides}`).join(' + ');
      const breakdown = groups.map(group => `${group.count}d${group.sides}: ${group.values.join(', ')}`).join(' · ');
      this.resultTotal.textContent = String(total);
      this.resultBreakdown.textContent = `${breakdown} = ${total}`;
      this.history.unshift({ expression, total, groups, timestamp: Date.now() });
      this.renderHistory();
    } catch (error) {
      this.result?.classList.add('is-error');
      this.resultTotal.textContent = '—';
      this.resultBreakdown.textContent = error.message;
    }
  }

  randomInt(max) {
    const cryptoApi = window.crypto;
    if (!cryptoApi?.getRandomValues) throw new Error('O gerador seguro de números aleatórios não está disponível.');
    const range = 0x100000000;
    const limit = Math.floor(range / max) * max;
    const buffer = new Uint32Array(1);
    let value;
    do {
      cryptoApi.getRandomValues(buffer);
      value = buffer[0];
    } while (value >= limit);
    return (value % max) + 1;
  }
  renderHistory() {
    if (!this.historyList) return;
    if (this.historyOpenButton) this.historyOpenButton.hidden = this.history.length < 3;
    if (!this.history.length) {
      this.historyList.innerHTML = '<li class="dice-history-empty">As rolagens desta sessão aparecerão aqui.</li>';
      this.renderFullHistory();
      return;
    }
    this.historyList.innerHTML = this.history.slice(0, 2).map(entry =>
      `<li><span>${entry.expression}</span><strong>${entry.total}</strong></li>`
    ).join('');
    this.renderFullHistory();
  }

  renderFullHistory() {
    if (!this.historyFullList) return;
    if (!this.history.length) {
      this.historyFullList.innerHTML = '<li class="dice-history-empty-full">Ainda não há rolagens nesta sessão.</li>';
      return;
    }
    this.historyFullList.innerHTML = this.history.map((entry, index) => {
      const date = new Date(entry.timestamp || Date.now());
      const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const details = (entry.groups || []).map(group =>
        `<div class="dice-history-detail"><span>${group.count} × d${group.sides}</span><span>${group.values.join(' · ')}</span></div>`
      ).join('');
      return `<li class="dice-history-entry"><header><span>Rolagem ${this.history.length - index} <time>${time}</time></span><strong>${entry.total}</strong></header>${details}</li>`;
    }).join('');
  }
}

window.DiceRollerModule = DiceRollerModule;
