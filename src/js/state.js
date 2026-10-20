/**
 * GERENCIADOR DE ESTADO GLOBAL (STATE.JS)
 * Controla os projetos ativos, lista de projetos recentes e dados em memória.
 */

const STORAGE_KEY_PROJECTS = 'grimorio_projects_list';
const STORAGE_KEY_ACTIVE_ID = 'grimorio_active_project_id';

class StateManager {
  constructor() {
    this.projects = this.loadProjectsList();
    this.activeProject = null;
    this.currentView = 'dashboard';
    this.listeners = [];

    // Se houver projeto ativo previamente salvo, carrega
    const savedActiveId = localStorage.getItem(STORAGE_KEY_ACTIVE_ID);
    if (savedActiveId) {
      const found = this.projects.find(p => p.id === savedActiveId);
      if (found) {
        this.activeProject = found;
      }
    }

    // Se a lista estiver vazia pela primeira vez, cria dois projetos de exemplo (um Livro e um RPG)
    if (this.projects.length === 0) {
      this.initDefaultProjects();
    }
  }

  // Inicializa projetos demonstrativos
  initDefaultProjects() {
    const defaultBook = {
      id: 'demo-book-1',
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
          avatar: '⚔️',
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
        geografia: 'O vale de Solária é cercado pelas Montanhas da Serpente.'
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
      }
    };

    const defaultRpg = {
      id: 'demo-rpg-1',
      title: 'A Maldição de Valdória',
      type: 'rpg',
      folderPath: 'C:/RPG/Valdoria',
      description: 'Campanha de fantasia sombria e exploração de masmorras.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
          avatar: '🏹',
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
          avatar: '👑',
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
        geografia: 'Cercada por pântanos intransponíveis e ruínas antigas.'
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
      moodboard: [],
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
      }
    };

    this.projects = [defaultBook, defaultRpg];
    this.saveProjectsList();
    this.activeProject = defaultBook;
    localStorage.setItem(STORAGE_KEY_ACTIVE_ID, defaultBook.id);
  }

  loadProjectsList() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_PROJECTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  saveProjectsList() {
    localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(this.projects));
    this.notify();
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
      this.notify();
    }
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

  createProject({ title, folderPath, type, description }) {
    const newProject = {
      id: 'proj-' + Date.now(),
      title: title.trim(),
      folderPath: folderPath.trim(),
      type: type || 'book', // 'book' ou 'rpg'
      description: description ? description.trim() : '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      planner: {
        wordGoal: 50000,
        currentWords: 0,
        themes: [],
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
      diagram: {
        nodes: [],
        connections: []
      }
    };

    this.projects.unshift(newProject);
    this.saveProjectsList();
    this.setActiveProject(newProject.id);

    // Tenta persistir no disco caso tenha pasta
    if (window.nativeAPI && folderPath) {
      window.nativeAPI.saveProject({
        folderPath,
        projectData: newProject
      });
    }

    return newProject;
  }

  updateActiveProject(dataPartial) {
    if (!this.activeProject) return;
    Object.assign(this.activeProject, dataPartial, { updatedAt: new Date().toISOString() });
    this.saveProjectsList();

    // Auto-salva no disco se o projeto possuir caminho de pasta
    if (window.nativeAPI && this.activeProject.folderPath) {
      window.nativeAPI.saveProject({
        folderPath: this.activeProject.folderPath,
        projectData: this.activeProject
      });
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

