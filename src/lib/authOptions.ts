import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import connectToDatabase from "@/lib/mongoose";
import User from "@/models/User";
import type { NextAuthOptions } from "next-auth";
import { encode as encodeJwt } from "next-auth/jwt";

const SEVEN_DAYS_IN_SECONDS = 7 * 24 * 60 * 60;

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
        if (user.role === "SHOP_OWNER") {
          token.ownerSessionExpiresAt = Math.floor(Date.now() / 1000) + SEVEN_DAYS_IN_SECONDS;
        }
      }
      if (token.role === "SHOP_OWNER") {
        const now = Math.floor(Date.now() / 1000);
        if (typeof token.ownerSessionExpiresAt !== "number") {
          token.ownerSessionExpiresAt = now + SEVEN_DAYS_IN_SECONDS;
        }
        if (token.ownerSessionExpiresAt <= now) {
          throw new Error("Shop owner session expired");
        }
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
    maxAge: SEVEN_DAYS_IN_SECONDS,
    updateAge: 24 * 60 * 60,
  },
  jwt: {
    maxAge: SEVEN_DAYS_IN_SECONDS,
    async encode(params) {
      const absoluteExpiry = params.token?.ownerSessionExpiresAt;
      if (typeof absoluteExpiry !== "number") return encodeJwt(params);
      const remainingSeconds = Math.max(1, absoluteExpiry - Math.floor(Date.now() / 1000));
      return encodeJwt({ ...params, maxAge: remainingSeconds });
    },
  },
  pages: {
    signIn: "/login", // We will build this page later
  },
  secret: process.env.NEXTAUTH_SECRET,
};
