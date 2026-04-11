import React, { createContext, useContext, useState, useEffect } from 'react';

interface BookmarksContextType {
  bookmarks: Set<string>;
  addBookmark: (jobId: string) => void;
  removeBookmark: (jobId: string) => void;
  isBookmarked: (jobId: string) => boolean;
  getBookmarkCount: () => number;
}

const BookmarksContext = createContext<BookmarksContextType | undefined>(undefined);

const STORAGE_KEY = 'cvpilot_bookmarks';

export function BookmarksProvider({ children }: { children: React.ReactNode }) {
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [isInitialized, setIsInitialized] = useState(false);

  // Load bookmarks from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setBookmarks(new Set(JSON.parse(stored)));
      } catch (err) {
        console.error('Failed to load bookmarks:', err);
      }
    }
    setIsInitialized(true);
  }, []);

  // Save bookmarks to localStorage whenever they change
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(bookmarks)));
    }
  }, [bookmarks, isInitialized]);

  const addBookmark = (jobId: string) => {
    setBookmarks((prev) => new Set(prev).add(jobId));
  };

  const removeBookmark = (jobId: string) => {
    setBookmarks((prev) => {
      const next = new Set(prev);
      next.delete(jobId);
      return next;
    });
  };

  const isBookmarked = (jobId: string) => bookmarks.has(jobId);

  const getBookmarkCount = () => bookmarks.size;

  return (
    <BookmarksContext.Provider
      value={{ bookmarks, addBookmark, removeBookmark, isBookmarked, getBookmarkCount }}
    >
      {children}
    </BookmarksContext.Provider>
  );
}

export function useBookmarks() {
  const context = useContext(BookmarksContext);
  if (!context) {
    throw new Error('useBookmarks must be used within BookmarksProvider');
  }
  return context;
}
