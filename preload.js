const { contextBridge, ipcRenderer } = require('electron');

// Ponte de segurança entre o NodeJS e a interface de usuário
contextBridge.exposeInMainWorld('nativeAPI', {
  selectDirectory: () => ipcRenderer.invoke('dialog:select-directory'),
  selectImage: () => ipcRenderer.invoke('dialog:select-image'),
  saveProject: (data) => ipcRenderer.invoke('project:save', data),
  loadProject: (folderPath) => ipcRenderer.invoke('project:load', folderPath),
});
