import { create } from 'zustand'

type AuthState = { user: any; setUser: (u: any) => void }

export const useAuth = create<AuthState>((set) => ({ user: null, setUser: (u) => set({ user: u }) }))
