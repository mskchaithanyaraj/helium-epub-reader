import React, { useState, useEffect } from "react";
import { getAPI, isElectron } from "./utils/electron";

const App = () => {
  const [electronStatus, setElectronStatus] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    setElectronStatus(isElectron());

    // Listen for files opened with "Open With"
    const api = getAPI();
    if (api && api.onFileOpened) {
      api.onFileOpened((filePath) => {
        console.log("File opened:", filePath);
        setSelectedFile(filePath);
      });
    }

    return () => {
      if (api && api.removeFileOpenedListener) {
        api.removeFileOpenedListener();
      }
    };
  }, []);

  const handleOpenFile = async () => {
    const api = getAPI();
    const result = await api.openFile();

    if (result.success) {
      console.log("Selected file:", result.filePath);
      setSelectedFile(result.filePath);
    }
  };

  return (
    <div className="min-h-screen bg-surface-0 text-primary p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-6 text-teal">
          Helium EPUB Reader
        </h1>

        <div className="card mb-6">
          <h2 className="text-xl font-semibold mb-4">Status Check</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${
                  electronStatus ? "bg-success-a10" : "bg-danger-a10"
                }`}
              ></span>
              <span>
                Electron: {electronStatus ? "Connected ✓" : "Not Running"}
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4">File Operations</h2>
          <button
            onClick={handleOpenFile}
            className="btn btn-primary mb-4"
            disabled={!electronStatus}
          >
            Open EPUB File
          </button>

          {selectedFile && (
            <div className="mt-4 p-4 bg-surface-elevated rounded">
              <p className="text-sm text-secondary mb-1">Selected File:</p>
              <p className="font-mono text-sm break-all">{selectedFile}</p>
            </div>
          )}
        </div>

        <div className="mt-6 p-4 bg-surface-tonal-a0 rounded text-sm text-muted">
          <p className="font-semibold mb-2">Next Steps:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Todo #3: Setup Electron Main Process ✓</li>
            <li>Todo #4: Build Basic EPUB Reader Component (Next)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default App;
