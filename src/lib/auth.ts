import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        token: { label: "Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.token) return null;

        const token = credentials.token as string;

        const magicLink = await prisma.magicLink.findUnique({
          where: { token },
        });

        if (!magicLink) return null;
        if (!magicLink.usedAt) return null; // must be verified via /verify first
        if (magicLink.expiresAt < new Date()) return null;

        const user = await prisma.user.findUnique({
          where: { email: magicLink.email },
        });

        if (!user) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = (user as { role?: string }).role ?? "MEMBER";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLogin = nextUrl.pathname === "/login";
      const isMagicLinkVerify = nextUrl.pathname === "/api/auth/magic-link/verify";
      const isMagicLinkSend = nextUrl.pathname === "/api/auth/magic-link";

      if (isOnLogin || isMagicLinkVerify || isMagicLinkSend) {
        if (isOnLogin && isLoggedIn) return Response.redirect(new URL("/dashboard", nextUrl));
        return true;
      }

      if (!isLoggedIn) return false; // redirects to /login
      return true;
    },
  },
});
