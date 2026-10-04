declare module "next-auth" {
  export type UserRole = "SUPER_ADMIN" | "PLATFORM_ADMIN" | "SHOP_OWNER" | "CUSTOMER";

  export interface User {
    id?: string | null;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: UserRole;
    shopId?: string | null;
  }

  export interface Session {
    user: User;
  }

  export type NextAuthOptions = {
    providers?: unknown[];
    callbacks?: Record<string, any>;
    session?: Record<string, any>;
    pages?: Record<string, string>;
    secret?: string;
  };

  export function getServerSession(options?: NextAuthOptions): Promise<Session | null>;
  export default function NextAuth(...args: any[]): any;
}

declare module "next-auth/jwt" {
  export interface JWT {
    id?: string;
    role?: "SUPER_ADMIN" | "PLATFORM_ADMIN" | "SHOP_OWNER" | "CUSTOMER";
    shopId?: string | null;
  }
}
