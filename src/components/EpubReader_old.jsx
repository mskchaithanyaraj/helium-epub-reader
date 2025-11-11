import React, { useEffect, useRef, useState } from "react";
import ePub from "epubjs";
import { getAPI } from "../utils/electron";
import { storage } from "../utils/storage";
import TableOfContents from "./TableOfContents";

const EpubReader = ({ filePath, onBookLoaded, onError }) => {
  const viewerRef = useRef(null);
  const bookRef = useRef(null);
  const renditionRef = useRef(null);

  const [isLoading, setIsLoading] = useState(true);
  const [bookTitle, setBookTitle] = useState("");
  const [currentLocation, setCurrentLocation] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [toc, setToc] = useState([]);
  const [showToc, setShowToc] = useState(false);
  const [currentChapter, setCurrentChapter] = useState("");
  const [currentHref, setCurrentHref] = useState("");
  const [bookId, setBookId] = useState(null);
  const [currentSpineIndex, setCurrentSpineIndex] = useState(0);
  const [totalSpineItems, setTotalSpineItems] = useState(0);

  // Generate a unique book ID based on file path and metadata
  const generateBookId = (filePath, metadata) => {
    const fileName = filePath.split(/[/\\]/).pop();
    const title = metadata?.title || fileName;
    const author = metadata?.creator || "unknown";

    // Create a simple hash-like ID that's safe for storage
    const combinedString = `${fileName}_${title}_${author}`;
    let hash = 0;
    for (let i = 0; i < combinedString.length; i++) {
      const char = combinedString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Return absolute value as string with prefix
    return `book_${Math.abs(hash).toString(36)}`;
  };

  useEffect(() => {
    if (!filePath) return;

    loadBook();

    return () => {
      // Cleanup
      if (renditionRef.current) {
        try {
          renditionRef.current.destroy();
        } catch (e) {
          console.log("Rendition cleanup:", e);
        }
      }
      if (bookRef.current) {
        try {
          bookRef.current.destroy();
        } catch (e) {
          console.log("Book cleanup:", e);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePath]);

  // Helper function to update chapter title from spine index
  const updateChapterTitle = (spineIndex, book, navigation) => {
    try {
      const spineItem = book.spine.get(spineIndex);
      if (!spineItem) return;

      const href = spineItem.href;
      console.log("Current spine href:", href);

      // Find matching TOC entry
      if (navigation && navigation.toc) {
        const findChapter = (items) => {
          for (const item of items) {
            const cleanItemHref = item.href.split('#')[0].split('?')[0];
            const cleanSpineHref = href.split('#')[0].split('?')[0];
            
            if (cleanSpineHref.includes(cleanItemHref) || cleanItemHref.includes(cleanSpineHref)) {
              return item.label.trim().replace(/\s+/g, ' ');
            }
            
            if (item.subitems && item.subitems.length > 0) {
              const found = findChapter(item.subitems);
              if (found) return found;
            }
          }
          return null;
        };
        
        const chapterName = findChapter(navigation.toc);
        if (chapterName) {
          console.log("Chapter name:", chapterName);
          setCurrentChapter(chapterName);
        } else {
          setCurrentChapter(`Chapter ${spineIndex + 1}`);
        }
      } else {
        setCurrentChapter(`Chapter ${spineIndex + 1}`);
      }
    } catch (e) {
      console.error("Error updating chapter title:", e);
    }
  };

  const loadBook = async () => {
    try {
      setIsLoading(true);
      console.log("Loading book:", filePath);

      // Read file via Electron IPC
      const api = getAPI();
      const fileResult = await api.readFile(filePath);

      if (!fileResult.success) {
        throw new Error(fileResult.error || "Failed to read file");
      }

      console.log("File loaded successfully");

      // Create a new book instance from ArrayBuffer
      const book = ePub(fileResult.data);
      bookRef.current = book;

      // Load the book
      await book.ready;
      console.log("Book ready");

      // Get book metadata
      const metadata = await book.loaded.metadata;
      setBookTitle(metadata.title || "Untitled Book");
      console.log("Book title:", metadata.title);

      // Generate unique book ID for storage
      const currentBookId = generateBookId(filePath, metadata);
      setBookId(currentBookId);
      console.log("Book ID:", currentBookId);

      // Get navigation (table of contents)
      await book.loaded.navigation;
      const navigation = book.navigation;
      if (navigation && navigation.toc) {
        console.log("TOC:", navigation.toc);
        setToc(navigation.toc);
      }

      // Get spine information (actual chapters)
      await book.loaded.spine;
      const spineLength = book.spine.length;
      setTotalSpineItems(spineLength);
      console.log("Total spine items (chapters):", spineLength);

      // Render the book
      if (viewerRef.current) {
        console.log("Rendering to viewer");

        // Clear previous content
        viewerRef.current.innerHTML = "";

        const rendition = book.renderTo(viewerRef.current, {
          width: "100%",
          height: "100%",
          spread: "none",
          flow: "paginated",
          manager: "default",
          ignoreClass: "annotator-hl",
          allowScriptedContent: true,
          snap: true,
        });

        renditionRef.current = rendition;

        // Override to prevent packaging errors
        rendition.injectIdentifier = () => {};

        // Check for saved location and display from there, or start from beginning
        const savedLocation = storage.getLocation(currentBookId);
        let startIndex = 0;

        if (savedLocation) {
          console.log("Restoring saved location:", savedLocation);
          // Try to find the spine index from saved CFI
          try {
            const section = book.spine.get(savedLocation);
            if (section) {
              startIndex = section.index;
              console.log("Found saved spine index:", startIndex);
            }
          } catch (e) {
            console.log("Could not parse saved location, starting from beginning", e);
          }
        }

        setCurrentSpineIndex(startIndex);
        
        const displayPromise = rendition.display(startIndex);

        displayPromise
          .then(() => {
            console.log("Book displayed at spine index:", startIndex);
            setIsLoading(false);

            // Save this book as the last opened book
            storage.saveLastBook(filePath);
            console.log("Saved as last book:", filePath);

            // Update chapter title
            updateChapterTitle(startIndex, book, navigation);

            // Force a resize after display
            setTimeout(() => {
              if (rendition) {
                rendition.resize();
              }
            }, 100);
          })
          .catch((err) => {
            console.error("Display error:", err);
            setIsLoading(false);
          });

        // Set up location tracking (keep for page info but don't rely on it)
        rendition.on("relocated", (location) => {
          console.log("Relocated event:", location.start.href);
          setCurrentLocation(location);
          setCurrentHref(location.start.href);

          // Save current location
          if (currentBookId && location.start.cfi) {
            storage.saveLocation(currentBookId, location.start.cfi);
          }

          // Update current page info
          if (location.start && book.locations && book.locations.total > 0) {
            const percent = book.locations.percentageFromCfi(
              location.start.cfi
            );
            const currentPageNum = Math.ceil(percent * book.locations.total);
            setCurrentPage(currentPageNum || 1);
          }
        });

        // Handle click events in the book content
        rendition.on("click", () => {
          console.log("Book clicked");
        });

        // Generate page locations (for page numbers)
        book.locations
          .generate(1600)
          .then(() => {
            console.log("Locations generated:", book.locations.total);
            setTotalPages(book.locations.total);

            if (onBookLoaded) {
              onBookLoaded({
                title: metadata.title,
                author: metadata.creator,
                book,
                rendition,
              });
            }
          })
          .catch((err) => {
            console.error("Error generating locations:", err);
          });

        // Apply themes with better readability
        rendition.themes.default({
          body: {
            "font-family":
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            "line-height": "1.8",
            padding: "2rem 4rem",
            color: "#432323",
            background: "#ffffff",
          },
          p: {
            "margin-bottom": "1em",
          },
          "h1, h2, h3, h4, h5, h6": {
            "margin-top": "1.5em",
            "margin-bottom": "0.5em",
            color: "#2F5755",
          },
          a: {
            color: "#5A9690",
          },
        });
      }
    } catch (error) {
      console.error("Error loading book:", error);
      setIsLoading(false);
      if (onError) {
        onError(error);
      }
    }
  };

  const nextPage = () => {
    console.log("=== NEXT CHAPTER ===");
    if (!renditionRef.current || !bookRef.current) {
      console.log("No rendition or book ref!");
      return;
    }

    const nextIndex = currentSpineIndex + 1;
    if (nextIndex >= totalSpineItems) {
      console.log("Already at last chapter");
      return;
    }

    console.log(`Moving from spine ${currentSpineIndex} to ${nextIndex}`);
    setCurrentSpineIndex(nextIndex);
    
    renditionRef.current.display(nextIndex).then(() => {
      console.log("Displayed spine index:", nextIndex);
      updateChapterTitle(nextIndex, bookRef.current, bookRef.current.navigation);
      
      // Save the new location
      if (bookId) {
        const spineItem = bookRef.current.spine.get(nextIndex);
        if (spineItem && spineItem.cfiBase) {
          storage.saveLocation(bookId, spineItem.cfiBase);
        }
      }
    });
  };

  const prevPage = () => {
    console.log("=== PREV CHAPTER ===");
    if (!renditionRef.current || !bookRef.current) {
      console.log("No rendition or book ref!");
      return;
    }

    const prevIndex = currentSpineIndex - 1;
    if (prevIndex < 0) {
      console.log("Already at first chapter");
      return;
    }

    console.log(`Moving from spine ${currentSpineIndex} to ${prevIndex}`);
    setCurrentSpineIndex(prevIndex);
    
    renditionRef.current.display(prevIndex).then(() => {
      console.log("Displayed spine index:", prevIndex);
      updateChapterTitle(prevIndex, bookRef.current, bookRef.current.navigation);
      
      // Save the new location
      if (bookId) {
        const spineItem = bookRef.current.spine.get(prevIndex);
        if (spineItem && spineItem.cfiBase) {
          storage.saveLocation(bookId, spineItem.cfiBase);
        }
      }
    });
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!renditionRef.current) return;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          console.log("=== Left arrow pressed ===");
          prevPage();
          break;
        case "ArrowRight":
          e.preventDefault();
          console.log("=== Right arrow pressed ===");
          nextPage();
          break;
        case "PageUp":
          e.preventDefault();
          renditionRef.current.prev();
          break;
        case "PageDown":
          e.preventDefault();
          renditionRef.current.next();
          break;
        case " ":
          e.preventDefault();
          if (e.shiftKey) {
            renditionRef.current.prev();
          } else {
            renditionRef.current.next();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const navigateToChapter = (href) => {
    if (renditionRef.current) {
      renditionRef.current.display(href);
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Table of Contents */}
      <TableOfContents
        toc={toc}
        onNavigate={navigateToChapter}
        currentHref={currentHref}
        isOpen={showToc}
        onClose={() => setShowToc(false)}
      />

      {/* Header with book title and navigation */}
      <div className="bg-surface-10 border-b border-surface-20 px-6 py-4 flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            {/* TOC Button */}
            <button
              onClick={() => setShowToc(true)}
              className="btn-icon w-10 h-10"
              title="Table of Contents"
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
                  d="M4 6h16M4 12h16M4 18h7"
                />
              </svg>
            </button>

            <div>
              <h2 className="text-lg font-semibold text-primary truncate">
                {bookTitle || "Loading..."}
              </h2>
              {currentChapter && (
                <p className="text-xs text-muted truncate max-w-md">
                  {currentChapter}
                </p>
              )}
              {!isLoading && totalSpineItems > 0 && (
                <p className="text-sm text-muted mt-1">
                  Chapter {currentSpineIndex + 1} of {totalSpineItems}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {/* Navigation Buttons */}
          <button
            onClick={prevPage}
            disabled={isLoading || currentSpineIndex === 0}
            className="btn-icon w-10 h-10 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Previous Chapter (← or Page Up)"
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <button
            onClick={nextPage}
            disabled={isLoading || currentSpineIndex >= totalSpineItems - 1}
            className="btn-icon w-10 h-10 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Next Chapter (→ or Page Down)"
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
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="spinner"></div>
          <p className="text-sm text-muted">Loading book...</p>
        </div>
      )}

      {/* EPUB viewer */}
      <div
        ref={viewerRef}
        className="flex-1 bg-reader epub-container"
        style={{
          position: "relative",
          overflow: "hidden",
          width: "100%",
          height: "100%",
        }}
      />

      {/* Footer with page info */}
      <div className="bg-surface-10 border-t border-surface-20 px-6 py-3 flex items-center justify-between text-sm text-muted">
        <div>
          {currentLocation && bookRef.current?.locations && (
            <span>
              Progress:{" "}
              {Math.round(
                bookRef.current.locations.percentageFromCfi(
                  currentLocation.start.cfi
                ) * 100
              )}
              %
            </span>
          )}
        </div>
        <div className="text-xs text-center">
          <div>Use ← → arrow keys to switch chapters</div>
          <div className="text-muted/70 mt-0.5">
            {currentSpineIndex > 0 && currentSpineIndex < totalSpineItems - 1 && "Press → for next chapter, ← for previous"}
            {currentSpineIndex === 0 && totalSpineItems > 1 && "Press → for next chapter"}
            {currentSpineIndex === totalSpineItems - 1 && "You're at the last chapter"}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EpubReader;
