import axios from 'axios'

const base = (process.env.NEXT_PUBLIC_API_BASE_URL as string) || '/api'

const api = axios.create({ baseURL: base, withCredentials: true })

api.interceptors.response.use(
	(res) => res,
	(err) => Promise.reject(err)
)

export default api
