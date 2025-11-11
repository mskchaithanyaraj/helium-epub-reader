import React, { useState, useEffect } from "react";
import { getAPI, isElectron } from "./utils/electron";
import { storage } from "./utils/storage";
import EpubReader from "./components/EpubReader";

const App = () => {
  const [electronStatus, setElectronStatus] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [bookInfo, setBookInfo] = useState(null);
  const [error, setError] = useState(null);
  const [lastBookAvailable, setLastBookAvailable] = useState(false);
  const [lastBookPath, setLastBookPath] = useState(null);

  useEffect(() => {
    setElectronStatus(isElectron());

    // Check for last opened book and offer to continue reading
    const lastBook = storage.getLastBook();
    if (lastBook && !selectedFile) {
      setLastBookPath(lastBook);
      // Verify file still exists
      const api = getAPI();
      if (api && api.readFile) {
        api
          .readFile(lastBook)
          .then((result) => {
            if (result.success) {
              console.log("Found last book:", lastBook);
              setLastBookAvailable(true);
              // Don't auto-load - let user choose to continue reading
            } else {
              console.log("Last book no longer exists:", lastBook);
              // Clean up invalid reference
              storage.saveLastBook("");
              setLastBookAvailable(false);
              setLastBookPath(null);
            }
          })
          .catch(() => {
            console.log("Failed to access last book");
            storage.saveLastBook("");
            setLastBookAvailable(false);
            setLastBookPath(null);
          });
      }
    }

    // Listen for files opened with "Open With"
    const api = getAPI();
    if (api && api.onFileOpened) {
      api.onFileOpened((filePath) => {
        console.log("File opened:", filePath);
        setSelectedFile(filePath);
        setError(null);
      });
    }

    // Keyboard shortcut: Ctrl+O to open file
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === "o") {
        e.preventDefault();
        if (!selectedFile) {
          handleOpenFile();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      if (api && api.removeFileOpenedListener) {
        api.removeFileOpenedListener();
      }
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedFile]);

  const handleOpenFile = async () => {
    const api = getAPI();
    const result = await api.openFile();

    if (result.success) {
      console.log("Selected file:", result.filePath);
      setSelectedFile(result.filePath);
      setError(null);
    }
  };

  const handleBookLoaded = (info) => {
    setBookInfo(info);
    console.log("Book loaded:", info);
  };

  const handleError = (err) => {
    setError(err.message || "Failed to load book");
    console.error("Book loading error:", err);
  };

  const handleCloseBook = () => {
    setSelectedFile(null);
    setBookInfo(null);
    setError(null);
  };

  const handleContinueReading = () => {
    if (lastBookPath) {
      setSelectedFile(lastBookPath);
      setError(null);
    }
  };

  // If a book is selected, show the reader
  if (selectedFile) {
    return (
      <div className="h-screen flex flex-col bg-surface-0">
        {/* Top bar with close button */}
        <div className="bg-surface-10 border-b border-surface-20 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleCloseBook}
              className="btn-icon"
              title="Close Book"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <span className="text-sm font-semibold text-teal">
              Helium EPUB Reader
            </span>
          </div>

          {bookInfo && (
            <div className="text-sm text-secondary">
              {bookInfo.author && <span>by {bookInfo.author}</span>}
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-danger-a20 text-danger-a0 px-6 py-3 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* EPUB Reader */}
        <div className="flex-1 overflow-hidden">
          <EpubReader
            filePath={selectedFile}
            onBookLoaded={handleBookLoaded}
            onError={handleError}
          />
        </div>
      </div>
    );
  }

  // Welcome screen - no book selected
  return (
    <div className="min-h-screen bg-surface-0 text-primary p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-3 text-teal">Helium</h1>
          <p className="text-lg text-secondary">
            A Minimal EPUB Reader for Windows
          </p>
        </div>

        <div className="card mb-6">
          <h2 className="text-xl font-semibold mb-4">Get Started</h2>
          <p className="text-secondary mb-6">
            Open an EPUB file to start reading. Your reading progress,
            highlights, and preferences will be saved automatically.
          </p>

          {lastBookAvailable && lastBookPath && (
            <button
              onClick={handleContinueReading}
              className="btn bg-teal text-white hover:bg-teal/90 flex items-center gap-2 text-lg px-6 py-3 mb-4 w-full justify-center rounded-lg font-semibold transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 14l9-5-9-5-9 5 9 5z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
                />
              </svg>
              Continue Reading
            </button>
          )}

          <button
            onClick={handleOpenFile}
            disabled={!electronStatus}
            className="btn bg-primary-a20 text-white hover:bg-primary-a10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-lg px-6 py-3 w-full justify-center rounded-lg font-semibold transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            Open EPUB File
          </button>

          {!electronStatus && (
            <div className="mt-4 p-3 bg-warning-a20 text-warning-a0 rounded text-sm">
              <strong>Note:</strong> Electron is not connected. Please run the
              app with{" "}
              <code className="bg-warning-a10 px-1 py-0.5 rounded">
                npm start
              </code>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="card text-center">
            <div className="text-3xl mb-2">📖</div>
            <h3 className="font-semibold mb-1">Offline Reading</h3>
            <p className="text-sm text-muted">Read anywhere without internet</p>
          </div>

          <div className="card text-center">
            <div className="text-3xl mb-2">🎨</div>
            <h3 className="font-semibold mb-1">Beautiful Themes</h3>
            <p className="text-sm text-muted">Light & dark modes for comfort</p>
          </div>

          <div className="card text-center">
            <div className="text-3xl mb-2">✨</div>
            <h3 className="font-semibold mb-1">Highlights</h3>
            <p className="text-sm text-muted">
              Mark and save important passages
            </p>
          </div>
        </div>

        <div className="card-elevated">
          <h3 className="font-semibold mb-3">Features</h3>
          <ul className="space-y-2 text-sm text-secondary">
            <li className="flex items-center gap-2">
              <span className="text-success-a10">✓</span>
              Remember last read page automatically
            </li>
            <li className="flex items-center gap-2">
              <span className="text-success-a10">✓</span>
              Keyboard navigation (Arrow keys, Page Up/Down)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-success-a10">✓</span>
              Light blue text highlighting
            </li>
            <li className="flex items-center gap-2">
              <span className="text-success-a10">✓</span>
              Low contrast colors for comfortable reading
            </li>
            <li className="flex items-center gap-2">
              <span className="text-success-a10">✓</span>
              Open .epub files with "Open With" from Windows Explorer
            </li>
          </ul>
        </div>

        <div className="mt-6 p-4 bg-surface-tonal-a0 rounded text-sm text-muted text-center">
          <p>
            Press <kbd className="px-2 py-1 bg-surface-20 rounded">Ctrl+O</kbd>{" "}
            to open a file
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;
