class AudioPadModule {
  static builtInTracks = {
    music: [
      { id: 'builtin-music-taverna', name: 'Taverna ao entardecer', file: 'taverna-ao-entardecer.wav' },
      { id: 'builtin-music-forest', name: 'Floresta sob a névoa', file: 'floresta-sob-a-nevoa.wav' }
    ],
    effects: [
      { id: 'builtin-effect-sword', name: 'Choque de espadas', file: 'choque-de-espadas.wav' },
      { id: 'builtin-effect-magic', name: 'Feitiço arcano', file: 'feitico-arcano.wav' },
      { id: 'builtin-effect-thunder', name: 'Trovão distante', file: 'trovao-distante.wav' },
      { id: 'builtin-effect-door', name: 'Porta de madeira', file: 'porta-de-madeira.wav' },
      { id: 'builtin-effect-footsteps', name: 'Passos na pedra', file: 'passos-na-pedra.wav' }
    ]
  };

  constructor() {
    this.musicList = document.getElementById('audio-music-list');
    this.effectsList = document.getElementById('audio-effects-list');
    this.dropStatus = {
      music: document.getElementById('audio-music-drop-status'),
      effects: document.getElementById('audio-effects-drop-status')
    };
    this.dropStatusTimers = new Map();
    this.volumeInput = document.getElementById('audio-master-volume');
    this.volumeOutput = document.getElementById('audio-volume-value');
    this.playPauseButton = document.getElementById('audio-play-pause');
    this.progressInput = document.getElementById('audio-progress');
    this.currentTrackLabel = document.getElementById('audio-current-track');
    this.currentTimeLabel = document.getElementById('audio-current-time');
    this.durationLabel = document.getElementById('audio-duration');
    this.repeatButton = document.getElementById('audio-repeat');
    this.projectId = null;
    this.activeMusicId = null;
    this.musicPlayer = new Audio();
    this.musicPlayer.loop = true;
    this.repeat = true;
    this.effectPlayers = new Map();
    this.volume = Number(localStorage.getItem('scryba-audio-volume'));
    if (!Number.isFinite(this.volume)) this.volume = 65;
    this.musicPlayer.volume = this.volume / 100;
    this.bindEvents();
    this.applyVolume();
    this.updateVisibility();
    window.appState.subscribe(() => this.updateVisibility());
  }

  bindEvents() {
    document.querySelectorAll('#view-audio [data-audio-add]').forEach(button => {
      button.addEventListener('click', () => this.addAudio(button.dataset.audioAdd));
    });
    document.querySelectorAll('#view-audio [data-audio-panel]').forEach(panel => {
      const category = panel.dataset.audioPanel;
      panel.addEventListener('dragenter', event => {
        if (!this.hasDroppedFiles(event)) return;
        event.preventDefault();
        panel.classList.add('is-drop-target');
      });
      panel.addEventListener('dragover', event => {
        if (!this.hasDroppedFiles(event)) return;
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
        panel.classList.add('is-drop-target');
      });
      panel.addEventListener('dragleave', event => {
        if (event.relatedTarget && panel.contains(event.relatedTarget)) return;
        panel.classList.remove('is-drop-target');
      });
      panel.addEventListener('drop', event => {
        event.preventDefault();
        panel.classList.remove('is-drop-target');
        this.handleDrop(event.dataTransfer, category);
      });
    });
    this.volumeInput?.addEventListener('input', () => {
      this.volume = Number(this.volumeInput.value);
      localStorage.setItem('scryba-audio-volume', String(this.volume));
      this.applyVolume();
    });
    document.getElementById('audio-previous')?.addEventListener('click', () => this.playAdjacent(-1));
    document.getElementById('audio-next')?.addEventListener('click', () => this.playAdjacent(1));
    this.playPauseButton?.addEventListener('click', () => this.togglePlayback());
    this.repeatButton?.addEventListener('click', () => {
      this.repeat = !this.repeat;
      this.musicPlayer.loop = this.repeat;
      this.repeatButton.classList.toggle('is-active', this.repeat);
      this.repeatButton.setAttribute('aria-pressed', String(this.repeat));
      this.repeatButton.setAttribute('aria-label', `Repetir faixa: ${this.repeat ? 'ativado' : 'desativado'}`);
    });
    this.progressInput?.addEventListener('input', () => {
      if (!Number.isFinite(this.musicPlayer.duration)) return;
      this.musicPlayer.currentTime = (Number(this.progressInput.value) / 1000) * this.musicPlayer.duration;
    });
    ['timeupdate', 'loadedmetadata', 'durationchange', 'play', 'pause'].forEach(eventName => {
      this.musicPlayer.addEventListener(eventName, () => this.updatePlaybackControls());
    });
    this.musicPlayer.addEventListener('ended', () => {
      if (this.activeMusicId && !this.repeat) this.playAdjacent(1);
      this.renderTracks('music');
    });
  }

  updateVisibility() {
    const project = window.appState.getActiveProject();
    if (this.projectId !== project?.id) {
      this.stopAll();
      this.projectId = project?.id || null;
      this.render();
    }
    if (project?.type !== 'rpg') this.stopAll();
  }

  getProject() {
    return window.appState.getActiveProject();
  }

  getItems(category, project = this.getProject()) {
    const audioPad = project?.audioPad || {};
    const builtIns = AudioPadModule.builtInTracks[category].map(track => ({
      ...track,
      builtin: true,
      url: new URL(`assets/audio/${category}/${track.file}`, window.location.href).href
    }));
    return [...builtIns, ...(Array.isArray(audioPad[category]) ? audioPad[category] : [])];
  }

  render() {
    this.renderTracks('music');
    this.renderTracks('effects');
  }

  hasDroppedFiles(event) {
    return Boolean(event.dataTransfer && Array.from(event.dataTransfer.types || []).includes('Files'));
  }

  async handleDrop(dataTransfer, category) {
    const project = this.getProject();
    if (!project?.folderPath) {
      this.showDropStatus(category, 'Salve ou escolha uma pasta para o projeto antes de anexar áudios.');
      return;
    }
    const files = await this.collectDroppedFiles(dataTransfer);
    const audioFiles = files.filter(file => /\.(mp3|wav|ogg|oga|m4a|aac|flac|opus|wma)$/i.test(file.name || ''));
    const sourcePaths = [...new Set(audioFiles.map(file => window.nativeAPI?.getDroppedFilePath(file)).filter(Boolean))];
    if (!sourcePaths.length) {
      this.showDropStatus(category, 'Nenhum arquivo de áudio compatível encontrado; os demais arquivos foram ignorados.');
      return;
    }
    const result = await window.nativeAPI?.importDroppedProjectAudio({ folderPath: project.folderPath, category, sourcePaths });
    if (!result?.success) {
      this.showDropStatus(category, `Não foi possível importar os arquivos: ${result?.error || 'erro desconhecido'}`);
      return;
    }
    const imported = Array.isArray(result.imported) ? result.imported : [];
    if (!imported.length) {
      this.showDropStatus(category, 'Nenhum arquivo de áudio pôde ser anexado.');
      return;
    }
    const items = this.getItems(category, project).slice();
    imported.forEach((item, index) => {
      items.push({
        id: `audio-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${index}`,
        name: item.name,
        relativePath: item.relativePath
      });
    });
    const audioPad = { ...(project.audioPad || {}), [category]: items };
    await window.appState.updateActiveProject({ audioPad });
    this.renderTracks(category);
    const ignored = Math.max(0, files.length - imported.length);
    this.showDropStatus(category, `${imported.length} ${imported.length === 1 ? 'arquivo de áudio anexado' : 'arquivos de áudio anexados'}${ignored ? ` · ${ignored} ${ignored === 1 ? 'arquivo ignorado' : 'arquivos ignorados'}` : ''}.`);
  }

  async collectDroppedFiles(dataTransfer) {
    const items = Array.from(dataTransfer?.items || []);
    const entries = items.map(item => item.webkitGetAsEntry?.()).filter(Boolean);
    if (!entries.length) return Array.from(dataTransfer?.files || []);

    const files = [];
    const readEntry = entry => new Promise((resolve, reject) => {
      if (entry.isFile) {
        entry.file(file => { files.push(file); resolve(); }, reject);
        return;
      }
      if (!entry.isDirectory) { resolve(); return; }
      const reader = entry.createReader();
      const readBatch = () => reader.readEntries(async batch => {
        if (!batch.length) { resolve(); return; }
        try {
          await Promise.all(batch.map(readEntry));
          readBatch();
        } catch (error) { reject(error); }
      }, reject);
      readBatch();
    });

    try {
      await Promise.all(entries.map(readEntry));
    } catch (error) {
      console.warn('Não foi possível percorrer toda a pasta solta no pad de áudio:', error);
    }
    return files;
  }

  showDropStatus(category, message) {
    const element = this.dropStatus[category];
    if (!element) return;
    element.textContent = message;
    element.classList.add('is-visible');
    clearTimeout(this.dropStatusTimers.get(category));
    const timer = setTimeout(() => element.classList.remove('is-visible'), 6000);
    this.dropStatusTimers.set(category, timer);
  }

  async addAudio(category) {
    const project = this.getProject();
    if (!project?.folderPath) {
      alert('Salve ou escolha uma pasta para o projeto antes de anexar áudios.');
      return;
    }
    const result = await window.nativeAPI?.importProjectAudio({ folderPath: project.folderPath, category });
    if (result?.canceled) return;
    if (!result?.success) {
      alert(`Não foi possível adicionar o áudio: ${result?.error || 'erro desconhecido'}`);
      return;
    }
    const items = this.getItems(category, project).slice();
    items.push({ id: `audio-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: result.name, relativePath: result.relativePath });
    const audioPad = { ...(project.audioPad || {}), [category]: items };
    await window.appState.updateActiveProject({ audioPad });
    this.renderTracks(category);
  }

  async resolveUrl(item, project) {
    if (item?.builtin) return item.url;
    if (!project?.folderPath || !item?.relativePath) return null;
    const result = await window.nativeAPI?.resolveProjectAudio({ folderPath: project.folderPath, relativePath: item.relativePath });
    return result?.success ? result.fileUrl : null;
  }

  async renderTracks(category) {
    const list = category === 'music' ? this.musicList : this.effectsList;
    const project = this.getProject();
    if (!list) return;
    const items = this.getItems(category, project);
    if (!items.length) {
      list.innerHTML = `<li class="audio-track-empty">${category === 'music' ? 'Adicione faixas para ambientar a sessão.' : 'Adicione efeitos sonoros para disparar durante a sessão.'}</li>`;
      return;
    }
    list.replaceChildren();
    const projectId = project?.id;
    for (const item of items) {
      const url = await this.resolveUrl(item, project);
      if (projectId !== this.getProject()?.id) return;
      const row = document.createElement('li');
      row.className = `audio-track-item${category === 'music' && this.activeMusicId === item.id && !this.musicPlayer.paused ? ' is-playing' : ''}`;
      const playButton = document.createElement('button');
      playButton.type = 'button';
      playButton.className = 'audio-track-play';
      playButton.setAttribute('aria-label', `${category === 'music' && this.activeMusicId === item.id && !this.musicPlayer.paused ? 'Pausar' : 'Tocar'} ${item.name}`);
      playButton.textContent = category === 'music' && this.activeMusicId === item.id && !this.musicPlayer.paused ? 'Ⅱ' : '▶';
      playButton.disabled = !url;
      playButton.addEventListener('click', () => category === 'music' ? this.toggleMusic(item, url) : this.playEffect(item, url));

      const info = document.createElement('div');
      info.className = 'audio-track-info';
      const name = document.createElement('div');
      name.className = 'audio-track-name';
      name.textContent = item.name || 'Áudio sem nome';
      name.title = item.name || '';
      const state = document.createElement('small');
      state.className = 'audio-track-state';
      state.textContent = !url ? 'Arquivo não encontrado' : category === 'music' ? (this.activeMusicId === item.id && !this.musicPlayer.paused ? 'Tocando em loop' : 'Faixa de ambientação') : 'Efeito sonoro';
      info.append(name, state);

      row.append(playButton, info);
      if (!item.builtin) {
        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'audio-track-remove';
        removeButton.setAttribute('aria-label', `Remover ${item.name}`);
        removeButton.textContent = '×';
        removeButton.addEventListener('click', () => this.removeAudio(category, item.id));
        row.append(removeButton);
      }
      list.append(row);
    }
  }

  async toggleMusic(item, url) {
    if (!url) return;
    if (this.activeMusicId === item.id && !this.musicPlayer.paused) {
      this.musicPlayer.pause();
    } else {
      if (this.activeMusicId !== item.id || this.musicPlayer.src !== url) {
        this.musicPlayer.src = url;
        this.activeMusicId = item.id;
        this.currentTrackLabel.textContent = item.name || 'Áudio sem nome';
      }
      try { await this.musicPlayer.play(); } catch (error) { console.error('Não foi possível reproduzir a música:', error); }
    }
    this.renderTracks('music');
    this.updatePlaybackControls();
  }

  async togglePlayback() {
    if (this.musicPlayer.paused) {
      if (!this.activeMusicId) {
        const first = this.getItems('music')[0];
        if (!first) return;
        const url = await this.resolveUrl(first, this.getProject());
        await this.toggleMusic(first, url);
        return;
      }
      try { await this.musicPlayer.play(); } catch (error) { console.error('Não foi possível reproduzir a música:', error); }
    } else {
      this.musicPlayer.pause();
    }
    this.updatePlaybackControls();
    this.renderTracks('music');
  }

  async playAdjacent(direction) {
    const tracks = this.getItems('music');
    if (!tracks.length) return;
    const currentIndex = tracks.findIndex(track => track.id === this.activeMusicId);
    const nextIndex = currentIndex < 0
      ? (direction > 0 ? 0 : tracks.length - 1)
      : (currentIndex + direction + tracks.length) % tracks.length;
    const item = tracks[nextIndex];
    const url = await this.resolveUrl(item, this.getProject());
    if (!url) return;
    this.musicPlayer.src = url;
    this.activeMusicId = item.id;
    this.currentTrackLabel.textContent = item.name || 'Áudio sem nome';
    try { await this.musicPlayer.play(); } catch (error) { console.error('Não foi possível reproduzir a música:', error); }
    this.updatePlaybackControls();
    this.renderTracks('music');
  }

  updatePlaybackControls() {
    const duration = Number.isFinite(this.musicPlayer.duration) ? this.musicPlayer.duration : 0;
    const currentTime = Number.isFinite(this.musicPlayer.currentTime) ? this.musicPlayer.currentTime : 0;
    if (this.currentTrackLabel && this.activeMusicId) {
      const active = this.getItems('music').find(item => item.id === this.activeMusicId);
      if (active) this.currentTrackLabel.textContent = active.name || 'Áudio sem nome';
    }
    if (this.progressInput) {
      this.progressInput.value = String(duration ? Math.round(currentTime / duration * 1000) : 0);
      this.progressInput.disabled = !duration;
    }
    if (this.currentTimeLabel) this.currentTimeLabel.textContent = this.formatTime(currentTime);
    if (this.durationLabel) this.durationLabel.textContent = this.formatTime(duration);
    if (this.playPauseButton) {
      this.playPauseButton.innerHTML = this.musicPlayer.paused
        ? '<svg class="audio-transport-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>'
        : '<svg class="audio-transport-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM15 5h4v14h-4z"/></svg>';
      this.playPauseButton.setAttribute('aria-label', this.musicPlayer.paused ? 'Tocar' : 'Pausar');
      this.playPauseButton.title = this.musicPlayer.paused ? 'Tocar' : 'Pausar';
    }
  }

  formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const total = Math.floor(seconds);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  }

  playEffect(item, url) {
    if (!url) return;
    const current = this.effectPlayers.get(item.id);
    if (current) {
      current.pause();
      current.currentTime = 0;
      this.effectPlayers.delete(item.id);
    }
    const player = new Audio(url);
    player.volume = this.volume / 100;
    this.effectPlayers.set(item.id, player);
    player.addEventListener('ended', () => this.effectPlayers.delete(item.id), { once: true });
    player.play().catch(error => {
      this.effectPlayers.delete(item.id);
      console.error('Não foi possível reproduzir o efeito sonoro:', error);
    });
  }

  async removeAudio(category, id) {
    const project = this.getProject();
    const items = this.getItems(category, project);
    const item = items.find(entry => entry.id === id);
    if (!item) return;
    if (item.relativePath && project?.folderPath) {
      const removed = await window.nativeAPI?.removeProjectAudio({ folderPath: project.folderPath, relativePath: item.relativePath });
      if (!removed?.success) {
        alert(`Não foi possível remover o arquivo de áudio: ${removed?.error || 'erro desconhecido'}`);
        return;
      }
    }
    if (category === 'music' && this.activeMusicId === id) {
      this.musicPlayer.pause();
      this.musicPlayer.removeAttribute('src');
      this.activeMusicId = null;
      this.currentTrackLabel.textContent = 'Escolha uma música';
      this.updatePlaybackControls();
    }
    if (category === 'effects' && this.effectPlayers.has(id)) {
      this.effectPlayers.get(id).pause();
      this.effectPlayers.delete(id);
    }
    const audioPad = { ...(project.audioPad || {}), [category]: items.filter(entry => entry.id !== id) };
    await window.appState.updateActiveProject({ audioPad });
    this.renderTracks(category);
  }

  applyVolume() {
    if (this.volumeInput) this.volumeInput.value = String(this.volume);
    if (this.volumeOutput) this.volumeOutput.value = `${this.volume}%`;
    this.musicPlayer.volume = this.volume / 100;
    this.effectPlayers.forEach(player => { player.volume = this.volume / 100; });
  }

  stopAll() {
    this.musicPlayer.pause();
    this.musicPlayer.removeAttribute('src');
    this.activeMusicId = null;
    if (this.currentTrackLabel) this.currentTrackLabel.textContent = 'Escolha uma música';
    this.updatePlaybackControls();
    this.effectPlayers.forEach(player => player.pause());
    this.effectPlayers.clear();
  }
}

window.AudioPadModule = AudioPadModule;
