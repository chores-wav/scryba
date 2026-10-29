const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

function createApplicationContext(initialStorage = {}) {
  const values = new Map(Object.entries(initialStorage));
  const localStorage = {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
  const window = {};
  const context = vm.createContext({ window, localStorage, console, Date, Map, Set });
  for (const file of ['src/js/sampleProjects.js', 'src/js/state.js']) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    vm.runInContext(source, context, { filename: file });
  }
  return { context, window, localStorage };
}

test('normaliza nomes de pasta para caminhos seguros', () => {
  const { context } = createApplicationContext();
  const safeName = vm.runInContext('safeProjectFolderName', context);

  assert.equal(safeName('  Crônicas: Sol/Mar  '), 'Crônicas- Sol-Mar');
  assert.equal(safeName('CON'), '_CON');
  assert.equal(safeName('...'), 'Projeto sem nome');
  assert.equal(safeName('  '), 'Projeto sem nome');
  assert.equal(safeName('a'.repeat(150)).length, 100);
});

test('gera pastas distintas e preserva a raiz de armazenamento', () => {
  const { context } = createApplicationContext();
  const folderFor = vm.runInContext('managedProjectFolder', context);
  const projects = [{ id: 'one', folderPath: 'D:/RPG/Campanha' }];

  assert.equal(folderFor('D:/RPG/', 'Campanha', 'two', projects), 'D:/RPG/Campanha (2)');
  assert.equal(folderFor('D:/RPG', 'Outra', 'two', projects), 'D:/RPG/Outra');
  assert.equal(folderFor('D:/RPG', 'Campanha', 'one', projects), 'D:/RPG/Campanha');
});

test('carrega e persiste os projetos demonstrativos sem descartar dados do usuário', () => {
  const savedCustom = { id: 'custom-1', title: 'Meu projeto', type: 'book', chapters: [{ id: 'chapter-custom', title: 'Meu capítulo' }] };
  const { window, localStorage } = createApplicationContext({ grimorio_projects_list: JSON.stringify([savedCustom]) });
  const state = window.appState;

  assert.ok(state.getProjects('book').some(project => project.id === 'demo-book-1'));
  assert.ok(state.getProjects('rpg').some(project => project.id === 'demo-rpg-1'));
  assert.deepEqual(JSON.parse(localStorage.getItem('grimorio_projects_list')).find(project => project.id === 'custom-1').chapters, savedCustom.chapters);
  assert.equal(localStorage.getItem('grimorio_active_project_id'), 'custom-1');
});

test('cria projeto com estrutura inicial e alterna o projeto ativo', () => {
  const { window, localStorage } = createApplicationContext();
  const state = window.appState;
  const project = state.createProject({ title: '  Campanha Nova  ', type: 'rpg', description: '  Mesa de teste  ' });

  assert.equal(project.title, 'Campanha Nova');
  assert.equal(project.description, 'Mesa de teste');
  assert.equal(project.type, 'rpg');
  assert.equal(project.chapters.length, 1);
  assert.deepEqual(Array.from(project.diagram.nodes), []);
  assert.equal(state.getActiveProject().id, project.id);
  assert.equal(localStorage.getItem('grimorio_active_project_id'), project.id);
});

test('todos os scripts e folhas de estilo locais declarados no HTML existem', () => {
  const html = fs.readFileSync(path.join(root, 'src/index.html'), 'utf8');
  const references = [...html.matchAll(/<(?:script|link)\b[^>]*?(?:src|href)="([^"]+)"/g)]
    .map(match => match[1])
    .filter(reference => !/^(?:[a-z]+:|#|\/\/)/i.test(reference));

  assert.ok(references.length > 0, 'o HTML deve declarar recursos locais');
  for (const reference of references) {
    assert.ok(fs.existsSync(path.join(root, 'src', reference)), `recurso ausente: ${reference}`);
  }
});
