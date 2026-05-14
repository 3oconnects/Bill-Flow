import { create } from 'zustand'

export const useTopbarStore = create((set) => ({
  actions: null,
  title: 'Dashboard',
  subtitle: 'Overview',
  setActions: (actions) => set({ actions }),
  setContext: (title, subtitle) => set({ title, subtitle }),
  clear: () => set({ actions: null, title: 'Dashboard', subtitle: 'Overview' }),
}))
