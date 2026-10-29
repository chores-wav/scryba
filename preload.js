const { contextBridge, ipcRenderer, webUtils } = require('electron');
const { pathToFileURL } = require('url');

// Ponte de segurança entre o NodeJS e a interface de usuário
contextBridge.exposeInMainWorld('nativeAPI', {
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),
  selectDirectory: () => ipcRenderer.invoke('dialog:select-directory'),
  selectImage: () => ipcRenderer.invoke('dialog:select-image'),
  importProjectAudio: (data) => ipcRenderer.invoke('project:import-audio', data),
  importDroppedProjectAudio: (data) => ipcRenderer.invoke('project:import-dropped-audio', data),
  resolveProjectAudio: (data) => ipcRenderer.invoke('project:resolve-audio', data),
  removeProjectAudio: (data) => ipcRenderer.invoke('project:remove-audio', data),
  getDroppedFileUrl: (file) => pathToFileURL(webUtils.getPathForFile(file)).href,
  getDroppedFilePath: (file) => webUtils.getPathForFile(file),
  saveProject: (data) => ipcRenderer.invoke('project:save', data),
  loadProject: (folderPath) => ipcRenderer.invoke('project:load', folderPath),
  listProjectVersions: (folderPath) => ipcRenderer.invoke('project:list-versions', folderPath),
  restoreProjectVersion: (data) => ipcRenderer.invoke('project:restore-version', data),
  renameProjectFolder: (data) => ipcRenderer.invoke('project:rename-folder', data),
  getStorageLocation: () => ipcRenderer.invoke('storage:get-location'),
  selectStorageLocation: () => ipcRenderer.invoke('storage:select-location'),
  setStorageLocation: (folderPath) => ipcRenderer.invoke('storage:set-location', folderPath),
  loadStorageIndex: (folderPath) => ipcRenderer.invoke('storage:load-index', folderPath),
  saveStorageIndex: (folderPath, projects) => ipcRenderer.invoke('storage:save-index', { folderPath, projects }),
  exportPdf: (data) => ipcRenderer.invoke('document:export-pdf', data),
  exportWord: (data) => ipcRenderer.invoke('document:export-word', data),
});
