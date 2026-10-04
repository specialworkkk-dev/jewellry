import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import connectToDatabase from "@/lib/mongoose";
import User from "@/models/User";

export const authOptions: any = {
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

        if (!user || !user.passwordHash) {
          throw new Error("User not found");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isPasswordValid) {
          throw new Error("Invalid password");
        }

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
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.shopId = user.shopId;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (token && session.user) {
        session.user.id = token.id;
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
  secret: process.env.NEXTAUTH_SECRET || "fallback_secret_for_dev_only",
};
