import { create } from 'zustand'

let toastId = 0

export const useToastStore = create((set) => ({
  toasts: [],
  add: (message, type = 'info') => {
    const id = ++toastId
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4000)
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export const toast = {
  success: (msg) => useToastStore.getState().add(msg, 'success'),
  error:   (msg) => useToastStore.getState().add(msg, 'error'),
  warning: (msg) => useToastStore.getState().add(msg, 'warning'),
  info:    (msg) => useToastStore.getState().add(msg, 'info'),
}
