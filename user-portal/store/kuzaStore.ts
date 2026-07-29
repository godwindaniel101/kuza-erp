import { create } from 'zustand';

/**
 * Open/close state for the Kuza AI copilot panel, shared so the trigger can live
 * in the top header (a "tag") while the panel itself renders once in Layout.
 */
interface KuzaStore {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const useKuzaStore = create<KuzaStore>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
