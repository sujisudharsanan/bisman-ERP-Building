// chat.js - REST wrapper for the standalone chatbot
import { createApiClient } from "../lib/apiClient";

export function createChatClient({ baseURL, getAuthToken } = {}) {
  return createApiClient({ baseURL, getAuthToken });
}

export async function sendMessage(client, { query, userId, token }) {
  const res = await client.post("/query", { query, user_id: userId, token });
  return res.data; // { response, success }
}

export async function health(client) {
  const res = await client.get("/health");
  return res.data;
}
