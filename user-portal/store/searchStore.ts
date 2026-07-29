import { useEffect } from 'react';
import { create } from 'zustand';

/**
 * Global search state shared between the top-nav search box (AppHeader) and the
 * current page. A page opts in with `usePageSearch()`, which enables the nav
 * search and streams the typed query back to the page to filter its own data.
 * Pages that don't opt in leave the nav search disabled — so the box is active
 * exactly on searchable pages and greyed out everywhere else.
 */
interface SearchStore {
  /** Whether the current page supports search (drives the nav box enabled state). */
  enabled: boolean;
  /** Live query string the current page should filter by. */
  query: string;
  /** Placeholder shown in the nav box while enabled (e.g. "Search items…"). */
  placeholder: string;
  setEnabled: (enabled: boolean, placeholder?: string) => void;
  setQuery: (query: string) => void;
  reset: () => void;
}

export const useSearchStore = create<SearchStore>((set) => ({
  enabled: false,
  query: '',
  placeholder: '',
  setEnabled: (enabled, placeholder = '') => set({ enabled, placeholder }),
  setQuery: (query) => set({ query }),
  reset: () => set({ enabled: false, query: '', placeholder: '' }),
}));

/**
 * Register the current page as searchable and read the live query from the
 * top-nav search box. Enables + labels the nav search while mounted, and clears
 * it on unmount so the next page starts from a disabled, empty state.
 *
 * @param placeholder text shown in the nav box while this page is active
 * @returns the current query string — filter your page's data with it
 */
export function usePageSearch(placeholder = 'Search'): string {
  const query = useSearchStore((s) => s.query);

  // Keep the nav box enabled and its placeholder current while mounted. Using
  // getState() (not the reactive selectors) keeps this effect free of setter
  // identity churn; a changing placeholder updates the label without wiping the
  // query the user has already typed.
  useEffect(() => {
    useSearchStore.getState().setEnabled(true, placeholder);
  }, [placeholder]);

  // Reset on unmount so leaving a searchable page disables + clears the box.
  useEffect(() => {
    return () => {
      useSearchStore.getState().reset();
    };
  }, []);

  return query;
}
