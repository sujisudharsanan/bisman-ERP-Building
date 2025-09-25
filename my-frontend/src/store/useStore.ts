import { create } from 'zustand'

type State = { sidebarOpen: boolean; toggleSidebar: () => void }

export const useStore = create<State>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s: State) => ({ sidebarOpen: !s.sidebarOpen }))
}))
