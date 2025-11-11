// Storage utility for managing book data, highlights, and reading progress

export const storage = {
  // Save last reading location
  saveLocation: (bookId, cfi) => {
    localStorage.setItem(`book_${bookId}_location`, cfi);
  },

  // Get last reading location
  getLocation: (bookId) => {
    return localStorage.getItem(`book_${bookId}_location`);
  },

  // Save highlights for a book
  saveHighlights: (bookId, highlights) => {
    localStorage.setItem(
      `book_${bookId}_highlights`,
      JSON.stringify(highlights)
    );
  },

  // Get highlights for a book
  getHighlights: (bookId) => {
    const data = localStorage.getItem(`book_${bookId}_highlights`);
    return data ? JSON.parse(data) : [];
  },

  // Save theme preference
  saveTheme: (theme) => {
    localStorage.setItem("theme", theme);
  },

  // Get theme preference
  getTheme: () => {
    return localStorage.getItem("theme") || "light";
  },

  // Save last opened book
  saveLastBook: (filePath) => {
    localStorage.setItem("lastBook", filePath);
  },

  // Get last opened book
  getLastBook: () => {
    return localStorage.getItem("lastBook");
  },
};
