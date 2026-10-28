import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import adminPath from "@/lib/admin-path.json";

/**
 * Google sign-in for the admin panel. Signing in only proves identity:
 * every admin permission is still checked server-side against mova_admins.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 12, updateAge: 60 * 60 },
  pages: { signIn: adminPath, error: adminPath },
  callbacks: {
    signIn({ account, profile }) {
      return (
        account?.provider === "google" &&
        profile?.email_verified === true &&
        typeof profile.email === "string"
      );
    },
    jwt({ token, account, profile }) {
      if (account && profile) {
        token.uid = `google:${account.providerAccountId}`;
        token.email = profile.email;
        token.name = profile.name ?? profile.email;
      }
      return token;
    },
    session({ session, token }) {
      return { ...session, user: { ...session.user, uid: token.uid as string } };
    },
  },
});

export type Identity = { userId: string; email: string; displayName: string };

export async function getIdentity(): Promise<Identity | null> {
  const session = await auth();
  const user = session?.user as { uid?: string; email?: string | null; name?: string | null } | undefined;
  if (!user?.uid || !user.email) return null;
  return { userId: user.uid, email: user.email, displayName: user.name || user.email };
}

/** Only same-origin paths inside the admin panel are accepted as return targets. */
export function safeAdminReturn(value: string | null): string {
  if (!value || !value.startsWith(adminPath) || value.includes("\\") || value.startsWith("//")) return adminPath;
  try {
    const url = new URL(value, "https://mova.local");
    return url.origin === "https://mova.local" ? url.pathname + url.search : adminPath;
  } catch {
    return adminPath;
  }
}
