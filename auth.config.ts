import type { NextAuthConfig } from 'next-auth';
import { signIn } from 'next-auth/react';

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user; // Check if user is logged in, convert to bolean
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard'); // Check if user is on dashboard
      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false;
      } else if (isLoggedIn) {
        return Response.redirect(new URL('/dashboard', nextUrl));
      }
      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
