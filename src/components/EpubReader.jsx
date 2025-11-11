import React, { useEffect, useRef, useState } from 'react';
import ePub from 'epubjs';

const EpubReader = ({ filePath, onBookLoaded, onError }) => {
  const viewerRef = useRef(null);
  const bookRef = useRef(null);
  const renditionRef = useRef(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [bookTitle, setBookTitle] = useState('');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    if (!filePath) return;

    loadBook();

    return () => {
      // Cleanup
      if (renditionRef.current) {
        renditionRef.current.destroy();
      }
      if (bookRef.current) {
        bookRef.current.destroy();
      }
    };
  }, [filePath]);

  const loadBook = async () => {
    try {
      setIsLoading(true);

      // Create a new book instance
      const book = ePub(filePath);
      bookRef.current = book;

      // Load the book
      await book.ready;

      // Get book metadata
      const metadata = await book.loaded.metadata;
      setBookTitle(metadata.title || 'Untitled Book');

      // Get navigation (table of contents)
      await book.loaded.navigation;

      // Render the book
      if (viewerRef.current) {
        const rendition = book.renderTo(viewerRef.current, {
          width: '100%',
          height: '100%',
          spread: 'none', // Single page view
          flow: 'paginated', // Paginated vs scrolled
        });

        renditionRef.current = rendition;

        // Display the first page
        await rendition.display();

        // Set up location tracking
        rendition.on('relocated', (location) => {
          setCurrentLocation(location);
          
          // Update current page info
          if (location.start) {
            const percent = book.locations.percentageFromCfi(location.start.cfi);
            const currentPageNum = Math.floor(percent * totalPages);
            setCurrentPage(currentPageNum);
          }
        });

        // Generate page locations (for page numbers)
        book.locations.generate(1600).then(() => {
          setTotalPages(book.locations.total);
          setIsLoading(false);
          
          if (onBookLoaded) {
            onBookLoaded({
              title: metadata.title,
              author: metadata.creator,
              book,
              rendition,
            });
          }
        });

        // Apply basic styling
        rendition.themes.default({
          body: {
            'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            'line-height': '1.8',
            'padding': '2rem',
          },
          p: {
            'margin-bottom': '1em',
          },
          'h1, h2, h3, h4, h5, h6': {
            'margin-top': '1.5em',
            'margin-bottom': '0.5em',
          },
        });
      }
    } catch (error) {
      console.error('Error loading book:', error);
      setIsLoading(false);
      if (onError) {
        onError(error);
      }
    }
  };

  const nextPage = () => {
    if (renditionRef.current) {
      renditionRef.current.next();
    }
  };

  const prevPage = () => {
    if (renditionRef.current) {
      renditionRef.current.prev();
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!renditionRef.current) return;

      switch (e.key) {
        case 'ArrowLeft':
          prevPage();
          break;
        case 'ArrowRight':
          nextPage();
          break;
        case 'PageUp':
          prevPage();
          break;
        case 'PageDown':
          nextPage();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header with book title and navigation */}
      <div className="bg-surface-10 border-b border-surface-20 px-6 py-4 flex items-center justify-between">
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-primary truncate">
            {bookTitle || 'Loading...'}
          </h2>
          {!isLoading && totalPages > 0 && (
            <p className="text-sm text-muted mt-1">
              Page {currentPage} of {totalPages}
            </p>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={prevPage}
            disabled={isLoading}
            className="btn-icon w-10 h-10"
            title="Previous Page (← or Page Up)"
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
            disabled={isLoading}
            className="btn-icon w-10 h-10"
            title="Next Page (→ or Page Down)"
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
        <div className="flex items-center justify-center h-64">
          <div className="spinner"></div>
        </div>
      )}

      {/* EPUB viewer */}
      <div
        ref={viewerRef}
        className="flex-1 bg-reader overflow-hidden epub-container"
        style={{ position: 'relative' }}
      />

      {/* Footer with page info */}
      <div className="bg-surface-10 border-t border-surface-20 px-6 py-3 flex items-center justify-between text-sm text-muted">
        <div>
          {currentLocation && (
            <span>
              Progress: {Math.round(bookRef.current?.locations.percentageFromCfi(currentLocation.start.cfi) * 100)}%
            </span>
          )}
        </div>
        <div className="text-xs">
          Use ← → arrow keys or Page Up/Down to navigate
        </div>
      </div>
    </div>
  );
};

export default EpubReader;
