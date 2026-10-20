const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 600,
    title: 'Scryba - Estúdio de Escrita & RPG',
    backgroundColor: '#0a0b0e',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Carrega a interface principal
  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  // Oculta a barra de menu padrão para um design limpo e moderno (estilo Notion/Obsidian)
  mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ==========================================
// CANAIS IPC NATIVOS (SISTEMA DE ARQUIVOS & VERSÃO)
// ==========================================

// 0. Versão do Aplicativo (0.X)
ipcMain.handle('app:get-version', () => {
  const ver = app.getVersion();
  const parts = ver.split('.');
  return `0.${parts[1] || '3'}`;
});

// 1. Selecionar pasta para o projeto
ipcMain.handle('dialog:select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Selecione a Pasta do Projeto',
    properties: ['openDirectory', 'createDirectory']
  });
  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, path: null };
  }
  return { success: true, path: result.filePaths[0] };
});

// 2. Selecionar imagem local (para Moodboard ou Avatares)
ipcMain.handle('dialog:select-image', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Selecionar Imagem',
    filters: [
      { name: 'Imagens', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'] },
      { name: 'Todos os Arquivos', extensions: ['*'] }
    ],
    properties: ['openFile']
  });
  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, filePath: null };
  }
  return { success: true, filePath: result.filePaths[0] };
});

// 3. Salvar dados do projeto em disco (project.json)
ipcMain.handle('project:save', async (event, { folderPath, projectData }) => {
  try {
    if (!folderPath) throw new Error('Caminho da pasta inválido.');
    
    // Cria a pasta do projeto caso ainda não exista
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const projectFilePath = path.join(folderPath, 'project.json');
    fs.writeFileSync(projectFilePath, JSON.stringify(projectData, null, 2), 'utf-8');

    return { success: true, filePath: projectFilePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 4. Carregar dados do projeto existente
ipcMain.handle('project:load', async (event, folderPath) => {
  try {
    const projectFilePath = path.join(folderPath, 'project.json');
    if (!fs.existsSync(projectFilePath)) {
      return { success: false, error: 'Arquivo project.json não encontrado na pasta.' };
    }

    const fileContent = fs.readFileSync(projectFilePath, 'utf-8');
    const projectData = JSON.parse(fileContent);
    return { success: true, data: projectData };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
