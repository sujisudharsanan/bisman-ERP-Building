export class AuthService {
  // Minimal dev implementation: accept 'Bearer devtoken' and return a mock user
  async getUserFromToken(authHeader: string | undefined | null) {
    if (!authHeader) return null;
    const token = String(authHeader).replace(/^Bearer\s+/i, '').trim();
    if (token === 'devtoken') {
      return { id: 'dev-user', username: 'dev', email: 'dev@example.local', role: 'admin' };
    }
    // In production, verify token and lookup user
    return null;
  }
}
