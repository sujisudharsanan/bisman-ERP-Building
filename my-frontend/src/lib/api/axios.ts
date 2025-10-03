import axios from 'axios'

// Use localhost for consistent domain with frontend to allow cookie sharing
const base = (process.env.NEXT_PUBLIC_API_BASE_URL as string) || 'http://localhost:3001'

const api = axios.create({ baseURL: base, withCredentials: true })

api.interceptors.response.use(
	(res) => res,
	(err) => Promise.reject(err)
)

export default api
