const { app, BrowserWindow, ipcMain, dialog, session } = require("electron");
const path = require("path");
const fs = require("fs");

// Keep a global reference of the window object
let mainWindow;

// File path if opened with "Open With"
let fileToOpen = null;

function createWindow() {
  // Set Content Security Policy
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline' blob:; img-src 'self' data: blob:;",
        ],
      },
    });
  });

  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: "#ffffff",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.cjs"),
      // Allow loading local files (EPUB files)
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
    show: false, // Don't show until ready
  });

  // Load the app
  if (process.env.NODE_ENV === "development" || !app.isPackaged) {
    // Development mode - load from Vite dev server
    mainWindow.loadURL("http://localhost:5173");
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    // Production mode - load from built files
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  // Show window when ready
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();

    // If file was opened with "Open With", send it to renderer
    if (fileToOpen) {
      mainWindow.webContents.send("file-opened", fileToOpen);
      fileToOpen = null;
    }
  });

  // Emitted when the window is closed
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    // On macOS it's common to re-create a window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed
app.on("window-all-closed", () => {
  // On macOS, applications stay active until user quits explicitly
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Handle file opening on Windows (double-click .epub file)
app.on("open-file", (event, filePath) => {
  event.preventDefault();

  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send("file-opened", filePath);
  } else {
    fileToOpen = filePath;
  }
});

// Handle command line arguments (for "Open With" on Windows)
if (process.platform === "win32") {
  // Check if app was opened with a file
  const args = process.argv.slice(1);
  if (args.length > 0 && args[0] && !args[0].includes("--")) {
    const potentialFile = args[0];
    if (fs.existsSync(potentialFile) && potentialFile.endsWith(".epub")) {
      fileToOpen = potentialFile;
    }
  }
}

// ===== IPC HANDLERS =====

// Handle file open dialog
ipcMain.handle("dialog:openFile", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    filters: [
      { name: "EPUB Books", extensions: ["epub"] },
      { name: "All Files", extensions: ["*"] },
    ],
    title: "Open EPUB Book",
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return {
      success: true,
      filePath: result.filePaths[0],
    };
  }

  return {
    success: false,
    filePath: null,
  };
});

// Handle get opened file path (for "Open With" scenario)
ipcMain.handle("get-opened-file", () => {
  return fileToOpen;
});

// Handle reading file as ArrayBuffer (for EPUB.js)
ipcMain.handle("read-file", async (event, filePath) => {
  try {
    const buffer = fs.readFileSync(filePath);
    // Convert Node.js Buffer to ArrayBuffer for renderer process
    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    );
    return {
      success: true,
      data: arrayBuffer,
      filePath: filePath,
    };
  } catch (error) {
    console.error("Error reading file:", error);
    return {
      success: false,
      error: error.message,
    };
  }
});

// Log when app is ready
app.on("ready", () => {
  console.log("Helium EPUB Reader is ready!");
  console.log("App Path:", app.getAppPath());
  console.log("User Data:", app.getPath("userData"));
});
