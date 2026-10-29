/**
 * GERENCIADOR DE ESTADO GLOBAL (STATE.JS)
 * Controla os projetos ativos, lista de projetos recentes e dados em memória.
 */

const STORAGE_KEY_PROJECTS = 'grimorio_projects_list';
const STORAGE_KEY_ACTIVE_ID = 'grimorio_active_project_id';

function safeProjectFolderName(title) {
  const cleaned = String(title || 'Projeto sem nome')
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/[. ]+$/g, '')
    .slice(0, 100);
  const safeName = cleaned || 'Projeto sem nome';
  return /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(safeName) ? `_${safeName}` : safeName;
}

function managedProjectFolder(storagePath, projectTitle, projectId, projects = window.appState?.projects || []) {
  const root = String(storagePath || '').replace(/[\\/]+$/, '');
  const baseName = safeProjectFolderName(projectTitle);
  const otherNames = new Set(projects
    .filter(project => project.id !== projectId && project.folderPath)
    .map(project => project.folderPath.split(/[\\/]/).filter(Boolean).pop()?.toLocaleLowerCase())
    .filter(Boolean));
  let folderName = baseName;
  let suffix = 2;
  while (otherNames.has(folderName.toLocaleLowerCase())) folderName = `${baseName} (${suffix++})`;
  return `${root}/${folderName}`;
}

class StateManager {
  constructor() {
    this.projects = this.loadProjectsList();
    this.activeProject = null;
    this.currentView = 'dashboard';
    this.listeners = [];
    this.saveSequence = new Map();

    // Se houver projeto ativo previamente salvo, carrega
    const savedActiveId = localStorage.getItem(STORAGE_KEY_ACTIVE_ID);
    if (savedActiveId) {
      const found = this.projects.find(p => p.id === savedActiveId);
      if (found) {
        this.activeProject = found;
      }
    }

    // Garante que os exemplos estejam disponíveis sem substituir versões já editadas.
    this.initDefaultProjects();
    if (this.activeProject) this.setSaveStatus('saved', this.activeProject.lastSavedAt);
  }

  // Inicializa projetos demonstrativos
  initDefaultProjects() {
    const defaultBook = {
      id: 'demo-book-1',
      sampleSeedVersion: 2,
      title: 'Crônicas do Solstício',
      type: 'book', // 'book' ou 'rpg'
      folderPath: 'C:/Documentos/Livros/Cronicas',
      description: 'Uma história sobre conspirações na corte do reino solar.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Módulo Livro / Planejador
      planner: {
        wordGoal: 50000,
        currentWords: 1420,
        themes: ['Vingança', 'Redenção', 'Lealdade'],
        genres: ['Fantasia política'],
        plannedChapters: [
          { id: 'plan-ch-book-1', title: 'A chegada do mensageiro', wordGoal: 1200, plan: 'Arthur recebe uma carta que prova a inocência de sua família.' }
        ],
        acts: [
          { id: 'act-1', name: 'Ato I: O Chamado e a Queda', desc: 'Apresentação do protagonista e o assassinato do rei.' },
          { id: 'act-2', name: 'Ato II: O Exílio na Floresta', desc: 'Treinamento e busca pelos antigos artefatos.' },
          { id: 'act-3', name: 'Ato III: O Cerco à Capital', desc: 'A batalha final e a revelação do traidor.' }
        ]
      },
      // Capítulos (Editor estilo Wattpad)
      chapters: [
        { id: 'ch-1', title: 'Capítulo 1: Cinzas no Horizonte', content: '<p>O vento frio soprava contra as ameias da fortaleza...</p>', wordCount: 820, status: 'review' },
        { id: 'ch-2', title: 'Capítulo 2: Sussurros na Taverna', content: '<p>Uma caneca de hidromel bateu pesadamente sobre a mesa de carvalho...</p>', wordCount: 600, status: 'draft' }
      ],
      // Anotações Rápidas & Ideias (Bloco de Notas simples)
      notes: [
        { id: 'note-1', title: 'Plot Twist do Barão', content: 'Revelar no clímax do Ato II que o Barão na verdade estava sob controle mental da ordem sombria.', updatedAt: new Date().toISOString() },
        { id: 'note-2', title: 'Lembrete de Worldbuilding', content: 'A magia dos templos consome fragmentos de vidro solar; mencionar o custo no próximo capítulo.', updatedAt: new Date().toISOString() }
      ],
      // Personagens (Ficha adaptativa)
      characters: [
        {
          id: 'char-1',
          name: 'Sir Arthur Pendelton',
          role: 'Protagonista / Cavaleiro Exilado',
          type: 'narrative',
          avatar: '',
          summary: 'Um nobre desonrado em busca de limpar o nome de sua linhagem.',
          details: 'Possui uma cicatriz no olho direito. Traço principal: Justo, porém teimoso.'
        }
      ],
      // Worldbuilding & Magias
      world: {
        politica: 'Império feudal dividido em sete baronatos rivais.',
        leis: 'O uso de magia sem autorização clerical é punido com exílio.',
        bioma: 'Florestas densas de coníferas e cordilheiras gélidas.',
        clima: 'Invernos rigorosos e verões curtos e nublados.',
        economia: 'Baseada na mineração de prata e comércio fluvial.',
        religiao: 'Culto da Chama Eterna e dos Antigos Astros.',
        geografia: 'O vale de Solária é cercado pelas Montanhas da Serpente.',
        topicEntries: {
          politica: [{ id: 'wb-book-politica', title: 'Conselho dos Sete', description: 'Sete barões disputam influência sobre a coroa.' }],
          leis: [{ id: 'wb-book-leis', title: 'Édito da Chama', description: 'Magia pública exige licença do clero.' }],
          bioma: [{ id: 'wb-book-bioma', title: 'Floresta de Vidro', description: 'Pinheiros cristalizados cercam o vale.' }],
          clima: [{ id: 'wb-book-clima', title: 'Inverno longo', description: 'A neve chega cedo e encurta as colheitas.' }],
          economia: [{ id: 'wb-book-economia', title: 'Prata fluvial', description: 'Barcaças levam minério até a capital.' }],
          religiao: [{ id: 'wb-book-religiao', title: 'Chama Eterna', description: 'O culto promete proteção em troca de obediência.' }],
          geografia: [{ id: 'wb-book-geografia', title: 'Vale de Solária', description: 'Uma passagem estreita liga o vale ao reino.' }]
        }
      },
      spells: [
        {
          id: 'sp-1',
          name: 'Lança de Fogo Solar',
          cost: '15 Mana / Foco',
          range: '30 metros',
          components: 'Verbal, Somático',
          effect: 'Conjura um feixe concentrado de chamas que perfura armaduras.',
          lore: 'Criada pelos magos de guerra durante o primeiro cerco.'
        }
      ],
      // Moodboard
      moodboard: [
        { id: 'mb-1', title: 'Castelo Real', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600', notes: 'Inspiração para a sede do império' }
      ],
      // Diagrama / Nós
      diagram: {
        nodes: [
          { id: 'n-1', label: 'Sir Arthur', type: 'personagem', x: 120, y: 150, desc: 'Cavaleiro' },
          { id: 'n-2', label: 'Fortaleza do Sol', type: 'cidade', x: 380, y: 150, desc: 'Capital' }
        ],
        connections: [
          { from: 'n-1', to: 'n-2', label: 'Guardião de' }
        ]
      },
      familyTrees: [{
        id: 'tree-book-1', name: 'Casa Pendelton', description: 'A linhagem de Arthur.',
        members: [
          { id: 'family-book-1', name: 'Sir Arthur Pendelton', role: 'Protagonista', birth: '1978', death: '', avatar: '', parents: [], notes: 'Herdeiro exilado.' },
          { id: 'family-book-2', name: 'Lady Elara Pendelton', role: 'Mãe', birth: '1954', death: '', avatar: '', parents: [], notes: 'Guarda a prova da conspiração.' }
        ]
      }],
      timeline: [
        { id: 'event-book-1', title: 'Queda da Casa Pendelton', date: '1998', category: 'Passado', location: 'Capital', people: 'Arthur; Elara', description: 'A família é acusada de traição e perde seus títulos.' },
        { id: 'event-book-2', title: 'A carta chega à fortaleza', date: '2025', category: 'Enredo', location: 'Fronteira norte', people: 'Arthur', description: 'Uma mensagem reabre o caso do antigo rei.' }
      ]
    };

    const defaultRpg = {
      id: 'demo-rpg-1',
      sampleSeedVersion: 2,
      title: 'A Maldição de Valdória',
      type: 'rpg',
      folderPath: 'C:/RPG/Valdoria',
      description: 'Campanha de fantasia sombria e exploração de masmorras.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      planner: {
        genres: ['Fantasia sombria', 'Exploração'],
        plannedChapters: [{ id: 'plan-rpg-1', title: 'A cripta sob a chuva', wordGoal: null, plan: 'Investigar o altar, enfrentar os ghouls e decidir se levam a relíquia.' }],
        acts: [{ id: 'arc-rpg-1', name: 'O selo da cripta', desc: 'Descobrir quem abriu a tumba e impedir que a névoa alcance a vila.' }]
      },
      chapters: [
        { id: 'sess-1', title: 'Sessão 01: O Encontro na Cripta', content: '<p>Os aventureiros acordam em uma antecâmara com cheiro de mofo...</p>', wordCount: 950, status: 'done' }
      ],
      notes: [
        { id: 'note-rpg-1', title: 'Ideia de Encontro Aleatório', content: '3 Ghouls famintos rastejando pelo teto da antecâmara sul.', updatedAt: new Date().toISOString() },
        { id: 'note-rpg-2', title: 'Tesouro Escondido', content: 'Atrás do sarcófago do meio há um compartimento com 50 PO e uma poção de cura.', updatedAt: new Date().toISOString() }
      ],
      characters: [
        {
          id: 'char-rpg-1',
          name: 'Kaelen, o Rastreador',
          role: 'Ladino / Patrulheiro',
          type: 'rpg',
          subType: 'pj', // PJ ou NPC
          avatar: '',
          summary: 'Especialista em desarmar armadilhas e tiro de precisão.',
          stats: { for: 10, des: 16, con: 14, int: 12, sab: 14, car: 8 },
          skills: 'Furtividade +6, Percepção +4, Ladinagem +5',
          equipment: 'Adaga de aço sombrio, Arco curto, 20 flechas, Gazua',
          notes: 'Tem fobia de aranhas gigantes.'
        },
        {
          id: 'char-rpg-2',
          name: 'Barão Von Klaus',
          role: 'Lorde Feudal de Valdória',
          type: 'rpg',
          subType: 'npc', // NPC
          avatar: '',
          summary: 'Governante ganancioso que contratou o grupo.',
          stats: { for: 12, des: 10, con: 12, int: 15, sab: 13, car: 16 },
          skills: 'Persuasão +7, Enganação +6',
          equipment: 'Túnica de veludo, Anel de proteção +1',
          notes: 'Esconde um pacto com forças das sombras.'
        }
      ],
      world: {
        politica: 'Feudalismo opressor sob o jugo do Barão Von Klaus.',
        leis: 'Toque de recolher ao anoitecer sob pena de forca.',
        bioma: 'Pântanos densos e neblina constante.',
        clima: 'Chuva fria contínua e céus cinzentos.',
        economia: 'Moedas de ferro cunhadas localmente.',
        religiao: 'Panteão Esquecido cujos templos foram profanados.',
        geografia: 'Cercada por pântanos intransponíveis e ruínas antigas.',
        topicEntries: {
          politica: [{ id: 'wb-rpg-politica', title: 'Baronato de Valdória', description: 'O barão governa a região e mantém os povoados isolados.' }],
          leis: [{ id: 'wb-rpg-leis', title: 'Toque de recolher', description: 'Ninguém deve sair após o sino do crepúsculo.' }],
          bioma: [{ id: 'wb-rpg-bioma', title: 'Pântano dos Sussurros', description: 'Ghouls caçam entre raízes e água escura.' }],
          clima: [{ id: 'wb-rpg-clima', title: 'Chuva cinzenta', description: 'A chuva cobre rastros e apaga tochas.' }],
          economia: [{ id: 'wb-rpg-economia', title: 'Ferro de Valdória', description: 'Moedas locais valem pouco fora do baronato.' }],
          religiao: [{ id: 'wb-rpg-religiao', title: 'Panteão Esquecido', description: 'Santuários antigos foram lacrados após a praga.' }],
          geografia: [{ id: 'wb-rpg-geografia', title: 'Ruínas da Cripta', description: 'Uma estrada alagada leva à entrada soterrada.' }]
        }
      },
      spells: [
        {
          id: 'sp-rpg-1',
          name: 'Névoa Sombria',
          cost: 'Slot Nível 1 / 2 PM',
          range: '18m (raio de 6m)',
          components: 'Gesto e fragmento de obsidiana',
          effect: 'Cria uma nuvem espessa que concede cobertura total.',
          lore: 'Magia comum entre os cultistas do pantanal.'
        }
      ],
      moodboard: [{ id: 'mb-rpg-1', title: 'Pântano sob a névoa', url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=600', notes: 'Paleta de chuva, pedra e vegetação escura.' }],
      diagram: {
        nodes: [
          { id: 'n-r1', label: 'Kaelen (PJ)', type: 'personagem', x: 100, y: 120, desc: 'Ladino' },
          { id: 'n-r2', label: 'Barão Von Klaus (NPC)', type: 'personagem', x: 350, y: 120, desc: 'Contratante' },
          { id: 'n-r3', label: 'Ruínas da Cripta', type: 'cidade', x: 220, y: 280, desc: 'Dungeon' }
        ],
        connections: [
          { from: 'n-r2', to: 'n-r1', label: 'Contratou' },
          { from: 'n-r1', to: 'n-r3', label: 'Explorando' }
        ]
      },
      familyTrees: [{
        id: 'tree-rpg-1', name: 'Casa Von Klaus', description: 'A família que controla Valdória.',
        members: [
          { id: 'family-rpg-1', name: 'Barão Von Klaus', role: 'Patriarca', birth: '1968', death: '', avatar: '', parents: [], notes: 'O pacto é mantido em segredo.' },
          { id: 'family-rpg-2', name: 'Marta Von Klaus', role: 'Irmã', birth: '1972', death: '', avatar: '', parents: ['family-rpg-1'], notes: 'Conhece a passagem até a cripta.' }
        ]
      }],
      timeline: [
        { id: 'event-rpg-1', title: 'A cripta é aberta', date: '2025-10-01', category: 'Campanha', location: 'Pântano dos Sussurros', people: 'Barão Von Klaus', description: 'A névoa começa a avançar sobre os povoados.' },
        { id: 'event-rpg-2', title: 'O grupo aceita o contrato', date: '2025-10-02', category: 'Sessão 1', location: 'Taverna da Ponte', people: 'Kaelen; Barão Von Klaus', description: 'Kaelen parte para encontrar a entrada da cripta.' }
      ]
    };

    completeSampleTemplates(defaultBook, defaultRpg);
    this.exampleTemplates = new Map([[defaultBook.id, defaultBook], [defaultRpg.id, defaultRpg]]);
    for (const template of this.exampleTemplates.values()) {
      const existing = this.projects.find(project => project.id === template.id);
      if (existing) this.mergeExampleTemplate(existing, template);
      else this.projects.push(template);
    }
    this.saveProjectsList();
    if (!this.activeProject) {
      this.activeProject = this.projects[0] || defaultBook;
      localStorage.setItem(STORAGE_KEY_ACTIVE_ID, this.activeProject.id);
    }
  }

  loadProjectsList() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_PROJECTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  mergeExampleTemplate(project, template) {
    if ((project.sampleSeedVersion || 0) >= template.sampleSeedVersion) return project;
    const mergeMissing = (target, source) => {
      for (const [key, value] of Object.entries(source)) {
        if (key === 'sampleSeedVersion') continue;
        if (target[key] === undefined || target[key] === null || (target[key] === '' && value !== '') || (Array.isArray(target[key]) && target[key].length === 0 && Array.isArray(value) && value.length > 0)) {
          target[key] = JSON.parse(JSON.stringify(value));
        } else if (Array.isArray(target[key]) && Array.isArray(value)) {
          if (value.every(item => item && typeof item === 'object' && !Array.isArray(item) && item.id)) {
            const byId = new Map(target[key].map(item => [item?.id, item]));
            for (const item of value) {
              const existing = byId.get(item.id);
              if (existing) mergeMissing(existing, item);
              else target[key].push(JSON.parse(JSON.stringify(item)));
            }
          } else if (value.every(item => typeof item !== 'object')) {
            for (const item of value) if (!target[key].includes(item)) target[key].push(item);
          }
        } else if (value && typeof value === 'object' && !Array.isArray(value) && target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
          mergeMissing(target[key], value);
        }
      }
    };
    // Atualiza somente os trechos de demonstração que ainda estão intactos da versão anterior.
    if (project.id === 'demo-book-1') {
      const oldOpenings = ['O vento frio soprava contra as ameias da fortaleza...', 'Uma caneca de hidromel bateu pesadamente sobre a mesa de carvalho...'];
      project.chapters?.forEach((chapter, index) => {
        if (chapter.id === `ch-${index + 1}` && oldOpenings[index] && chapter.content?.includes(oldOpenings[index])) {
          const completeChapter = template.chapters.find(item => item.id === chapter.id);
          if (completeChapter) Object.assign(chapter, JSON.parse(JSON.stringify(completeChapter)));
        }
      });
      if (project.sampleSeedVersion < 3 && project.planner) {
        project.planner.plannedChapters = (project.planner.plannedChapters || []).filter(item => !(item.id === 'plan-ch-book-1' && item.title === 'A chegada do mensageiro'));
        project.planner.acts = (project.planner.acts || []).filter(item => !(['act-1', 'act-2', 'act-3'].includes(item.id) && /^Ato [IVX]/.test(item.name || '')));
      }
    }
    if (project.id === 'demo-rpg-1' && project.chapters?.[0]?.content?.includes('Os aventureiros acordam em uma antecâmara com cheiro de mofo')) {
      const completeSession = template.chapters.find(item => item.id === 'sess-1');
      if (completeSession) Object.assign(project.chapters[0], JSON.parse(JSON.stringify(completeSession)));
    }
    if (project.id === 'demo-rpg-1' && project.sampleSeedVersion < 3 && project.planner) {
      project.planner.plannedChapters = (project.planner.plannedChapters || []).filter(item => !(item.id === 'plan-rpg-1' && item.title === 'A cripta sob a chuva'));
      project.planner.acts = (project.planner.acts || []).filter(item => item.id !== 'arc-rpg-1');
    }
    if (project.sampleSeedVersion < 4 && ['demo-book-1', 'demo-rpg-1'].includes(project.id)) {
      const seedPrefix = project.id === 'demo-book-1' ? 'book-mood-' : 'rpg-mood-';
      const customMoodboardItems = (project.moodboard || []).filter(item => !item?.id?.startsWith(seedPrefix));
      project.moodboard = [
        ...JSON.parse(JSON.stringify(template.moodboard || [])),
        ...customMoodboardItems
      ];
    }
    mergeMissing(project, template);
    project.sampleSeedVersion = template.sampleSeedVersion;
    return project;
  }

  saveProjectsList() {
    localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(this.projects));
    if (window.appStorageLocation && window.nativeAPI?.saveStorageIndex) {
      const entries = this.projects.map(project => ({
        id: project.id,
        title: project.title,
        type: project.type,
        folderPath: project.folderPath || ''
      }));
      window.nativeAPI.saveStorageIndex(window.appStorageLocation, entries).then(result => {
        if (!result?.success) console.error('Não foi possível atualizar o índice de projetos:', result?.error);
      }).catch(error => console.error('Não foi possível atualizar o índice de projetos:', error));
    }
    this.notify();
  }

  async restoreProjectsFromDisk(projects) {
    if (!Array.isArray(projects) || !projects.length) return;
    projects.forEach(project => {
      const template = this.exampleTemplates?.get(project.id);
      if (template) this.mergeExampleTemplate(project, template);
    });
    this.projects = projects;
    const savedActiveId = localStorage.getItem(STORAGE_KEY_ACTIVE_ID);
    this.activeProject = this.projects.find(project => project.id === savedActiveId) || this.projects[0];
    if (this.activeProject) localStorage.setItem(STORAGE_KEY_ACTIVE_ID, this.activeProject.id);
    if (this.activeProject) this.setSaveStatus('saved', this.activeProject.lastSavedAt);
    this.saveProjectsList();
    for (const project of projects) {
      if (!this.exampleTemplates?.has(project.id) || !project.folderPath || !window.nativeAPI?.saveProject) continue;
      await window.nativeAPI.saveProject({ folderPath: project.folderPath, projectData: project });
    }
  }

  getProjects(filterType = 'all') {
    if (filterType === 'all') return this.projects;
    return this.projects.filter(p => p.type === filterType);
  }

  getActiveProject() {
    if (this.activeProject) {
      if (!this.activeProject.notes) this.activeProject.notes = [];
      if (this.activeProject.chapters) {
        this.activeProject.chapters.forEach(ch => {
          if (!ch.status) ch.status = 'draft';
        });
      }
    }
    return this.activeProject;
  }

  setActiveProject(projectId) {
    const found = this.projects.find(p => p.id === projectId);
    if (found) {
      this.activeProject = found;
      localStorage.setItem(STORAGE_KEY_ACTIVE_ID, found.id);
      this.setSaveStatus('saved', found.lastSavedAt);
      this.notify();
    }
  }

  async renameProject(projectId, newTitle) {
    const project = this.projects.find(item => item.id === projectId);
    const title = String(newTitle || '').trim();
    if (!project || !title) return { success: false, error: 'Informe um nome válido para o projeto.' };
    if (this.projects.some(item => item.id !== projectId && item.title.toLocaleLowerCase() === title.toLocaleLowerCase())) {
      return { success: false, error: 'Já existe outro projeto com esse nome.' };
    }

    const previousTitle = project.title;
    const previousPath = project.folderPath;
    project.title = title;
    project.updatedAt = new Date().toISOString();
    if (window.appStorageLocation && window.nativeAPI?.renameProjectFolder) {
      const result = await window.nativeAPI.renameProjectFolder({
        storagePath: window.appStorageLocation,
        oldFolderPath: previousPath,
        projectData: project
      });
      if (!result?.success) {
        project.title = previousTitle;
        project.folderPath = previousPath;
        return { success: false, error: result?.error || 'Não foi possível renomear a pasta do projeto.' };
      }
      project.folderPath = result.folderPath;
    } else if (window.appStorageLocation) {
      project.folderPath = managedProjectFolder(window.appStorageLocation, title, projectId, this.projects);
    }

    this.saveProjectsList();
    if (window.nativeAPI?.saveProject && project.folderPath) {
      const saved = await window.nativeAPI.saveProject({ folderPath: project.folderPath, projectData: project });
      if (!saved?.success) return { success: false, error: saved?.error || 'O nome mudou, mas não foi possível salvar os dados.' };
    }
    return { success: true };
  }

  async updateProjectDetails(projectId, details = {}) {
    const project = this.projects.find(item => item.id === projectId);
    if (!project) return { success: false, error: 'Projeto não encontrado.' };

    const title = String(details.title ?? project.title).trim();
    const description = String(details.description ?? project.description ?? '').trim();
    if (!title) return { success: false, error: 'Informe um nome válido para o projeto.' };

    if (title !== project.title) {
      const renameResult = await this.renameProject(projectId, title);
      if (!renameResult.success) return renameResult;
    }

    project.description = description;
    project.updatedAt = new Date().toISOString();
    this.saveProjectsList();
    if (window.nativeAPI?.saveProject && project.folderPath) {
      const saved = await window.nativeAPI.saveProject({ folderPath: project.folderPath, projectData: project });
      if (!saved?.success) return { success: false, error: saved?.error || 'Não foi possível salvar as alterações do projeto.' };
    }
    return { success: true };
  }

  deleteProject(projectId) {
    this.projects = this.projects.filter(p => p.id !== projectId);
    if (this.activeProject && this.activeProject.id === projectId) {
      this.activeProject = this.projects.length > 0 ? this.projects[0] : null;
      if (this.activeProject) {
        localStorage.setItem(STORAGE_KEY_ACTIVE_ID, this.activeProject.id);
      } else {
        localStorage.removeItem(STORAGE_KEY_ACTIVE_ID);
      }
    }
    this.saveProjectsList();
  }

  createProject({ title, type, description }) {
    const projectId = 'proj-' + Date.now();
    const newProject = {
      id: projectId,
      title: title.trim(),
      folderPath: window.appStorageLocation ? managedProjectFolder(window.appStorageLocation, title, projectId, this.projects) : '',
      type: type || 'book', // 'book' ou 'rpg'
      description: description ? description.trim() : '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      planner: {
        wordGoal: 50000,
        currentWords: 0,
        genres: [],
        acts: []
      },
      chapters: [
        { id: 'ch-1', title: 'Capítulo 1: Início', content: '<p></p>', wordCount: 0, status: 'draft' }
      ],
      notes: [
        { id: 'note-1', title: 'Primeiras Anotações', content: 'Espaço para rabiscar ideias soltas, regras da casa ou insights rápidos...', updatedAt: new Date().toISOString() }
      ],
      characters: [],
      world: {
        politica: '',
        leis: '',
        bioma: '',
        clima: '',
        economia: '',
        religiao: '',
        geografia: ''
      },
      spells: [],
      moodboard: [],
      familyTree: [],
      timeline: [],
      diagram: {
        nodes: [],
        connections: []
      }
    };

    this.projects.unshift(newProject);
    this.saveProjectsList();
    this.setActiveProject(newProject.id);

    this.updateActiveProject({});

    return newProject;
  }

  updateActiveProject(dataPartial) {
    if (!this.activeProject) return;
    Object.assign(this.activeProject, dataPartial, { updatedAt: new Date().toISOString() });
    this.saveProjectsList();
    return this.saveActiveProject();
  }

  async saveActiveProject() {
    const project = this.activeProject;
    if (!project) return { success: false, error: 'Nenhum projeto está aberto.' };
    const sequence = (this.saveSequence.get(project.id) || 0) + 1;
    this.saveSequence.set(project.id, sequence);
    this.setSaveStatus('saving');

    try {
      const result = await Promise.resolve().then(() => window.nativeAPI?.saveProject && project.folderPath
        ? window.nativeAPI.saveProject({ folderPath: project.folderPath, projectData: project })
        : { success: true, savedAt: new Date().toISOString(), localOnly: true });
      if (this.saveSequence.get(project.id) !== sequence) return { success: true, stale: true };
      if (!result?.success) throw new Error(result?.error || 'Não foi possível salvar o projeto.');
      project.lastSavedAt = result.savedAt || new Date().toISOString();
      localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(this.projects));
      if (this.activeProject?.id === project.id) this.setSaveStatus('saved', project.lastSavedAt, result.localOnly);
      return { success: true, savedAt: project.lastSavedAt };
    } catch (error) {
      if (this.saveSequence.get(project.id) === sequence && this.activeProject?.id === project.id) {
        this.setSaveStatus('error', null, false, error.message);
      }
      console.error('Falha ao salvar o projeto:', error);
      return { success: false, error: error.message };
    }
  }
  setSaveStatus(status, savedAt, localOnly = false, error = '') {
    const element = document.getElementById('editor-save-status');
    if (!element) return;
    element.classList.remove('is-saving', 'is-saved', 'is-pending', 'has-error');
    element.classList.add(status === 'error' ? 'has-error' : `is-${status}`);
    if (status === 'saving') {
      element.textContent = 'Salvando…';
      element.title = 'Gravando as alterações no disco';
    } else if (status === 'pending') {
      element.textContent = 'Alterações pendentes…';
      element.title = 'As alterações serão salvas em instantes';
    } else if (status === 'error') {
      element.textContent = 'Falha ao salvar';
      element.title = error || 'Não foi possível gravar as alterações';
    } else if (savedAt) {
      const formatted = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(savedAt));
      element.textContent = `Salvo (${formatted})`;
      element.title = `${localOnly ? 'Salvo neste dispositivo' : 'Salvo no disco'} em ${formatted}`;
    } else {
      element.textContent = 'Ainda não salvo';
      element.title = 'Este projeto ainda não tem um salvamento confirmado';
    }
  }

  subscribe(callback) {
    this.listeners.push(callback);
  }

  notify() {
    this.listeners.forEach(cb => cb(this));
  }
}

window.appState = new StateManager();

