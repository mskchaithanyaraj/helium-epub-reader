// Utility to check if app is running in Electron environment

export const isElectron = () => {
  return window.electronAPI !== undefined;
};

export const getElectronAPI = () => {
  if (!isElectron()) {
    console.warn("Electron API not available. Running in browser mode.");
    return null;
  }
  return window.electronAPI;
};

// Fallback for browser mode (useful for development)
export const mockElectronAPI = {
  openFile: async () => {
    console.warn("Mock: File dialog not available in browser mode");
    return { success: false, filePath: null };
  },
  getOpenedFilePath: async () => {
    console.warn("Mock: Get opened file not available in browser mode");
    return null;
  },
  onFileOpened: (callback) => {
    console.warn("Mock: File opened listener not available in browser mode");
  },
  removeFileOpenedListener: () => {
    console.warn("Mock: Remove listener not available in browser mode");
  },
  readFile: async (filePath) => {
    console.warn("Mock: Read file not available in browser mode");
    return { success: false, error: "Not in Electron mode" };
  },
};

// Get API with fallback
export const getAPI = () => {
  return isElectron() ? getElectronAPI() : mockElectronAPI;
};
