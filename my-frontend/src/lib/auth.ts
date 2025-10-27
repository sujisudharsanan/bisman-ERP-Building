import { getServerSession, type NextAuthOptions } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from './db';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  providers: [
  Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
  async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;
        const user = await prisma.user.findUnique({ where: { email: credentials.email }, include: { roles: { include: { role: true } }, memberships: true } });
        if (!user || !user.password) return null;
        const ok = await bcrypt.compare(credentials.password, user.password);
        if (!ok) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name || user.email,
      roles: user.roles.map((ur: any) => ur.role.key),
      memberships: user.memberships.map((m: any) => ({ organizationId: m.organizationId, roleId: m.roleId })),
          theme: user.theme,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.roles = (user as any).roles || [];
        token.memberships = (user as any).memberships || [];
        token.theme = (user as any).theme || 'light';
      }
      return token;
    },
    async session({ session, token }: any) {
      (session as any).user.id = token.sub;
      (session as any).user.roles = (token as any).roles || [];
      (session as any).user.memberships = (token as any).memberships || [];
      (session as any).user.theme = (token as any).theme || 'light';
      return session;
    },
  },
  pages: { signIn: '/auth/login' },
};

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error('Unauthorized');
  return session;
}
