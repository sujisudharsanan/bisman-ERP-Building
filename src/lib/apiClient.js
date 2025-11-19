// apiClient.js
// Factory for axios client — reads base from env and uses a token getter function.
// Do NOT hardcode any secrets here.

import axios from "axios";

export function createApiClient({ baseURL = process.env.REACT_APP_API_BASE || process.env.VITE_API_BASE, getAuthToken } = {}) {
  const client = axios.create({
    baseURL: baseURL || "/", // default to relative path if not set
    headers: {
      "Content-Type": "application/json",
    },
  });

  // attach token on each request if getter provided
  client.interceptors.request.use(async (config) => {
    try {
      const token = typeof getAuthToken === "function" ? await getAuthToken() : null;
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch (e) { /* swallow; allow requests to proceed without token */ }
    return config;
  });

  return client;
}

// Optional helper for default singleton usage (lazy)
let _defaultClient;
export function getDefaultApiClient(opts = {}) {
  if (!_defaultClient) _defaultClient = createApiClient(opts);
  return _defaultClient;
}
