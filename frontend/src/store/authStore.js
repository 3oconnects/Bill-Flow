import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  user: null,
  org: null,
  ready: false,

  setAuth: (user, org) => set({ user, org, ready: true }),
  clearAuth: () => set({ user: null, org: null, ready: true }),
  setReady: () => set({ ready: true }),
  setOrg: (org) => set({ org }),
}))
