import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import connectToDatabase from "@/lib/mongoose";
import User from "@/models/User";
import type { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username or Email", type: "text" },
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const usernameInput = credentials?.username?.toString().trim().toLowerCase();
        const emailInput = credentials?.email?.toString().trim().toLowerCase();

        if ((!usernameInput && !emailInput) || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const lookupValue = usernameInput || emailInput;

        await connectToDatabase();

        const user = await User.findOne({
          $or: [
            { username: lookupValue },
            ...(emailInput ? [{ email: emailInput }] : []),
          ],
        });

        if (!user || !user.passwordHash) return null;

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isPasswordValid) return null;

        return {
          id: user._id.toString(),
          email: user.email || `${user.username}@local`,
          name: user.name,
          role: user.role,
          shopId: user.shopId ? user.shopId.toString() : null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.shopId = user.shopId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id ?? token.sub ?? "";
        session.user.role = token.role;
        session.user.shopId = token.shopId;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login", // We will build this page later
  },
  secret: process.env.NEXTAUTH_SECRET,
};
