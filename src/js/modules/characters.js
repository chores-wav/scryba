/**
 * MÓDULO DE PERSONAGENS — GALERIA COM RETRATOS E UPLOAD DE IMAGEM
 * Galeria estilo "capas de livro": retrato como capa + nome abaixo.
 * Suporte a upload de imagem local (via Electron) e URL remota.
 */

const CHARACTER_SHEET_SYSTEMS = {
  dnd5e: {
    label: 'D&D 5e',
    columns: [
      { title: 'Atributos & perícias', sections: [
        { title: 'Atributos', kind: 'stats', fields: [['Força', 'strength'], ['Destreza', 'dexterity'], ['Constituição', 'constitution'], ['Inteligência', 'intelligence'], ['Sabedoria', 'wisdom'], ['Carisma', 'charisma']] },
        { title: 'Perícias', kind: 'skills', fields: ['Acrobacia|dexterity', 'Adestrar Animais|wisdom', 'Arcanismo|intelligence', 'Atletismo|strength', 'Atuação|charisma', 'Enganação|charisma', 'Furtividade|dexterity', 'História|intelligence', 'Intimidação|charisma', 'Intuição|wisdom', 'Investigação|intelligence', 'Medicina|wisdom', 'Natureza|intelligence', 'Percepção|wisdom', 'Persuasão|charisma', 'Prestidigitação|dexterity', 'Religião|intelligence', 'Sobrevivência|wisdom'] }
      ] },
      { title: 'Identidade & combate', sections: [
        { title: 'Identificação', fields: [['Classe', 'className'], ['Nível', 'level', 'number'], ['Antecedente', 'background'], ['Raça', 'race']] },
        { title: 'Combate', fields: [['Classe de Armadura', 'armorClass', 'number'], ['Iniciativa', 'initiative', 'number'], ['Deslocamento', 'speed', 'number'], ['PV atuais', 'hpCurrent', 'number'], ['PV máximos', 'hpMax', 'number'], ['PV temporários', 'hpTemp', 'number']] },
        { title: 'Ataques & conjuração', fields: [['Ataques', 'attacks', 'textarea'], ['Atributo de conjuração', 'spellAbility'], ['CD para resistir', 'spellSaveDc', 'number'], ['Bônus de ataque mágico', 'spellAttackBonus', 'number']] }
      ] },
      { title: 'História & recursos', sections: [
        { title: 'Traços & motivações', fields: [['Traços de personalidade', 'personality', 'textarea'], ['Ideais', 'ideals', 'textarea'], ['Vínculos', 'bonds', 'textarea'], ['Fraquezas', 'flaws', 'textarea']] },
        { title: 'Equipamento & magias', fields: [['Equipamento', 'equipment', 'textarea'], ['Truques', 'spellsCantrips', 'textarea'], ['Magias de 1º círculo', 'spells1', 'textarea'], ['Magias de 2º círculo', 'spells2', 'textarea'], ['Magias de 3º círculo', 'spells3', 'textarea'], ['Magias de 4º círculo ou maior', 'spellsHigher', 'textarea']] }
      ] }
    ]
  },
  daggerheart: {
    label: 'Daggerheart', columns: [
      { title: 'Identidade & atributos', sections: [
        { title: 'Identificação', fields: [['Name', 'name'], ['Pronouns', 'pronouns'], ['Heritage', 'heritage'], ['Class', 'className'], ['Subclass', 'subclass'], ['Level', 'level', 'number']] },
        { title: 'Attributes', kind: 'stats', fields: [['Agility', 'agility'], ['Strength', 'strength'], ['Finesse', 'finesse'], ['Instinct', 'instinct'], ['Presence', 'presence'], ['Knowledge', 'knowledge']] }
      ] },
      { title: 'Sobrevivência', sections: [
        { title: 'Health & damage thresholds', fields: [['Health atual', 'healthCurrent', 'number'], ['Health máximo', 'healthMax', 'number'], ['Minor threshold', 'thresholdMinor', 'number'], ['Major threshold', 'thresholdMajor', 'number'], ['Severe threshold', 'thresholdSevere', 'number'], ['Armor', 'armor', 'number'], ['Evasion', 'evasion', 'number'], ['Hope', 'hope', 'number'], ['Stress', 'stress', 'number']] }
      ] },
      { title: 'Recursos & domínio', sections: [
        { title: 'Active weapons & inventory', fields: [['Active weapons', 'weapons', 'textarea'], ['Inventory', 'inventory', 'textarea']] },
        { title: 'Domain cards & experiences', fields: [['Domain cards', 'domainCards', 'textarea'], ['Experiences', 'experiences', 'textarea']] }
      ] }
    ]
  },
  'ordem-paranormal': {
    label: 'Ordem Paranormal RPG', columns: [
      { title: 'Agente', sections: [
        { title: 'Atributos', kind: 'stats', fields: [['Agilidade', 'agility'], ['Força', 'strength'], ['Intelecto', 'intellect'], ['Presença', 'presence'], ['Vigor', 'vigor']] },
        { title: 'Identificação', fields: [['Origem', 'origin'], ['Classe', 'className'], ['NEX (%)', 'nex', 'number'], ['Deslocamento', 'speed', 'number']] }
      ] },
      { title: 'Status & perícias', sections: [
        { title: 'Recursos', fields: [['PV atuais', 'hpCurrent', 'number'], ['PV máximos', 'hpMax', 'number'], ['PE atuais', 'effortCurrent', 'number'], ['PE máximos', 'effortMax', 'number'], ['SAN atual', 'sanityCurrent', 'number'], ['SAN máxima', 'sanityMax', 'number'], ['Defesa (10 + AGI)', 'defense', 'calculated']] },
        { title: 'Perícias (graduação e bônus)', kind: 'skillRatings', fields: ['Acrobacia', 'Adestramento', 'Artes', 'Atletismo', 'Atualidades', 'Ciências', 'Crime', 'Diplomacia', 'Enganação', 'Fortitude', 'Furtividade', 'Iniciativa', 'Intimidação', 'Intuição', 'Investigação', 'Luta', 'Medicina', 'Ocultismo', 'Percepção', 'Pilotagem', 'Pontaria', 'Profissão', 'Reflexos', 'Religião', 'Sobrevivência', 'Tática', 'Tecnologia', 'Vontade'] }
      ] },
      { title: 'Recursos & história', sections: [
        { title: 'Inventário', fields: [['Limite de carga', 'carryLimit', 'number'], ['Carga atual', 'carryCurrent', 'number'], ['Crédito', 'credit'], ['Itens', 'inventory', 'textarea']] },
        { title: 'Habilidades & rituais', fields: [['Habilidades', 'abilities', 'textarea'], ['Rituais', 'rituals', 'textarea']] },
        { title: 'Histórico', fields: [['Aparência', 'appearance', 'textarea'], ['Histórico', 'history', 'textarea']] }
      ] }
    ]
  },
  'vampire-masquerade': {
    label: 'Vampiro: A Máscara', columns: [
      { title: 'Identidade & atributos', sections: [
        { title: 'Dados do personagem', fields: [['Nome', 'name'], ['Natureza', 'nature'], ['Comportamento', 'demeanor'], ['Clã', 'clan'], ['Geração', 'generation'], ['Crônica', 'chronicle'], ['Refúgio', 'haven']] },
        { title: 'Físicos', kind: 'ratings', fields: ['Força', 'Destreza', 'Vigor'] },
        { title: 'Sociais', kind: 'ratings', fields: ['Carisma', 'Manipulação', 'Aparência'] },
        { title: 'Mentais', kind: 'ratings', fields: ['Percepção', 'Inteligência', 'Raciocínio'] }
      ] },
      { title: 'Habilidades', sections: [
        { title: 'Talentos', kind: 'ratings', fields: ['Prontidão', 'Atletismo', 'Briga', 'Esquiva', 'Empatia', 'Expressão', 'Intimidação', 'Liderança', 'Manha', 'Lábia'] },
        { title: 'Perícias', kind: 'ratings', fields: ['Empatia com Animais', 'Ofícios', 'Condução', 'Etiqueta', 'Armas de Fogo', 'Armas Brancas', 'Atuação', 'Furtividade', 'Sobrevivência', 'Ladinagem'] },
        { title: 'Conhecimentos', kind: 'ratings', fields: ['Acadêmicos', 'Computador', 'Finanças', 'Investigação', 'Direito', 'Linguística', 'Medicina', 'Ocultismo', 'Política', 'Ciências'] }
      ] },
      { title: 'Estado & vantagens', sections: [
        { title: 'Vitalidade', fields: [['Escoriado', 'healthBruised', 'checkbox'], ['Machucado', 'healthHurt', 'checkbox'], ['Ferido', 'healthInjured', 'checkbox'], ['Ferido gravemente', 'healthWounded', 'checkbox'], ['Espancado', 'healthMauled', 'checkbox'], ['Aleijado', 'healthCrippled', 'checkbox'], ['Incapacitado', 'healthIncapacitated', 'checkbox'], ['Força de Vontade', 'willpower', 'number'], ['Humanidade / Trilha', 'humanity', 'number']] },
        { title: 'Vantagens & poderes', fields: [['Antecedentes', 'backgrounds', 'textarea'], ['Disciplinas', 'disciplines', 'textarea']] }
      ] }
    ]
  }
};

function sheetPathValue(object, path) {
  return path.split('.').reduce((value, key) => value && value[key], object);
}

function sheetPathSet(object, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  const target = keys.reduce((node, key) => node[key] || (node[key] = {}), object);
  target[last] = value;
}

function renderSheetField(label, key, type = 'text', value = '') {
  const safeLabel = escapeHtml(label);
  const safeKey = escapeHtml(key);
  if (type === 'textarea') return `<label class="sheet-field sheet-field-wide"><span>${safeLabel}</span><textarea class="form-textarea" data-sheet-key="${safeKey}" rows="3">${escapeHtml(value || '')}</textarea></label>`;
  if (type === 'checkbox') return `<label class="sheet-check-field"><input type="checkbox" data-sheet-key="${safeKey}" ${value ? 'checked' : ''}><span>${safeLabel}</span></label>`;
  if (type === 'calculated') return `<label class="sheet-field"><span>${safeLabel}</span><input class="form-input" type="number" data-calculated="defense" value="10" readonly></label>`;
  const inputType = type === 'number' ? 'number' : 'text';
  return `<label class="sheet-field"><span>${safeLabel}</span><input class="form-input" type="${inputType}" data-sheet-key="${safeKey}" value="${escapeHtml(value ?? '')}" ${type === 'number' ? 'min="0"' : ''}></label>`;
}

class CharactersModule {
  constructor() {
    this.currentFilter = 'all'; // 'all', 'pj', 'npc'
    this.pendingImagePath = '';  // Caminho da imagem selecionada no formulário
    this.editingCharacterId = null;
    this.viewingCharacterId = null;
    this.characterClipboard = null;
    this.sortMode = 'creation';
    this.sortDirection = 1;
    this.currentSystem = 'dnd5e';
    this.formSheetData = {};
    this.initElements();
    this.bindEvents();
  }

  initElements() {
    this.galleryEl = document.getElementById('characters-gallery');
    this.btnNewChar = document.getElementById('btn-new-character');
    this.filterButtons = document.querySelectorAll('.char-filter-btn');
    this.btnGalleryMenu = document.getElementById('btn-characters-menu');
    this.galleryMenu = document.getElementById('characters-menu');

    // Modal
    this.modal = document.getElementById('modal-character');
    this.form = document.getElementById('form-character');
    this.btnCloseModal = document.getElementById('btn-close-char-modal');
    this.btnCancelModal = document.getElementById('btn-cancel-char-modal');
    this.btnSubmitCharacter = this.form
      ? this.form.querySelector('[type="submit"]')
      : null;
    this.detailsModal = document.getElementById('modal-character-details');
    this.detailsTitle = document.getElementById('character-details-title');
    this.detailsContent = document.getElementById('character-details-content');
    this.btnEditDetails = document.getElementById('btn-edit-character-details');
    this.btnCloseDetails = document.getElementById('btn-close-character-details');

    // Campos do modal

    // Upload de imagem
    this.avatarPreview = document.getElementById('char-avatar-preview');
    this.avatarUploadArea = document.querySelector('.char-avatar-upload-area');
    this.avatarImg = document.getElementById('char-avatar-img');
    this.btnUploadAvatar = document.getElementById('btn-upload-avatar');
    this.btnRemoveAvatar = document.getElementById('btn-remove-avatar');
    this.inputAvatarUrl = document.getElementById('char-avatar-url');
    this.charTypeSelect = document.getElementById('char-subtype-select');
    this.systemSelect = document.getElementById('char-system-select');
    this.sheetFieldsEl = document.getElementById('character-sheet-fields');
    this.sheetSaveIndicator = document.getElementById('sheet-save-indicator');
  }

  bindEvents() {
    if (this.btnNewChar) {
      this.btnNewChar.addEventListener('click', () => this.openModal());
    }

    if (this.btnCloseModal) this.btnCloseModal.addEventListener('click', () => this.closeModal());
    if (this.btnCancelModal) this.btnCancelModal.addEventListener('click', () => this.closeModal());
    if (this.btnCloseDetails) {
      this.btnCloseDetails.addEventListener('click', () => this.closeDetails());
    }
    if (this.btnEditDetails) {
      this.btnEditDetails.addEventListener('click', () => {
        const characterId = this.viewingCharacterId;
        this.closeDetails();
        this.openModal(characterId);
      });
    }
    if (this.btnGalleryMenu) {
      this.btnGalleryMenu.addEventListener('click', event => {
        event.stopPropagation();
        this.toggleMenu(this.galleryMenu, this.btnGalleryMenu);
      });
    }
    if (this.galleryMenu) {
      this.galleryMenu.addEventListener('click', event => {
        const item = event.target.closest('[data-action]');
        if (!item) return;
        event.stopPropagation();
        if (item.dataset.action === 'paste') this.pasteCharacter();
        if (item.dataset.action === 'clear') this.clearCharacters();
        if (item.dataset.action === 'sort-name') this.sortCharacters('name');
        if (item.dataset.action === 'sort-creation') this.sortCharacters('creation');
        this.closeMenus();
      });
    }
    if (this.galleryEl) {
      this.galleryEl.addEventListener('click', event => this.handleGalleryClick(event));
      this.galleryEl.addEventListener('keydown', event => {
        if (event.target.matches('.char-portrait-card') &&
            (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          this.openCharacterDetails(event.target.dataset.id);
        }
      });
    }
    document.addEventListener('click', event => {
      if (!event.target.closest('.char-menu-anchor, .char-card-menu-anchor')) this.closeMenus();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        this.closeMenus();
        this.closeDetails();
      }
    });

    // Filtros PJ / NPC / Todos
    this.filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentFilter = btn.dataset.filter;
        this.renderGallery();
      });
    });

    // Clique no preview da imagem abre o seletor de arquivo local
    if (this.avatarPreview) {
      this.avatarPreview.addEventListener('click', () => this.handleSelectImage());
      this.avatarPreview.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          this.handleSelectImage();
        }
      });
    }

    this.avatarUploadArea?.addEventListener('dragenter', event => {
      if (!this.hasDroppedImages(event.dataTransfer)) return;
      event.preventDefault();
      this.avatarUploadArea.classList.add('is-drag-over');
    });
    this.avatarUploadArea?.addEventListener('dragover', event => {
      if (!this.hasDroppedImages(event.dataTransfer)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      this.avatarUploadArea.classList.add('is-drag-over');
    });
    this.avatarUploadArea?.addEventListener('dragleave', event => {
      if (event.relatedTarget && this.avatarUploadArea.contains(event.relatedTarget)) return;
      this.avatarUploadArea.classList.remove('is-drag-over');
    });
    this.avatarUploadArea?.addEventListener('drop', event => {
      if (!this.hasDroppedImages(event.dataTransfer)) return;
      event.preventDefault();
      event.stopPropagation();
      this.avatarUploadArea.classList.remove('is-drag-over');
      const file = [...event.dataTransfer.files].find(item => this.isImageFile(item));
      if (file) this.handleDroppedAvatar(file);
    });
    this.modal?.addEventListener('dragover', event => {
      if (this.hasDroppedImages(event.dataTransfer)) event.preventDefault();
    });
    this.modal?.addEventListener('drop', event => {
      if (!this.hasDroppedImages(event.dataTransfer)) return;
      event.preventDefault();
      if (event.target.closest('.char-avatar-upload-area')) return;
      const file = [...event.dataTransfer.files].find(item => this.isImageFile(item));
      if (file) this.handleDroppedAvatar(file);
    });

    // Botão Procurar imagem no PC
    if (this.btnUploadAvatar) {
      this.btnUploadAvatar.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleSelectImage();
      });
    }

    // Remover imagem
    if (this.btnRemoveAvatar) {
      this.btnRemoveAvatar.addEventListener('click', (e) => {
        e.preventDefault();
        this.pendingImagePath = '';
        this.updateAvatarPreview('');
        if (this.inputAvatarUrl) this.inputAvatarUrl.value = '';
      });
    }

    // URL digitada manualmente
    if (this.inputAvatarUrl) {
      this.inputAvatarUrl.addEventListener('input', () => {
        const url = this.inputAvatarUrl.value.trim();
        this.pendingImagePath = url;
        this.updateAvatarPreview(url);
        this.persistCharacterDraft();
      });
    }

    // Submissão do formulário
    if (this.form) {
      this.form.addEventListener('input', event => this.handleSheetInput(event));
      this.form.addEventListener('change', event => this.handleSheetInput(event));
      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSaveCharacter();
      });
    }

    if (this.systemSelect) {
      this.systemSelect.addEventListener('change', () => {
        this.captureSheetInputs();
        this.currentSystem = this.systemSelect.value;
        this.renderSystemSheet();
        this.updateSheetTitle();
        this.persistCharacterDraft();
      });
    }

    // Reatividade ao estado global
    window.appState.subscribe(() => {
      this.renderGallery();
    });
  }

  // --- GERENCIAMENTO DE IMAGEM ---

  async handleSelectImage() {
    if (window.nativeAPI && window.nativeAPI.selectImage) {
      const res = await window.nativeAPI.selectImage();
      if (res.success && res.filePath) {
        const fileUrl = res.fileUrl || 'file:///' + res.filePath.replace(/\\/g, '/');
        this.pendingImagePath = fileUrl;
        this.updateAvatarPreview(fileUrl);
        if (this.inputAvatarUrl) this.inputAvatarUrl.value = fileUrl;
        this.persistCharacterDraft();
      }
    } else {
      // Fallback: abre o input de URL para o usuário colar um link
      if (this.inputAvatarUrl) this.inputAvatarUrl.focus();
    }
  }

  hasDroppedImages(dataTransfer) {
    return Boolean(dataTransfer && (dataTransfer.types?.includes('Files') || [...(dataTransfer.files || [])].some(file => this.isImageFile(file))));
  }

  isImageFile(file) {
    return file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg|avif)$/i.test(file.name || '');
  }

  async handleDroppedAvatar(file) {
    let imageUrl = '';
    try {
      if (window.nativeAPI?.getDroppedFileUrl) imageUrl = window.nativeAPI.getDroppedFileUrl(file);
    } catch (error) {
      console.warn('Falha ao acessar caminho da imagem; usando uma cópia incorporada.', error);
    }
    if (!imageUrl) {
      imageUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
    }
    this.pendingImagePath = imageUrl;
    this.updateAvatarPreview(imageUrl);
    if (this.inputAvatarUrl) this.inputAvatarUrl.value = imageUrl;
    this.persistCharacterDraft();
  }

  updateAvatarPreview(src) {
    if (!this.avatarPreview) return;

    if (src) {
      const image = document.createElement('img');
      image.id = 'char-avatar-img';
      image.alt = 'Retrato do personagem';
      image.src = src;
      image.addEventListener('error', () => {
        this.avatarPreview.innerHTML = `
          <div class="upload-hint">
            ${iconSvg('image')}
            <span>Imagem inválida</span>
          </div>
        `;
      }, { once: true });
      this.avatarPreview.replaceChildren(image);
      if (this.btnRemoveAvatar) this.btnRemoveAvatar.style.display = 'inline-flex';
    } else {
      this.avatarPreview.innerHTML = `
        <div class="upload-hint">
          ${iconSvg('image')}
          <span>Clique ou arraste uma imagem</span>
        </div>
      `;
      if (this.btnRemoveAvatar) this.btnRemoveAvatar.style.display = 'none';
    }
  }

  // --- ABRIR / FECHAR MODAL ---

  openModal(charId = null) {
    const proj = window.appState.getActiveProject();
    const character = charId && proj && proj.characters
      ? proj.characters.find(item => item.id === charId)
      : null;

    if (this.form) this.form.reset();
    this.editingCharacterId = character ? character.id : null;
    this.currentSystem = character && character.systemId
      ? character.systemId
      : 'dnd5e';
    this.formSheetData = character && character.sheets
      ? JSON.parse(JSON.stringify(character.sheets))
      : {};
    if (character && !character.sheets && character.type === 'rpg') {
      this.formSheetData.dnd5e = {
        stats: {
          strength: character.stats?.for ?? 10,
          dexterity: character.stats?.des ?? 10,
          constitution: character.stats?.con ?? 10,
          intelligence: character.stats?.int ?? 10,
          wisdom: character.stats?.sab ?? 10,
          charisma: character.stats?.car ?? 10
        },
        equipment: character.equipment || '',
        attacks: character.skills || '',
        personality: character.notes || ''
      };
    }
    if (character && ['daggerheart', 'vampire-masquerade'].includes(this.currentSystem)) {
      const sheet = this.formSheetData[this.currentSystem] || (this.formSheetData[this.currentSystem] = {});
      sheet.name = sheet.name || character.name || '';
    }
    if (this.systemSelect) this.systemSelect.value = this.currentSystem;
    this.pendingImagePath = '';
    this.updateAvatarPreview('');
    if (this.btnRemoveAvatar) this.btnRemoveAvatar.style.display = 'none';

    if (character) {
      document.getElementById('char-name').value = character.name || '';
      document.getElementById('char-role').value = character.role || '';
      document.getElementById('char-summary').value = character.summary || '';
      if (this.charTypeSelect) this.charTypeSelect.value = character.subType || 'pj';
      this.pendingImagePath = character.imageSrc || '';
      if (this.inputAvatarUrl) this.inputAvatarUrl.value = this.pendingImagePath;
      this.updateAvatarPreview(this.pendingImagePath);

    }
    this.renderSystemSheet();

    this.updateSheetTitle();
    if (this.btnSubmitCharacter) {
      this.btnSubmitCharacter.textContent = character ? 'Salvar Alterações' : 'Salvar Personagem';
    }

    this.modal.classList.add('active');
    setTimeout(() => {
      const nameInput = document.getElementById('char-name');
      if (nameInput) nameInput.focus();
    }, 80);
  }

  closeModal() {
    this.modal.classList.remove('active');
    this.pendingImagePath = '';
    this.editingCharacterId = null;
  }

  updateSheetTitle() {
    const modalTitle = this.modal && this.modal.querySelector('.modal-header h3');
    const system = CHARACTER_SHEET_SYSTEMS[this.currentSystem];
    if (!modalTitle || !system) return;
    const prefix = this.editingCharacterId ? 'Editar ficha' : 'Ficha de personagem';
    modalTitle.textContent = `${prefix} · ${system.label}`;
  }

  openCharacterDetails(characterId) {
    const proj = window.appState.getActiveProject();
    const character = proj && proj.characters
      ? proj.characters.find(item => item.id === characterId)
      : null;
    if (!character) return;

    this.viewingCharacterId = character.id;
    this.detailsTitle.textContent = character.name || 'Ficha do Personagem';
    this.detailsContent.innerHTML = this.renderCharacterDetails(character);
    this.detailsModal.classList.add('active');
  }

  closeDetails() {
    if (this.detailsModal) this.detailsModal.classList.remove('active');
    this.viewingCharacterId = null;
  }

  renderCharacterDetails(character) {
    const systemId = character.systemId || (character.type === 'rpg' ? 'dnd5e' : null);
    const system = systemId ? CHARACTER_SHEET_SYSTEMS[systemId] : null;
    let data = character.sheets && character.sheets[systemId]
      ? character.sheets[systemId]
      : {};

    if (systemId === 'dnd5e' && !character.sheets) {
      const stats = character.stats || {};
      data = {
        stats: {
          strength: stats.for ?? 10, dexterity: stats.des ?? 10,
          constitution: stats.con ?? 10, intelligence: stats.int ?? 10,
          wisdom: stats.sab ?? 10, charisma: stats.car ?? 10
        },
        equipment: character.equipment || '', attacks: character.skills || '',
        personality: character.notes || ''
      };
    }

    const portrait = character.imageSrc
      ? `<img class="character-details-image" src="${escapeHtml(character.imageSrc)}" alt="Retrato de ${escapeHtml(character.name)}" onerror="this.style.display='none'; this.nextElementSibling.style.display='grid'">`
      : '';
    const hero = `
      <div class="character-details-hero">
        <div class="character-details-portrait">
          ${portrait}
          <div class="character-details-image-placeholder" ${character.imageSrc ? 'style="display:none;"' : ''}>${iconSvg('user')}</div>
        </div>
        <div class="character-details-intro">
          <div class="character-details-tags">
            ${system ? `<span class="character-system-tag">${escapeHtml(system.label)}</span>` : '<span class="character-system-tag">Narrativa</span>'}
            ${character.type === 'rpg' ? `<span class="character-kind-tag ${character.subType === 'npc' ? 'is-npc' : ''}">${character.subType === 'npc' ? 'NPC' : 'PJ'}</span>` : ''}
          </div>
          ${character.role ? `<span class="character-details-role">${escapeHtml(character.role)}</span>` : ''}
          ${character.summary ? `<p>${escapeHtml(character.summary)}</p>` : ''}
        </div>
      </div>`;

    if (!system) {
      const narrative = [
        ['Arco do personagem', character.arc],
        ['Detalhes e personalidade', character.details]
      ].filter(([, value]) => value);
      return `${hero}<div class="character-sheet-read-columns"><section class="sheet-read-column"><h4>História & personalidade</h4>${narrative.map(([label, value]) => `<article class="sheet-read-field"><h5>${escapeHtml(label)}</h5><p>${escapeHtml(value)}</p></article>`).join('') || '<p class="sheet-read-empty">Nenhum detalhe adicional.</p>'}</section></div>`;
    }

    const renderReadSection = section => {
      let content = '';
      if (section.kind === 'stats') {
        content = `<div class="sheet-read-stats">${section.fields.map(([label, key]) => {
          const value = sheetPathValue(data, `stats.${key}`);
          if (value === undefined || value === '') return '';
          const modifier = Math.floor((Number(value || 0) - 10) / 2);
          return `<div class="sheet-read-stat"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>${systemId === 'dnd5e' ? `<small>${modifier >= 0 ? '+' : ''}${modifier}</small>` : ''}</div>`;
        }).join('')}</div>`;
      } else if (section.kind === 'skills') {
        content = `<div class="sheet-read-skills">${section.fields.map(item => {
          const [label, ability] = item.split('|');
          const key = label.toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          const trained = Boolean(sheetPathValue(data, `proficiencies.${key}`));
          return `<div class="sheet-read-skill ${trained ? 'is-trained' : ''}"><span class="skill-mark">${trained ? '✓' : '·'}</span><span>${escapeHtml(label)}</span><small>${escapeHtml(ability.slice(0, 3).toUpperCase())}</small></div>`;
        }).join('')}</div>`;
      } else if (section.kind === 'ratings') {
        content = `<div class="sheet-read-ratings">${section.fields.map(label => {
          const key = `${section.title.toLowerCase().replace(/\s+/g, '-')}.${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
          const value = Number(sheetPathValue(data, key) || 0);
          return `<div class="sheet-read-rating"><span>${escapeHtml(label)}</span><span class="rating-dots" aria-label="${value} de 5">${[1, 2, 3, 4, 5].map(dot => `<i class="${dot <= value ? 'filled' : ''}"></i>`).join('')}</span><small>${value}</small></div>`;
        }).join('')}</div>`;
      } else if (section.kind === 'skillRatings') {
        content = `<div class="sheet-read-op-skills">${section.fields.map(label => {
          const key = label.trim().toLowerCase('pt-BR').replace(/[^a-z0-9]+/g, '-');
          const rank = sheetPathValue(data, `skillRanks.${key}`);
          const bonus = sheetPathValue(data, `skillBonuses.${key}`);
          if ((rank === undefined || rank === 0) && (bonus === undefined || bonus === 0)) return '';
          return `<div><span>${escapeHtml(label.trim())}</span><strong>${escapeHtml(rank ?? '—')} dados</strong><small>${Number(bonus) > 0 ? '+' : ''}${escapeHtml(bonus ?? 0)}</small></div>`;
        }).join('')}</div>`;
      } else {
        content = `<div class="sheet-read-fields">${section.fields.map(([label, key, type]) => {
          if (key === 'name') return '';
          const value = sheetPathValue(data, key);
          if (value === undefined || value === null || value === '' || (type === 'checkbox' && !value)) return '';
          const displayValue = type === 'checkbox' ? 'Marcado' : String(value);
          return `<article class="sheet-read-field"><h5>${escapeHtml(label)}</h5><p>${escapeHtml(displayValue)}</p></article>`;
        }).join('')}</div>`;
      }
      if (!content.replace(/<[^>]*>/g, '').trim()) return '';
      return `<section class="sheet-read-section"><h5>${escapeHtml(section.title)}</h5>${content}</section>`;
    };

    const columns = system.columns.map(column => {
      const sections = column.sections.map(renderReadSection).join('');
      return sections ? `<section class="sheet-read-column"><h4>${escapeHtml(column.title)}</h4>${sections}</section>` : '';
    }).join('');
    return `${hero}<div class="character-sheet-read-columns">${columns || '<p class="sheet-read-empty">Esta ficha ainda não possui dados.</p>'}</div>`;
  }

  handleGalleryClick(event) {
    const target = event.target;
    const menuButton = target.closest('.char-card-menu-trigger');
    if (menuButton) {
      event.stopPropagation();
      const menu = menuButton.parentElement.querySelector('.char-context-menu');
      this.toggleMenu(menu, menuButton);
      return;
    }

    const menuItem = target.closest('.char-menu-item[data-action]');
    if (menuItem) {
      event.stopPropagation();
      const card = menuItem.closest('.char-portrait-card');
      this.handleCharacterAction(menuItem.dataset.action, card.dataset.id);
      this.closeMenus();
      return;
    }

    const card = target.closest('.char-portrait-card');
    if (card) this.openCharacterDetails(card.dataset.id);
  }

  toggleMenu(menu, trigger) {
    if (!menu) return;
    const shouldOpen = menu.hidden;
    this.closeMenus();
    menu.hidden = !shouldOpen;
    trigger.setAttribute('aria-expanded', String(shouldOpen));
  }

  closeMenus() {
    document.querySelectorAll('.char-context-menu:not([hidden])').forEach(menu => {
      menu.hidden = true;
      const trigger = menu.parentElement.querySelector('[aria-expanded="true"]');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
    });
  }

  handleCharacterAction(action, characterId) {
    const proj = window.appState.getActiveProject();
    const character = proj && proj.characters
      ? proj.characters.find(item => item.id === characterId)
      : null;
    if (!character) return;

    if (action === 'edit') {
      this.openModal(character.id);
    } else if (action === 'duplicate') {
      this.ensureCharacterCreationOrder(proj);
      const copy = JSON.parse(JSON.stringify(character));
      copy.id = this.createCharacterId(proj.characters);
      copy.createdOrder = this.getNextCharacterCreationOrder(proj.characters);
      copy.name = `${character.name} (cópia)`;
      proj.characters.push(copy);
      window.appState.updateActiveProject({ characters: proj.characters });
    } else if (action === 'copy') {
      this.characterClipboard = JSON.parse(JSON.stringify(character));
      this.updateGalleryMenuState();
      alert(`"${character.name}" foi copiado. Abra a galeria de outro projeto e escolha Colar.`);
    } else if (action === 'delete') {
      if (!confirm(`Excluir "${character.name}"? Esta ação não pode ser desfeita.`)) return;
      proj.characters = proj.characters.filter(item => item.id !== character.id);
      window.appState.updateActiveProject({ characters: proj.characters });
    }
  }

  createCharacterId(characters) {
    let id;
    do {
      id = `char-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    } while (characters.some(character => character.id === id));
    return id;
  }

  ensureCharacterCreationOrder(proj) {
    if (!proj.characters) proj.characters = [];
    let nextOrder = proj.characters.reduce((max, character) => {
      return Number.isFinite(character.createdOrder)
        ? Math.max(max, character.createdOrder + 1)
        : max;
    }, 0);
    let changed = false;

    proj.characters.forEach(character => {
      if (!Number.isFinite(character.createdOrder)) {
        character.createdOrder = nextOrder++;
        changed = true;
      }
    });

    return changed;
  }

  getNextCharacterCreationOrder(characters) {
    return characters.reduce((max, character) => {
      return Number.isFinite(character.createdOrder)
        ? Math.max(max, character.createdOrder + 1)
        : max;
    }, 0);
  }

  sortCharacters(mode) {
    if (this.sortMode === mode) {
      this.sortDirection *= -1;
    } else {
      this.sortMode = mode;
      this.sortDirection = 1;
    }
    this.updateSortingMenuState();
    this.renderGallery();
  }

  updateSortingMenuState() {
    if (!this.galleryMenu) return;
    const sortOptions = [
      ['name', 'A-Z'],
      ['creation', 'Ordem de Criação']
    ];
    sortOptions.forEach(([mode, label]) => {
      const button = this.galleryMenu.querySelector(`[data-action="sort-${mode}"]`);
      if (!button) return;
      const selected = this.sortMode === mode;
      const direction = this.sortDirection === 1 ? '↑' : '↓';
      button.textContent = selected ? `${label} ${direction}` : label;
      button.setAttribute('aria-pressed', String(selected));
    });
  }

  pasteCharacter() {
    const proj = window.appState.getActiveProject();
    if (!this.characterClipboard) {
      alert('Nenhum personagem copiado. Use Copiar no menu de um personagem primeiro.');
      return;
    }
    if (!proj) {
      alert('Abra um projeto antes de colar um personagem.');
      return;
    }

    if (!proj.characters) proj.characters = [];
    this.ensureCharacterCreationOrder(proj);
    const copy = JSON.parse(JSON.stringify(this.characterClipboard));
    copy.id = this.createCharacterId(proj.characters);
    copy.createdOrder = this.getNextCharacterCreationOrder(proj.characters);
    proj.characters.push(copy);
    window.appState.updateActiveProject({ characters: proj.characters });
  }

  clearCharacters() {
    const proj = window.appState.getActiveProject();
    if (!proj || !proj.characters || proj.characters.length === 0) return;
    if (!confirm(`Remover os ${proj.characters.length} personagens deste projeto? Esta ação não pode ser desfeita.`)) return;
    window.appState.updateActiveProject({ characters: [] });
  }

  updateGalleryMenuState() {
    const pasteButton = this.galleryMenu && this.galleryMenu.querySelector('[data-action="paste"]');
    if (pasteButton) pasteButton.disabled = !this.characterClipboard;
  }

  renderSystemSheet() {
    if (!this.sheetFieldsEl) return;
    const system = CHARACTER_SHEET_SYSTEMS[this.currentSystem] || CHARACTER_SHEET_SYSTEMS.dnd5e;
    const data = this.formSheetData[this.currentSystem] || {};
    this.sheetFieldsEl.innerHTML = `<div class="sheet-columns">${system.columns.map(column => `
      <section class="sheet-column"><h4>${escapeHtml(column.title)}</h4>
        ${column.sections.map(section => {
          let content = '';
          if (section.kind === 'stats') {
            content = `<div class="sheet-stats-grid">${section.fields.map(([label, key]) => {
              const value = sheetPathValue(data, `stats.${key}`) ?? (this.currentSystem === 'dnd5e' ? 10 : '');
              const mod = Math.floor((Number(value || 0) - 10) / 2);
              return `<label class="sheet-stat"><span>${escapeHtml(label)}</span><input type="number" min="0" max="30" data-sheet-key="stats.${key}" value="${escapeHtml(value)}">${this.currentSystem === 'dnd5e' ? `<small data-mod-key="stats.${key}">${mod >= 0 ? '+' : ''}${mod}</small>` : ''}</label>`;
            }).join('')}</div>`;
          } else if (section.kind === 'skills') {
            content = `<div class="sheet-skills-list">${section.fields.map(item => {
              const [label, ability] = item.split('|');
              const key = label.toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
              return `<label class="sheet-skill"><input type="checkbox" data-sheet-key="proficiencies.${key}" ${sheetPathValue(data, `proficiencies.${key}`) ? 'checked' : ''}><span>${escapeHtml(label)}</span><small>${escapeHtml(ability.slice(0, 3).toUpperCase())}</small></label>`;
            }).join('')}</div>`;
          } else if (section.kind === 'ratings') {
            content = `<div class="sheet-rating-list">${section.fields.map(label => {
              const key = `${section.title.toLowerCase().replace(/\s+/g, '-')}.${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
              const value = sheetPathValue(data, key) ?? 0;
              return `<label class="sheet-rating"><span>${escapeHtml(label)}</span><input type="number" min="0" max="5" data-sheet-key="${escapeHtml(key)}" value="${escapeHtml(value)}" aria-label="${escapeHtml(label)}, pontos de 0 a 5"><span class="rating-dots" aria-hidden="true">${[1, 2, 3, 4, 5].map(dot => `<i class="${dot <= Number(value) ? 'filled' : ''}"></i>`).join('')}</span></label>`;
            }).join('')}</div>`;
          } else if (section.kind === 'skillRatings') {
            content = `<div class="sheet-rating-list">${section.fields.map(label => {
              const key = label.trim().toLowerCase('pt-BR').replace(/[^a-z0-9]+/g, '-');
              return `<div class="sheet-op-skill"><span>${escapeHtml(label.trim())}</span><label>Dados<input type="number" min="0" max="5" data-sheet-key="skillRanks.${key}" value="${escapeHtml(sheetPathValue(data, `skillRanks.${key}`) ?? 0)}"></label><label>Bônus<input type="number" data-sheet-key="skillBonuses.${key}" value="${escapeHtml(sheetPathValue(data, `skillBonuses.${key}`) ?? 0)}"></label></div>`;
            }).join('')}</div>`;
          } else {
            content = `<div class="sheet-fields-grid">${section.fields.map(([label, key, type]) => {
              const value = type === 'calculated' ? '' : sheetPathValue(data, key) ?? '';
              return renderSheetField(label, key, type || 'text', value);
            }).join('')}</div>`;
          }
          return `<section class="sheet-section"><h5>${escapeHtml(section.title)}</h5>${content}</section>`;
        }).join('')}
      </section>`).join('')}</div>`;
    this.updateSheetCalculations();
  }

  captureSheetInputs() {
    if (!this.sheetFieldsEl) return;
    const data = this.formSheetData[this.currentSystem] || {};
    this.sheetFieldsEl.querySelectorAll('[data-sheet-key]').forEach(input => {
      const value = input.type === 'checkbox' ? input.checked
        : input.type === 'number' ? (input.value === '' ? '' : Number(input.value))
          : input.value;
      sheetPathSet(data, input.dataset.sheetKey, value);
    });
    this.formSheetData[this.currentSystem] = data;
  }

  handleSheetInput(event) {
    if (!event.target.matches('[data-sheet-key], #char-name, #char-role, #char-summary, #char-subtype-select')) return;
    this.captureSheetInputs();
    this.updateSheetCalculations();
    this.persistCharacterDraft();
  }

  updateSheetCalculations() {
    if (!this.sheetFieldsEl) return;
    this.sheetFieldsEl.querySelectorAll('[data-mod-key]').forEach(output => {
      const input = this.sheetFieldsEl.querySelector(`[data-sheet-key="${output.dataset.modKey}"]`);
      const modifier = Math.floor((Number(input && input.value || 0) - 10) / 2);
      output.textContent = `${modifier >= 0 ? '+' : ''}${modifier}`;
    });
    if (this.currentSystem === 'ordem-paranormal') {
      const agility = Number(sheetPathValue(this.formSheetData[this.currentSystem] || {}, 'stats.agility') || 0);
      const defense = this.sheetFieldsEl.querySelector('[data-calculated="defense"]');
      if (defense) defense.value = 10 + agility;
    }
    this.sheetFieldsEl.querySelectorAll('.sheet-rating').forEach(row => {
      const value = Number(row.querySelector('[data-sheet-key]')?.value || 0);
      row.querySelectorAll('.rating-dots i').forEach((dot, index) => dot.classList.toggle('filled', index < value));
    });
  }

  persistCharacterDraft() {
    const proj = window.appState.getActiveProject();
    const name = document.getElementById('char-name')?.value.trim();
    if (!proj) return;
    if (!name) {
      if (this.sheetSaveIndicator) this.sheetSaveIndicator.textContent = 'Informe o nome para salvar';
      return;
    }
    if (!proj.characters) proj.characters = [];
    this.ensureCharacterCreationOrder(proj);
    let character = this.editingCharacterId
      ? proj.characters.find(item => item.id === this.editingCharacterId)
      : null;
    if (!character) {
      character = {
        id: this.createCharacterId(proj.characters),
        createdOrder: this.getNextCharacterCreationOrder(proj.characters),
        type: 'rpg',
        subType: 'pj',
        sheets: {}
      };
      proj.characters.push(character);
      this.editingCharacterId = character.id;
    }
    this.captureSheetInputs();
    character.name = name;
    character.role = document.getElementById('char-role')?.value.trim() || '';
    character.summary = document.getElementById('char-summary')?.value.trim() || '';
    character.subType = this.charTypeSelect?.value || character.subType || 'pj';
    character.imageSrc = this.pendingImagePath || '';
    character.type = 'rpg';
    character.systemId = this.currentSystem;
    character.sheets = this.formSheetData;
    if (this.currentSystem === 'daggerheart' || this.currentSystem === 'vampire-masquerade') {
      character.sheets[this.currentSystem].name = name;
    }
    character.sheet = character.sheets[this.currentSystem] || {};
    if (this.currentSystem === 'ordem-paranormal') {
      const agility = Number(sheetPathValue(character.sheet, 'stats.agility') || 0);
      character.sheet.defense = 10 + agility;
    }
    window.appState.updateActiveProject({ characters: proj.characters });
    if (this.sheetSaveIndicator) this.sheetSaveIndicator.textContent = 'Salvo automaticamente';
  }

  // --- SALVAR PERSONAGEM ---

  handleSaveCharacter() {
    const name = document.getElementById('char-name').value.trim();
    if (!name) {
      alert('Informe o nome do personagem.');
      return;
    }
    this.persistCharacterDraft();
    this.closeModal();
    this.renderGallery();
  }

  // --- GALERIA DE RETRATOS ---

  renderGallery() {
    if (!this.galleryEl) return;
    const proj = window.appState.getActiveProject();
    this.updateGalleryMenuState();
    this.updateSortingMenuState();

    if (!proj || !proj.characters || proj.characters.length === 0) {
      this.galleryEl.innerHTML = `
        <div class="chars-empty-state">
          <div class="empty-icon">${iconSvg('users')}</div>
          <h3>Nenhum personagem cadastrado</h3>
          <p>Clique em "+ Novo Personagem" para criar sua primeira ficha.</p>
        </div>
      `;
      return;
    }

    if (this.ensureCharacterCreationOrder(proj)) {
      window.appState.updateActiveProject({ characters: proj.characters });
    }

    let chars = proj.characters.slice();
    if (this.currentFilter === 'pj') {
      chars = chars.filter(c => c.subType === 'pj');
    } else if (this.currentFilter === 'npc') {
      chars = chars.filter(c => c.subType === 'npc');
    }
    chars.sort((a, b) => {
      let comparison;
      if (this.sortMode === 'name') {
        comparison = String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR', {
          sensitivity: 'base',
          numeric: true
        });
      } else {
        comparison = a.createdOrder - b.createdOrder;
      }
      return comparison * this.sortDirection;
    });

    if (chars.length === 0) {
      this.galleryEl.innerHTML = `
        <div class="chars-empty-state">
          <div class="empty-icon">${iconSvg('search')}</div>
          <p>Nenhum personagem nesta categoria.</p>
        </div>
      `;
      return;
    }

    this.galleryEl.innerHTML = chars.map(char => {
      // Capa: imagem ou placeholder vetorial
      const coverHtml = char.imageSrc
        ? `<img src="${escapeHtml(char.imageSrc)}" alt="${escapeHtml(char.name)}"
               onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
           <div class="char-portrait-placeholder" style="display:none;">
             ${iconSvg('user', 'emoji-fallback')}
           </div>`
        : `<div class="char-portrait-placeholder">
             ${iconSvg('user', 'emoji-fallback')}
           </div>`;

      // Badge de tipo
      let badge = '';
      if (char.type === 'rpg') {
        badge = char.subType === 'pj'
          ? `<span class="char-portrait-badge badge-pj">PJ</span>`
          : `<span class="char-portrait-badge badge-npc">NPC</span>`;
      } else {
        badge = `<span class="char-portrait-badge badge-narrative">Narrativa</span>`;
      }

      return `
        <div class="char-portrait-card" data-id="${escapeHtml(char.id)}" title="${escapeHtml(char.name)}">
          <div class="char-card-menu-anchor">
            <button type="button" class="char-menu-trigger char-card-menu-trigger" aria-label="Opções de ${escapeHtml(char.name)}" aria-haspopup="true" aria-expanded="false">⋮</button>
            <div class="char-context-menu char-card-context-menu" role="menu" hidden>
              <button type="button" class="char-menu-item" data-action="edit" role="menuitem">Editar</button>
              <button type="button" class="char-menu-item" data-action="duplicate" role="menuitem">Duplicar</button>
              <button type="button" class="char-menu-item" data-action="copy" role="menuitem">Copiar</button>
              <button type="button" class="char-menu-item char-menu-item-danger" data-action="delete" role="menuitem">Deletar</button>
            </div>
          </div>
          <div class="char-portrait-cover">
            ${coverHtml}
            ${badge}
          </div>
          <div class="char-portrait-info">
            <div class="char-portrait-name">${escapeHtml(char.name)}</div>
            ${char.role ? `<div class="char-portrait-role">${escapeHtml(char.role)}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');

    this.galleryEl.querySelectorAll('.char-portrait-card').forEach(card => {
      card.tabIndex = 0;
      card.setAttribute('role', 'group');
      card.setAttribute('aria-label', `Ficha de ${card.title}. Pressione Enter para abrir.`);
    });
  }
}

function escapeHtml(str) {
  if (str === undefined || str === null) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

window.CharactersModule = CharactersModule;
