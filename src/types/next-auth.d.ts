import type { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  export type UserRole = "SUPER_ADMIN" | "PLATFORM_ADMIN" | "SHOP_OWNER" | "CUSTOMER";

  interface User extends DefaultUser {
    id: string;
    role?: UserRole;
    shopId?: string | null;
  }

  interface Session {
    user: User & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  export interface JWT {
    id?: string;
    role?: "SUPER_ADMIN" | "PLATFORM_ADMIN" | "SHOP_OWNER" | "CUSTOMER";
    shopId?: string | null;
  }
}
