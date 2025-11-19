// AuthConfigContext.js
// Provide current user, token getter and endpoint config. Nothing hardcoded.
import React, { createContext, useContext, useState, useMemo } from "react";
import { createApiClient } from "../lib/apiClient";

const AuthConfigContext = createContext(null);

export function AuthConfigProvider({ children, initialUser = null, getAuthToken, apiConfig = {}, apiBase }) {
  // initialUser example: { id: 'u1', name: 'Abhi', role: 'creator' }
  const [currentUser, setCurrentUser] = useState(initialUser);

  // memoize client so it doesn't recreate unnecessarily
  const client = useMemo(() => createApiClient({ baseURL: apiBase, getAuthToken }), [apiBase, getAuthToken]);

  const value = {
    currentUser,
    setCurrentUser,
    getAuthToken,
    client,
    apiConfig, // shape overrides like endpoints: { paymentRequests: '/api/payment-requests' }
  };

  return <AuthConfigContext.Provider value={value}>{children}</AuthConfigContext.Provider>;
}

export function useAuthConfig() {
  const ctx = useContext(AuthConfigContext);
  if (!ctx) throw new Error("useAuthConfig must be used inside AuthConfigProvider");
  return ctx;
}
