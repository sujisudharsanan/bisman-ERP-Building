import { create } from 'zustand'

interface AuthState {
	user: { email: string } | null
	login: (email: string, password: string) => Promise<void>
	logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
	user: null,
	// Perform an actual POST to the backend and include credentials so the
	// browser accepts Set-Cookie from the response.
	login: async (email, password) => {
		const res = await fetch('/api/login', {
			method: 'POST',
			credentials: 'include',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password }),
		})
		if (!res.ok) {
			let msg = `Login failed (${res.status})`
			try {
				const data = await res.json()
				msg = data?.message || msg
			} catch (e) { /* ignore */ }
			throw new Error(msg)
		}
		// Prefer server-provided user info; fall back to email
		let user = { email }
		try {
			const data = await res.json()
			if (data && data.email) user = { email: data.email }
		} catch (e) { /* ignore */ }
		set({ user })
	},
	logout: async () => {
		try {
			await fetch('/api/logout', { method: 'POST', credentials: 'include' })
		} catch (e) { /* ignore */ }
		set({ user: null })
	},
}))
