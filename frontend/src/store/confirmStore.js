import { create } from 'zustand'

export const useConfirmStore = create((set) => ({
  isOpen: false,
  message: '',
  onConfirm: null,
  
  openConfirm: (message, onConfirm) => set({ isOpen: true, message, onConfirm }),
  closeConfirm: () => set({ isOpen: false, message: '', onConfirm: null }),
}))

export const confirmAction = (message, onConfirmCallback) => {
  useConfirmStore.getState().openConfirm(message, () => {
    onConfirmCallback()
    useConfirmStore.getState().closeConfirm()
  })
}
