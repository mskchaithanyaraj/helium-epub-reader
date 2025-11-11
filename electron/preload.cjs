const { contextBridge, ipcRenderer } = require("electron");

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
  // Open file dialog
  openFile: () => ipcRenderer.invoke("dialog:openFile"),

  // Get file path if opened with "Open With"
  getOpenedFilePath: () => ipcRenderer.invoke("get-opened-file"),

  // Listen for file opened event
  onFileOpened: (callback) =>
    ipcRenderer.on("file-opened", (event, filePath) => callback(filePath)),

  // Remove listener
  removeFileOpenedListener: () => ipcRenderer.removeAllListeners("file-opened"),
});
